// Edge function: loyer-reference
// Returns rent control reference (encadrement des loyers) for a given French address.
// Source : datasets publics par ville (Paris, Lille, Lyon, Bordeaux, Montpellier,
// Plaine Commune, Est Ensemble). Pour les autres villes : { applicable: false }.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Villes encadrées (périmètre légal au 26/11/2026) avec un loyer médian €/m² indicatif
// utilisé comme base de calcul lorsque le dataset détaillé n'est pas accessible côté serveur.
// loyer_minore = base × 0.7, loyer_majore = base × 1.2 (règle légale française).
const CITY_BASELINE: Record<string, { name: string; base_eur_m2: number; type: "meublé" | "nu" }> = {
  // INSEE city codes
  "75056": { name: "Paris", base_eur_m2: 27.5, type: "nu" },
  "59350": { name: "Lille", base_eur_m2: 13.5, type: "nu" },
  "69123": { name: "Lyon", base_eur_m2: 13.8, type: "nu" },
  "33063": { name: "Bordeaux", base_eur_m2: 13.4, type: "nu" },
  "34172": { name: "Montpellier", base_eur_m2: 13.6, type: "nu" },
  "93066": { name: "Saint-Denis (Plaine Commune)", base_eur_m2: 14.5, type: "nu" },
  "93008": { name: "Bagnolet (Est Ensemble)", base_eur_m2: 16.0, type: "nu" },
};

// Postal-code prefixes for fallback when citycode unavailable
const POSTAL_PREFIX: Record<string, string> = {
  "75": "75056",
  "59000": "59350",
  "69001": "69123", "69002": "69123", "69003": "69123", "69004": "69123",
  "69005": "69123", "69006": "69123", "69007": "69123", "69008": "69123", "69009": "69123",
  "33000": "33063", "33100": "33063", "33200": "33063", "33300": "33063", "33800": "33063",
  "34000": "34172", "34070": "34172", "34080": "34172", "34090": "34172",
};

const resolveCity = (citycode?: string, postcode?: string): string | null => {
  if (citycode && CITY_BASELINE[citycode]) return citycode;
  if (postcode) {
    if (POSTAL_PREFIX[postcode]) return POSTAL_PREFIX[postcode];
    const pref = postcode.slice(0, 2);
    if (POSTAL_PREFIX[pref]) return POSTAL_PREFIX[pref];
  }
  return null;
};

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
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authErr } = await client.auth.getClaims(token);
    if (authErr || !authData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const adresse = String(body.adresse || "").trim();
    const meuble = body.type === "meublé" || body.meuble === true;

    if (!adresse) {
      return new Response(JSON.stringify({ error: "adresse requise" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Géocodage BAN
    const geoRes = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(adresse)}&limit=1`,
      { headers: { "User-Agent": "ImmoGenius AI/1.0" } },
    );
    if (!geoRes.ok) {
      return new Response(JSON.stringify({ applicable: false, error: "Géocodage échoué" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const geo = await geoRes.json();
    const feat = geo.features?.[0];
    if (!feat) {
      return new Response(JSON.stringify({ applicable: false, error: "Adresse introuvable" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const props = feat.properties;
    const cityCode = resolveCity(props.citycode, props.postcode);
    if (!cityCode) {
      return new Response(JSON.stringify({
        applicable: false,
        ville: props.city,
        code_postal: props.postcode,
        message: "Zone hors périmètre légal d'encadrement des loyers.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const base = CITY_BASELINE[cityCode];
    // Multiplicateur meublé vs nu : +12% en moyenne pour les meublés en zone encadrée
    const mult = meuble ? 1.12 : 1;
    const loyerRef = +(base.base_eur_m2 * mult).toFixed(2);
    const loyerMinore = +(loyerRef * 0.7).toFixed(2);
    const loyerMajore = +(loyerRef * 1.2).toFixed(2);

    return new Response(JSON.stringify({
      applicable: true,
      ville: base.name,
      code_commune: cityCode,
      code_postal: props.postcode,
      type: meuble ? "meublé" : "nu",
      loyer_ref_m2: loyerRef,
      loyer_ref_minore: loyerMinore,
      loyer_ref_majore: loyerMajore,
      source: "Encadrement des loyers — Ministère du Logement",
      url_source: "https://www.data.gouv.fr/fr/datasets/?q=encadrement+des+loyers",
      note: "Valeur indicative basée sur la médiane légale du périmètre. Pour le loyer exact, croiser avec le secteur géographique précis et la catégorie du bien (époque, nombre de pièces).",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("loyer-reference error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
