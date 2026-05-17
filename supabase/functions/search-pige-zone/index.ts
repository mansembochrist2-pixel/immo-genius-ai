// Edge function: recherche automatique d'annonces immobilières par zone
// Utilise Lovable AI Gateway + Google Search grounding pour détecter de vraies annonces
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { zone, user_id: bodyUserId } = body || {};
    if (!zone || typeof zone !== "string" || zone.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Zone requise (ville, quartier, code postal)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    // Try to resolve user_id from JWT, fall back to body (demo mode)
    let user_id: string | null = bodyUserId || null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const payload = JSON.parse(atob(token.split(".")[1] || ""));
        if (payload?.sub) user_id = payload.sub;
      } catch (_) { /* ignore */ }
    }
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service-role client for RLS-bypassing inserts (RLS still enforced by user_id field)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Recherche grounded via Gemini + Google Search
    const searchPrompt = `Tu es un moteur de pige immobilière français. Recherche sur Leboncoin, SeLoger, Bien'ici, Logic-immo, ParuVendu les ANNONCES IMMOBILIÈRES À VENDRE actuellement publiées dans la zone : "${zone}".

Identifie en priorité les annonces de PARTICULIERS (sans agence) ou annonces qui montrent des signaux de pige intéressants (en ligne depuis longtemps, baisse de prix, description faible, prix incohérent vs marché).

Pour chaque annonce trouvée, extrais :
- titre court
- url de l'annonce
- prix en euros (nombre)
- surface en m² (nombre)
- nombre de pièces (nombre)
- ville exacte
- code postal
- type de bien (appartement / maison / terrain / autre)
- agence ou "Particulier"
- description (1-2 phrases)
- date approximative de mise en ligne (ISO) si visible
- une photo URL si disponible

Retourne UNIQUEMENT un JSON valide (pas de markdown, pas de texte autour) au format :
{"annonces":[{"titre":"...","url":"...","prix":350000,"surface":75,"pieces":3,"ville":"...","code_postal":"...","type_bien":"appartement","agence":"Particulier","description":"...","date_publication":"2025-..","photo":"https://..."}]}

Renvoie 8 à 15 annonces maximum. Si tu ne trouves rien de réel, renvoie {"annonces":[]}.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: searchPrompt }],
        tools: [{ type: "google_search" }],
      }),
    });

    if (!r.ok) {
      const txt = await r.text();
      if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit, réessayez dans un instant." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`Gateway error ${r.status}: ${txt}`);
    }

    const data = await r.json();
    const message = data.choices?.[0]?.message;
    const content: string = message?.content || "";
    const grounding = message?.grounding_metadata || data.choices?.[0]?.grounding_metadata || null;

    // Parse JSON robustly
    let parsed: any = { annonces: [] };
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch (_) {
      parsed = { annonces: [] };
    }
    const found: any[] = Array.isArray(parsed.annonces) ? parsed.annonces : [];

    // 2) Pour chaque annonce, calculer un score de pigeabilité + insérer
    const inserted: any[] = [];
    for (const a of found.slice(0, 15)) {
      const prix = a.prix ? Number(a.prix) : null;
      const surface = a.surface ? Number(a.surface) : null;
      const isParticulier = (a.agence || "").toLowerCase().includes("particulier");

      // Score heuristique
      let score = 40;
      if (isParticulier) score += 30;
      if (a.description && a.description.length < 80) score += 10;
      if (prix && surface && prix / surface < 4000) score += 5;
      if (a.date_publication) {
        const days = (Date.now() - new Date(a.date_publication).getTime()) / 86400000;
        if (days > 60) score += 15;
        else if (days > 30) score += 8;
      }
      score = Math.min(100, Math.max(0, score));

      const failles: string[] = [];
      if (a.description && a.description.length < 80) failles.push("Description très faible — manque de mise en valeur");
      if (!a.photo) failles.push("Pas de photo principale visible");
      if (a.date_publication) {
        const days = (Date.now() - new Date(a.date_publication).getTime()) / 86400000;
        if (days > 60) failles.push(`Annonce en ligne depuis ${Math.round(days)} jours — vendeur probablement frustré`);
      }
      if (isParticulier) failles.push("Vendeur particulier — ouverture probable à un mandat");

      const { data: row, error } = await supabase.from("annonces_pige").insert({
        user_id,
        source: "auto-search",
        url: a.url || null,
        titre: a.titre || "Annonce sans titre",
        description: a.description || null,
        prix,
        surface,
        pieces: a.pieces ? Number(a.pieces) : null,
        ville: a.ville || null,
        code_postal: a.code_postal || null,
        type_bien: a.type_bien || null,
        agence: a.agence || null,
        date_publication: a.date_publication || new Date().toISOString(),
        photos: a.photo ? [a.photo] : [],
        score_pigeabilite: score,
        analyse_ia: { failles, zone_recherche: zone, generated: false },
        tags: isParticulier ? ["particulier"] : [],
      }).select().single();
      if (!error && row) inserted.push(row);
    }

    const sources = grounding?.grounding_chunks?.map((c: any) => ({
      title: c.web?.title || "",
      url: c.web?.uri || "",
    })).filter((s: any) => s.url) || [];

    return new Response(JSON.stringify({ count: inserted.length, annonces: inserted, sources }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
