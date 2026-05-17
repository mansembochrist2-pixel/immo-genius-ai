// Recherche RÉELLE d'annonces immobilières par zone
// Pipeline : Firecrawl Search (scraping multi-sources) → Lovable AI (extraction structurée) → insert annonces_pige
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const j = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { zone, user_id: bodyUserId } = body || {};
    if (!zone || typeof zone !== "string" || zone.trim().length < 2) {
      return j({ error: "Zone requise (ville, quartier, code postal)" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!LOVABLE_API_KEY) return j({ error: "LOVABLE_API_KEY manquant" }, 500);
    if (!FIRECRAWL_API_KEY) return j({ error: "FIRECRAWL_API_KEY manquant — connectez Firecrawl" }, 500);

    // Resolve user_id from JWT, fallback body (demo)
    let user_id: string | null = bodyUserId || null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const payload = JSON.parse(atob(token.split(".")[1] || ""));
        if (payload?.sub) user_id = payload.sub;
      } catch (_) { /* ignore */ }
    }
    if (!user_id) return j({ error: "user_id requis" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const zoneClean = zone.trim();

    // ============ 1) FIRECRAWL SEARCH — vraies pages d'annonces ============
    const queries = [
      `appartement maison à vendre ${zoneClean} site:leboncoin.fr`,
      `appartement à vendre ${zoneClean} site:seloger.com OR site:bienici.com OR site:pap.fr`,
    ];

    type FcResult = { url: string; title?: string; description?: string; markdown?: string };
    const allResults: FcResult[] = [];

    for (const query of queries) {
      const fcRes = await fetch("https://api.firecrawl.dev/v2/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          limit: 6,
          lang: "fr",
          country: "fr",
          scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
        }),
      });

      if (!fcRes.ok) {
        const txt = await fcRes.text();
        console.error(`Firecrawl error ${fcRes.status}: ${txt}`);
        if (fcRes.status === 402) return j({ error: "Crédits Firecrawl épuisés." }, 402);
        continue;
      }
      const fcData = await fcRes.json();
      const list: any[] = fcData?.data?.web || fcData?.data || fcData?.web || [];
      for (const r of list) {
        if (r?.url) allResults.push({ url: r.url, title: r.title, description: r.description, markdown: r.markdown });
      }
    }

    if (allResults.length === 0) {
      return j({ count: 0, annonces: [], message: "Aucune annonce trouvée pour cette zone. Essayez un terme plus précis (ex: 'Paris 16ème')." });
    }

    // Dedupe by URL
    const seen = new Set<string>();
    const unique = allResults.filter(r => {
      if (seen.has(r.url)) return false;
      seen.add(r.url);
      return true;
    }).slice(0, 12);

    // ============ 2) Extraction structurée via Lovable AI ============
    const corpus = unique.map((r, i) => `--- ANNONCE #${i + 1} ---
URL: ${r.url}
TITRE: ${r.title || ""}
DESCRIPTION: ${r.description || ""}
CONTENU:
${(r.markdown || "").slice(0, 2500)}`).join("\n\n");

    const extractPrompt = `Tu es un extracteur de données immobilières. À partir des annonces ci-dessous (scrapées en temps réel sur Leboncoin/SeLoger/PAP/Bienici), extrais pour CHAQUE annonce les champs suivants en JSON strict.

Renvoie UNIQUEMENT du JSON valide au format :
{"annonces":[{"index":1,"titre":"...","prix":350000,"surface":75,"pieces":3,"ville":"...","code_postal":"75016","type_bien":"appartement","agence":"Particulier ou nom agence","description":"résumé 1-2 phrases","photo":"https://..."}]}

Règles :
- "prix" et "surface" doivent être des nombres (sans €, sans m²). null si introuvable.
- "type_bien" : appartement | maison | terrain | local | autre
- "agence" : "Particulier" si annonce de particulier, sinon le nom (ex: "Century 21").
- Ignore les annonces sans prix ou hors zone "${zoneClean}".
- Garde la photo principale si présente dans le markdown (![](url) ou ![alt](url)).

ANNONCES :
${corpus}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: extractPrompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) return j({ error: "Limite IA atteinte, réessayez." }, 429);
      if (aiRes.status === 402) return j({ error: "Crédits IA épuisés." }, 402);
      throw new Error(`Gateway error ${aiRes.status}: ${txt}`);
    }
    const aiData = await aiRes.json();
    const content: string = aiData.choices?.[0]?.message?.content || "{}";
    let parsed: any = { annonces: [] };
    try {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(m ? m[0] : content);
    } catch {
      parsed = { annonces: [] };
    }
    const extracted: any[] = Array.isArray(parsed.annonces) ? parsed.annonces : [];

    // ============ 3) Score + insert ============
    const inserted: any[] = [];
    for (const a of extracted) {
      const src = unique[(a.index || 1) - 1];
      if (!src) continue;
      const prix = a.prix ? Number(a.prix) : null;
      const surface = a.surface ? Number(a.surface) : null;
      const isParticulier = String(a.agence || "").toLowerCase().includes("particulier");

      let score = 45;
      if (isParticulier) score += 30;
      if (a.description && String(a.description).length < 100) score += 10;
      if (prix && surface && prix / surface < 4500) score += 5;
      score = Math.min(100, Math.max(0, score));

      const failles: string[] = [];
      if (isParticulier) failles.push("Vendeur particulier — ouverture probable à un mandat");
      if (a.description && String(a.description).length < 100) failles.push("Description très courte — défaut de mise en valeur");
      if (!a.photo) failles.push("Pas de photo principale détectée");

      const { data: row, error } = await supabase.from("annonces_pige").insert({
        user_id,
        source: src.url.includes("leboncoin") ? "leboncoin"
              : src.url.includes("seloger") ? "seloger"
              : src.url.includes("bienici") ? "bienici"
              : src.url.includes("pap.fr") ? "pap"
              : "web",
        url: src.url,
        titre: a.titre || src.title || "Annonce sans titre",
        description: a.description || src.description || null,
        prix,
        surface,
        pieces: a.pieces ? Number(a.pieces) : null,
        ville: a.ville || null,
        code_postal: a.code_postal || null,
        type_bien: a.type_bien || null,
        agence: a.agence || null,
        date_publication: new Date().toISOString(),
        photos: a.photo ? [a.photo] : [],
        score_pigeabilite: score,
        analyse_ia: { failles, zone_recherche: zoneClean, generated: false },
        tags: isParticulier ? ["particulier"] : [],
      }).select().single();
      if (!error && row) inserted.push(row);
      else if (error) console.error("Insert error:", error);
    }

    return j({
      count: inserted.length,
      annonces: inserted,
      sources: unique.map(u => ({ url: u.url, title: u.title || "" })),
    });
  } catch (e) {
    console.error("search-pige-zone error:", e);
    return j({ error: String((e as Error).message || e) }, 500);
  }
});
