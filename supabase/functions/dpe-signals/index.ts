// DPE-signals — Veille de territoire sur les biens DPE F/G (ADEME)
// Compare avec le dernier snapshot stocké pour le user+zone et retourne :
//   - tous les biens F/G de la zone (avec date diagnostic + estimation valeur via DVF)
//   - lesquels sont NOUVEAUX depuis la dernière visite (par numéro de DPE)
// Stocke ensuite le snapshot à jour dans analyses_zone.resultat.dpe_snapshot.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADEME_URL = "https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines";
const BAN_URL = "https://api-adresse.data.gouv.fr/search";

interface DpeItem {
  id: string;
  adresse: string;
  code_postal: string;
  commune?: string;
  surface?: number;
  classe: "F" | "G";
  date_diagnostic?: string;
  type_batiment?: string;
  valeur_estimee?: number | null;
  is_new?: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const { adresse, prix_m2_median } = await req.json();
    if (!adresse || typeof adresse !== "string") {
      return new Response(JSON.stringify({ error: "adresse requise" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Géocoder pour obtenir code_postal + commune
    const geoRes = await fetch(`${BAN_URL}/?q=${encodeURIComponent(adresse)}&limit=1`);
    const geoJson = await geoRes.json();
    const feature = geoJson.features?.[0];
    if (!feature) {
      return new Response(JSON.stringify({ error: "Adresse introuvable", items: [], new_items: [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const codePostal = feature.properties.postcode;
    const commune = feature.properties.city;

    // 2. Charger snapshot précédent stocké dans analyses_zone (clé = user_id + adresse)
    const { data: previousZone } = await supabase
      .from("analyses_zone")
      .select("id, created_at, resultat")
      .eq("user_id", userId)
      .ilike("adresse", adresse)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const previousSnapshot: string[] = previousZone?.resultat?.dpe_snapshot_ids ?? [];
    const previousSnapshotDate: string | null = previousZone?.resultat?.dpe_snapshot_date ?? null;

    // 3. Interroger ADEME pour les DPE F/G du code postal
    const params = new URLSearchParams({
      size: "200",
      select: "_id,etiquette_dpe,adresse_ban,code_postal_ban,nom_commune_ban,surface_habitable_logement,date_etablissement_dpe,type_batiment",
      qs: `(etiquette_dpe:"F" OR etiquette_dpe:"G") AND code_postal_ban:"${codePostal}"`,
      sort: "-date_etablissement_dpe",
    });

    const ademeRes = await fetch(`${ADEME_URL}?${params}`, {
      headers: { Accept: "application/json", "User-Agent": "ImmoGenius AI/1.0" },
    });

    if (!ademeRes.ok) {
      return new Response(JSON.stringify({
        error: `ADEME DPE ${ademeRes.status}`,
        items: [], new_items: [], code_postal: codePostal, commune,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ademeJson = await ademeRes.json();
    const rawItems: any[] = ademeJson.results || [];

    const items: DpeItem[] = rawItems.map((r) => {
      const surface = typeof r.surface_habitable_logement === "number" ? r.surface_habitable_logement : null;
      const valeur_estimee = surface && prix_m2_median
        ? Math.round(surface * Number(prix_m2_median))
        : null;
      return {
        id: String(r._id ?? `${r.adresse_ban}-${r.date_etablissement_dpe}`),
        adresse: r.adresse_ban ?? "Adresse non communiquée",
        code_postal: r.code_postal_ban ?? codePostal,
        commune: r.nom_commune_ban ?? commune,
        surface: surface ?? undefined,
        classe: r.etiquette_dpe as "F" | "G",
        date_diagnostic: r.date_etablissement_dpe,
        type_batiment: r.type_batiment,
        valeur_estimee,
      };
    });

    // 4. Détection nouveautés
    const previousSet = new Set(previousSnapshot);
    const new_items = items.filter((i) => !previousSet.has(i.id));
    for (const it of items) it.is_new = !previousSet.has(it.id);

    // 5. Stocker le nouveau snapshot dans analyses_zone (UPSERT-like : on insère une ligne)
    const newSnapshotIds = items.map((i) => i.id).slice(0, 500);
    const now = new Date().toISOString();
    const snapshotPayload = {
      dpe_snapshot_ids: newSnapshotIds,
      dpe_snapshot_date: now,
      dpe_count_fg: items.length,
      adresse, code_postal: codePostal, commune,
    };

    if (previousZone?.id) {
      const mergedResult = { ...(previousZone.resultat ?? {}), ...snapshotPayload };
      await supabase.from("analyses_zone").update({ resultat: mergedResult }).eq("id", previousZone.id);
    } else {
      await supabase.from("analyses_zone").insert({
        user_id: userId,
        adresse,
        secteur: "dpe-watch",
        titre: `Veille DPE — ${commune || adresse}`,
        resultat: snapshotPayload as any,
        sources_utilisees: ["ADEME DPE v2", "BAN"],
      });
    }

    return new Response(JSON.stringify({
      source: "ADEME — base DPE v2 logements existants",
      url_source: "https://data.ademe.fr/datasets/dpe-v2-logements-existants",
      derniere_maj_source: "mensuelle (ADEME)",
      code_postal: codePostal,
      commune,
      items,
      new_items,
      previous_snapshot_date: previousSnapshotDate,
      date_extraction: now,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("dpe-signals error:", e);
    return new Response(JSON.stringify({
      error: e instanceof Error ? e.message : "Erreur inconnue",
      items: [], new_items: [],
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
