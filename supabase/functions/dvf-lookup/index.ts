import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BAN_URLS = [
  "https://data.geopf.fr/geocodage/search",
  "https://api-adresse.data.gouv.fr/search",
];

async function geocode(adresse: string): Promise<Response> {
  let lastErr: unknown = null;
  for (const base of BAN_URLS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`${base}/?q=${encodeURIComponent(adresse)}&limit=1`, {
          headers: { "User-Agent": "ImmoGenius AI/1.0 (contact@estateai.app)", "Accept": "application/json" },
        });
        if (res.ok) return res;
        lastErr = new Error(`${base} -> ${res.status}`);
      } catch (e) {
        lastErr = e;
      }
      await new Promise(r => setTimeout(r, 300));
    }
  }
  throw lastErr ?? new Error("Geocoding failed");
}
const CADASTRE_URL = "https://apicarto.ign.fr/api/cadastre/parcelle";
const DVF_URL = "https://app.dvf.etalab.gouv.fr/api/mutations3";
const ADEME_URL = "https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines";

const norm = (v: any) => (v === "None" || v === "nan" || v === null || v === undefined ? null : v);

// Fetch DPE F/G stats for a commune from ADEME (best-effort, never throws)
async function fetchDpeStats(codeCommune: string, codePostal: string) {
  try {
    const params = new URLSearchParams({
      size: "1000",
      select: "etiquette_dpe,code_postal_ban,adresse_ban",
      qs: `(etiquette_dpe:"F" OR etiquette_dpe:"G") AND code_postal_ban:"${codePostal}"`,
    });
    const res = await fetch(`${ADEME_URL}?${params}`, {
      headers: { Accept: "application/json", "User-Agent": "ImmoGenius AI/1.0" },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const items: any[] = json.results || [];
    if (!items.length) return { nb_f: 0, nb_g: 0, sample: [] as string[] };
    const nb_f = items.filter(i => i.etiquette_dpe === "F").length;
    const nb_g = items.filter(i => i.etiquette_dpe === "G").length;
    const sample = items.slice(0, 5).map(i => i.adresse_ban).filter(Boolean);
    return { nb_f, nb_g, sample, total_echantillon: items.length };
  } catch (e) {
    console.warn("ADEME DPE fetch failed:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const _authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const _token = authHeader.replace("Bearer ", "");
    const { data: _authData, error: _authError } = await _authClient.auth.getClaims(_token);
    if (_authError || !_authData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // --- end auth ---
    const { adresse, surface, type_bien } = await req.json();
    if (!adresse || typeof adresse !== "string") {
      return new Response(JSON.stringify({ error: "adresse requise", ventes: [] }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Géocodage BAN (avec fallback géoplateforme IGN)
    const geoRes = await geocode(adresse);
    const geoJson = await geoRes.json();
    const feature = geoJson.features?.[0];
    if (!feature) {
      return new Response(JSON.stringify({ error: "Adresse introuvable", ventes: [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const [lon, lat] = feature.geometry.coordinates;
    const ville = feature.properties.city;
    const codePostal = feature.properties.postcode;
    const codeCommune = feature.properties.citycode;

    // 2. Cadastre IGN → section
    const geomParam = encodeURIComponent(JSON.stringify({ type: "Point", coordinates: [lon, lat] }));
    const cadRes = await fetch(`${CADASTRE_URL}?geom=${geomParam}&_limit=1`);
    if (!cadRes.ok) throw new Error(`Cadastre IGN ${cadRes.status}`);
    const cadJson = await cadRes.json();
    const parcelle = cadJson.features?.[0]?.properties;
    if (!parcelle?.section) {
      // Return geocoding + DPE even if no cadastre section
      const dpe = await fetchDpeStats(codeCommune, codePostal);
      return new Response(JSON.stringify({
        error: null, ville, code_postal: codePostal, code_commune: codeCommune,
        center: { lat, lon }, ventes: [],
        dpe_degrades: dpe,
        message: "Section cadastrale introuvable",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const section = `000${parcelle.section}`;

    // 3. DVF Etalab par commune+section (+ DPE ADEME en parallèle)
    const [dvfRes, dpeStats] = await Promise.all([
      fetch(`${DVF_URL}/${codeCommune}/${section}`),
      fetchDpeStats(codeCommune, codePostal),
    ]);

    if (!dvfRes.ok) {
      return new Response(JSON.stringify({
        ville, code_postal: codePostal, code_commune: codeCommune,
        center: { lat, lon }, ventes: [],
        dpe_degrades: dpeStats,
        message: `Pas de données DVF (${dvfRes.status})`,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const dvfJson = await dvfRes.json();
    const allMutations: any[] = dvfJson.mutations || [];

    // Filtres
    const eighteenMonthsAgo = new Date();
    eighteenMonthsAgo.setMonth(eighteenMonthsAgo.getMonth() - 18);
    const targetType = type_bien === "maison" ? "Maison" : "Appartement";

    const filtered = allMutations
      .map(m => ({
        date_mutation: m.date_mutation,
        valeur_fonciere: parseFloat(norm(m.valeur_fonciere) || "0"),
        type_local: norm(m.type_local),
        surface_reelle_bati: parseFloat(norm(m.surface_reelle_bati) || "0"),
        nombre_pieces_principales: norm(m.nombre_pieces_principales),
        adresse_numero: norm(m.adresse_numero),
        adresse_nom_voie: norm(m.adresse_nom_voie),
        code_postal: norm(m.code_postal),
        nom_commune: norm(m.nom_commune),
        lat: norm(m.lat) != null ? parseFloat(m.lat) : null,
        lon: norm(m.lon) != null ? parseFloat(m.lon) : null,
      }))
      .filter(m => {
        if (!m.valeur_fonciere || !m.surface_reelle_bati || m.surface_reelle_bati < 9) return false;
        if (new Date(m.date_mutation) < eighteenMonthsAgo) return false;
        if (m.type_local !== targetType) return false;
        if (surface && Math.abs(m.surface_reelle_bati - surface) / surface > 0.5) return false;
        return true;
      })
      .map(m => ({ ...m, prix_m2: Math.round(m.valeur_fonciere / m.surface_reelle_bati) }))
      .sort((a, b) => new Date(b.date_mutation).getTime() - new Date(a.date_mutation).getTime());

    const top3 = filtered.slice(0, 3);
    const prixM2List = filtered.map(f => f.prix_m2).sort((a, b) => a - b);
    const median = prixM2List.length ? prixM2List[Math.floor(prixM2List.length / 2)] : null;

    // Heatmap points: prefer real coords, fallback to centroid + jitter for visual
    const heatmapPoints = filtered.slice(0, 50).map((m, i) => {
      if (m.lat != null && m.lon != null) {
        return { lat: m.lat, lon: m.lon, prix_m2: m.prix_m2, label: `${m.adresse_nom_voie || "Vente"} (${m.surface_reelle_bati}m²)` };
      }
      // Fallback : petit jitter visuel autour de la parcelle (~50m)
      const jitterLat = (Math.sin(i * 1.7) * 0.0006);
      const jitterLon = (Math.cos(i * 1.7) * 0.0008);
      return { lat: lat + jitterLat, lon: lon + jitterLon, prix_m2: m.prix_m2, label: `${m.adresse_nom_voie || "Vente"} (${m.surface_reelle_bati}m²)`, jittered: true };
    });

    // Tension : volume sur 12 derniers mois (toutes mutations)
    const oneYearAgo = new Date();
    oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);
    const totalSales12m = allMutations.filter(m => new Date(m.date_mutation) >= oneYearAgo).length;
    const tension = totalSales12m > 80 ? "Tendu" : totalSales12m > 25 ? "Équilibré" : "Calme";

    return new Response(JSON.stringify({
      source: "DVF data.gouv (Etalab)",
      url_source: "https://app.dvf.etalab.gouv.fr/",
      ville, code_postal: codePostal, code_commune: codeCommune,
      center: { lat, lon },
      section: parcelle.section,
      ventes: top3,
      ventes_all: filtered.slice(0, 20),
      heatmap_points: heatmapPoints,
      nb_ventes_filtrees: filtered.length,
      prix_m2_median: median,
      tension_marche: tension,
      volume_12_mois: totalSales12m,
      dpe_degrades: dpeStats,
      date_extraction: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("dvf-lookup error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Erreur inconnue", ventes: [],
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
