// Edge function: génère stratégie/script de pige IA pour UNE annonce
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { consumeAiCredit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { annonce_id } = await req.json();
    if (!annonce_id) {
      return new Response(JSON.stringify({ error: "annonce_id requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    // --- Auth check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const _token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await authClient.auth.getClaims(_token);
    if (authError || !authData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const callerUserId = authData.claims.sub;

    // --- rate limit / quota ---
    const _rl = await consumeAiCredit(callerUserId, "analyze-annonce-pige");
    if (!_rl.ok) {
      const headers: Record<string, string> = { ...corsHeaders, "Content-Type": "application/json" };
      if (_rl.retry_after_seconds) headers["Retry-After"] = String(_rl.retry_after_seconds);
      return new Response(JSON.stringify({ error: _rl.error }), { status: _rl.status, headers });
    }


    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: annonce, error: annErr } = await supabase
      .from("annonces_pige").select("*").eq("id", annonce_id).single();
    if (annErr || !annonce) {
      return new Response(JSON.stringify({ error: "Annonce introuvable" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (annonce.user_id !== callerUserId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prixM2 = annonce.prix && annonce.surface ? Math.round(Number(annonce.prix) / Number(annonce.surface)) : null;
    const prompt = `Tu es un directeur commercial senior en immobilier français, expert en pige et conquête de mandats. Analyse l'annonce ci-dessous et génère une stratégie d'approche professionnelle, concrète et actionnable.

ANNONCE :
- Titre : ${annonce.titre}
- Prix : ${annonce.prix ? annonce.prix + " €" : "N/C"}${prixM2 ? ` (${prixM2} €/m²)` : ""}
- Surface : ${annonce.surface ? annonce.surface + " m²" : "N/C"}
- Pièces : ${annonce.pieces || "N/C"}
- Ville : ${annonce.ville || "N/C"} ${annonce.code_postal || ""}
- Type : ${annonce.type_bien || "N/C"}
- Vendeur : ${annonce.agence || "N/C"}
- Source : ${annonce.source || "N/C"}
- Description : ${annonce.description || "N/C"}
- Score pigeabilité : ${annonce.score_pigeabilite}/100

Retourne UNIQUEMENT un JSON valide (sans markdown, sans commentaires) :
{
  "accroche": "phrase d'accroche puissante 1 ligne pour ouvrir l'appel",
  "script_appel": "script complet d'appel en 5-8 lignes : présentation brève + question ouverte + transition vers la prise de RDV. Ton humain, chaleureux, professionnel.",
  "failles": ["faille marketing concrète 1", "faille 2", "faille 3"],
  "contre_objections": [
    {"objection": "Je vends en direct, pas besoin d'agence", "reponse": "réponse précise et empathique"},
    {"objection": "J'ai déjà une agence", "reponse": "..."},
    {"objection": "Vos honoraires sont trop élevés", "reponse": "..."},
    {"objection": "Rappelez-moi dans 3 mois", "reponse": "..."}
  ],
  "opportunites": ["levier commercial concret 1", "levier 2", "levier 3"],
  "arguments_negociation": ["argument chiffré 1", "argument 2"],
  "strategie_approche": "résumé en 2-3 phrases de la meilleure approche pour ce vendeur",
  "potentiel_mandat": "faible|moyen|fort",
  "potentiel_exclusivite": "faible|moyen|fort",
  "niveau_urgence": "faible|moyen|fort",
  "niveau_concurrence": "faible|moyen|fort",
  "estimation_commission": "estimation honoraires en € si mandat décroché (calcul ~5% du prix)",
  "conseils_contact": ["conseil 1 (canal + moment)", "conseil 2", "conseil 3"],
  "fiche_proprietaire": {
    "resume_vendeur": "synthèse opérationnelle en 2 phrases, sans inventer d'identité",
    "profil_probable": "particulier|agence|indetermine",
    "motivations_probables": ["hypothèse vérifiable 1", "hypothèse vérifiable 2"],
    "points_douleur": ["problème probable détecté dans l'annonce", "..."],
    "angle_approche": "angle commercial prioritaire pour obtenir un RDV",
    "informations_a_valider": ["question à poser 1", "question à poser 2", "question à poser 3"],
    "prochaine_action": "action simple à faire maintenant",
    "niveau_priorite": "faible|moyen|fort"
  }
}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_completion_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!r.ok) {
      const txt = await r.text();
      if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`Gateway ${r.status}: ${txt}`);
    }

    const data = await r.json();
    const content: string = data.choices?.[0]?.message?.content || "";
    let strategy: any = {};
    try {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) strategy = JSON.parse(m[0]);
    } catch (_) {}

    const fiche = strategy.fiche_proprietaire || {
      resume_vendeur: `Vendeur ${annonce.contact_vendeur?.type || "à qualifier"} détecté sur ${annonce.ville || "la zone"}. Priorité : vérifier la motivation, le calendrier et l'ouverture à un accompagnement professionnel.`,
      profil_probable: annonce.contact_vendeur?.type || "indetermine",
      motivations_probables: ["Vendre dans de bonnes conditions", "Obtenir plus de visibilité ou un meilleur prix"],
      points_douleur: strategy.failles || [],
      angle_approche: strategy.strategie_approche || "Qualifier le projet puis proposer un rendez-vous d'estimation/stratégie.",
      informations_a_valider: ["Pourquoi vendez-vous maintenant ?", "Depuis quand le bien est-il en vente ?", "Avez-vous déjà eu des offres ou visites qualifiées ?"],
      prochaine_action: "Appeler avec une accroche personnalisée et proposer un point de 15 minutes.",
      niveau_priorite: strategy.potentiel_mandat || "moyen",
    };
    const merged = { ...(annonce.analyse_ia || {}), ...strategy, generated: true };
    await supabase.from("annonces_pige").update({ analyse_ia: merged, fiche_proprietaire: fiche, statut: "analysee" }).eq("id", annonce_id);

    return new Response(JSON.stringify({ ok: true, analyse: merged }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
