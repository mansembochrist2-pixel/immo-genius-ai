import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// API publique data.gouv : géocodage + DVF
const GEOCODE_URL = "https://api-adresse.data.gouv.fr/search/";
// DVF API officielle (Etalab / cquest)
const DVF_API = "https://api.cquest.org/dvf";

interface DvfMutation {
  date_mutation: string;
  valeur_fonciere: number;
  type_local?: string;
  surface_relle_bati?: number;
  nombre_pieces_principales?: number;
  adresse_numero?: string;
  adresse_nom_voie?: string;
  code_postal?: string;
  nom_commune?: string;
  prix_m2?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { adresse, surface, type_bien } = await req.json();
    if (!adresse || typeof adresse !== "string") {
      return new Response(JSON.stringify({ error: "adresse requise" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Géocodage adresse → lat/lon + code commune
    const geoRes = await fetch(`${GEOCODE_URL}?q=${encodeURIComponent(adresse)}&limit=1`);
    if (!geoRes.ok) throw new Error(`Géocodage échoué (${geoRes.status})`);
    const geoJson = await geoRes.json();
    const feature = geoJson.features?.[0];
    if (!feature) {
      return new Response(
        JSON.stringify({
          error: "Adresse introuvable",
          ventes: [],
          prix_m2_median: null,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [lon, lat] = feature.geometry.coordinates;
    const codeCommune = feature.properties.citycode;
    const ville = feature.properties.city;
    const codePostal = feature.properties.postcode;

    // 2. Requête DVF par code commune
    const dvfRes = await fetch(`${DVF_API}?code_commune=${codeCommune}&nature_mutation=Vente`);
    if (!dvfRes.ok) {
      return new Response(
        JSON.stringify({
          error: null,
          source: "DVF data.gouv",
          ville,
          code_postal: codePostal,
          ventes: [],
          prix_m2_median: null,
          message: "Aucune donnée DVF disponible pour cette commune",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const dvfJson = await dvfRes.json();
    const allMutations: DvfMutation[] = dvfJson.resultats || [];

    // 3. Filtre : même type, surface +/- 30%, dernières 18 mois
    const eighteenMonthsAgo = new Date();
    eighteenMonthsAgo.setMonth(eighteenMonthsAgo.getMonth() - 18);

    const targetType =
      type_bien === "maison" ? "Maison" : type_bien === "appartement" ? "Appartement" : null;

    const filtered = allMutations
      .filter(m => {
        if (!m.valeur_fonciere || !m.surface_relle_bati) return false;
        if (m.surface_relle_bati < 9) return false;
        if (new Date(m.date_mutation) < eighteenMonthsAgo) return false;
        if (targetType && m.type_local !== targetType) return false;
        if (surface && Math.abs(m.surface_relle_bati - surface) / surface > 0.4) return false;
        return true;
      })
      .map(m => ({
        ...m,
        prix_m2: Math.round(m.valeur_fonciere / m.surface_relle_bati),
      }))
      .sort((a, b) => new Date(b.date_mutation).getTime() - new Date(a.date_mutation).getTime());

    // Top 3 + statistiques
    const top3 = filtered.slice(0, 3);
    const prixM2List = filtered.map(f => f.prix_m2!).filter(Boolean).sort((a, b) => a - b);
    const median =
      prixM2List.length > 0
        ? prixM2List[Math.floor(prixM2List.length / 2)]
        : null;

    // Indicateur de tension : volume / délai moyen
    const totalSales12m = allMutations.filter(
      m => new Date(m.date_mutation) >= new Date(new Date().setMonth(new Date().getMonth() - 12))
    ).length;
    const tension =
      totalSales12m > 200 ? "Tendu" : totalSales12m > 50 ? "Équilibré" : "Calme";

    return new Response(
      JSON.stringify({
        source: "DVF data.gouv (Etalab)",
        url_source: "https://app.dvf.etalab.gouv.fr/",
        ville,
        code_postal: codePostal,
        code_commune: codeCommune,
        ventes: top3,
        nb_ventes_filtrees: filtered.length,
        prix_m2_median: median,
        tension_marche: tension,
        volume_12_mois: totalSales12m,
        date_extraction: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("dvf-lookup error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue", ventes: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
