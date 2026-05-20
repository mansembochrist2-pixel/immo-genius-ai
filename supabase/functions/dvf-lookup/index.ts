import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
          headers: { "User-Agent": "EstateAI/1.0 (contact@estateai.app)", "Accept": "application/json" },
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

const norm = (v: any) => (v === "None" || v === "nan" || v === null || v === undefined ? null : v);

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { adresse, surface, type_bien } = await req.json();
    if (!adresse || typeof adresse !== "string") {
      return new Response(JSON.stringify({ error: "adresse requise", ventes: [] }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Géocodage BAN
    const geoRes = await fetch(`${BAN_URL}?q=${encodeURIComponent(adresse)}&limit=1`);
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
      return new Response(JSON.stringify({
        error: null, ville, code_postal: codePostal, ventes: [],
        message: "Section cadastrale introuvable",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const section = `000${parcelle.section}`;

    // 3. DVF Etalab par commune+section
    const dvfRes = await fetch(`${DVF_URL}/${codeCommune}/${section}`);
    if (!dvfRes.ok) {
      return new Response(JSON.stringify({
        ville, code_postal: codePostal, ventes: [],
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

    // Tension : volume sur 12 derniers mois (toutes mutations)
    const oneYearAgo = new Date();
    oneYearAgo.setMonth(oneYearAgo.getMonth() - 12);
    const totalSales12m = allMutations.filter(m => new Date(m.date_mutation) >= oneYearAgo).length;
    const tension = totalSales12m > 80 ? "Tendu" : totalSales12m > 25 ? "Équilibré" : "Calme";

    return new Response(JSON.stringify({
      source: "DVF data.gouv (Etalab)",
      url_source: "https://app.dvf.etalab.gouv.fr/",
      ville, code_postal: codePostal, code_commune: codeCommune,
      section: parcelle.section,
      ventes: top3,
      nb_ventes_filtrees: filtered.length,
      prix_m2_median: median,
      tension_marche: tension,
      volume_12_mois: totalSales12m,
      date_extraction: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("dvf-lookup error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Erreur inconnue", ventes: [],
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
