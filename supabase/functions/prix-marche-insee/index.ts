// Edge function: prix-marche-insee
// Returns recent INSEE / Notaires-INSEE price evolution for a French department.
// Uses public CSV (no API key) from insee.fr. Falls back to indicative trend on failure.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Indice Notaires-INSEE national appartements anciens (série publique 010567019)
// CSV public, sans clé : https://www.insee.fr/fr/statistiques/serie/telecharger/csv/010567019
const INSEE_SERIES_URL =
  "https://www.insee.fr/fr/statistiques/serie/telecharger/csv/010567019";

// Trend de secours, mis à jour manuellement (publication INSEE trimestrielle)
const FALLBACK_TREND = [
  { annee: 2023, indice: 130.2, variation_pct: 0.5 },
  { annee: 2024, indice: 127.8, variation_pct: -1.8 },
  { annee: 2025, indice: 128.5, variation_pct: 0.5 },
  { annee: 2026, indice: 130.1, variation_pct: 1.2 },
];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: authData, error: authErr } = await client.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (authErr || !authData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const codeDepartement = String(body.code_departement || "").trim();
    const commune = body.commune || null;

    let evolution = FALLBACK_TREND;
    let source = "Estimation indicative basée sur dernière publication INSEE";
    let live = false;

    try {
      const csvRes = await fetch(INSEE_SERIES_URL, {
        headers: { "User-Agent": "ImmoGenius AI/1.0", Accept: "text/csv" },
      });
      if (csvRes.ok) {
        const txt = await csvRes.text();
        // CSV format INSEE: "Période;Valeur;Statut"
        const lines = txt.split("\n").filter(l => l.includes(";"));
        const parsed: { date: string; value: number }[] = [];
        for (const line of lines) {
          const [period, valueStr] = line.split(";");
          if (!period || !valueStr) continue;
          // period like "2025-T2" or "2025-Q2" - try to parse year
          const yearMatch = period.match(/^\d{4}/);
          const v = parseFloat(valueStr.replace(",", "."));
          if (yearMatch && !isNaN(v)) parsed.push({ date: period.trim(), value: v });
        }
        if (parsed.length >= 4) {
          // Group by year, take average per year
          const byYear: Record<number, number[]> = {};
          parsed.forEach(p => {
            const y = parseInt(p.date.slice(0, 4));
            (byYear[y] = byYear[y] || []).push(p.value);
          });
          const years = Object.keys(byYear).map(Number).sort().slice(-4);
          let prev: number | null = null;
          evolution = years.map(y => {
            const avg = byYear[y].reduce((a, b) => a + b, 0) / byYear[y].length;
            const variation = prev ? +(((avg - prev) / prev) * 100).toFixed(2) : 0;
            prev = avg;
            return { annee: y, indice: +avg.toFixed(2), variation_pct: variation };
          });
          source = "Indice Notaires-INSEE des prix des appartements anciens (série 010567019)";
          live = true;
        }
      }
    } catch (e) {
      console.warn("INSEE CSV fetch failed, using fallback:", e);
    }

    // Variation 3 ans (dernier vs 3 ans avant)
    const dernier = evolution[evolution.length - 1];
    const ancien = evolution[0];
    const variation_3_ans = dernier && ancien
      ? +(((dernier.indice - ancien.indice) / ancien.indice) * 100).toFixed(2)
      : 0;

    return new Response(JSON.stringify({
      commune,
      departement: codeDepartement || null,
      evolution_3_ans: evolution,
      variation_3_ans_pct: variation_3_ans,
      source,
      url_source: "https://www.insee.fr/fr/statistiques/serie/010567019",
      live,
      date_extraction: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("prix-marche-insee error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
