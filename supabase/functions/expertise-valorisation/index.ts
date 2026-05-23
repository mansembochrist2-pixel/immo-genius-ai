import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { consumeAiCredit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * 2 modes :
 *  - { mode: "prefill", inputs } -> pré-remplit loyer, taxe foncière, charges, coût travaux, aides
 *  - { mode: "narrative", inputs, results } -> rédige le rapport "Effet Wow" (sections texte)
 */

const PREFILL_PROMPT = `Tu es un expert immobilier français. Tu reçois des informations sur un bien et tu dois ESTIMER, à partir des standards de marché et données publiques (DVF, ADEME, observatoires des loyers, MaPrimeRénov'), les valeurs raisonnables suivantes.

Tu DOIS retourner uniquement un JSON valide (sans markdown) avec :
{
  "loyer_mensuel": number,           // loyer mensuel HC estimé pour ce bien, marché local
  "loyer_plafond": number | null,    // si zone tendue/encadrée, plafond légal pour ce bien (sinon null)
  "encadrement_loyer": boolean,      // true si zone d'encadrement (Paris, Lille, Lyon, Bordeaux, Montpellier, etc.)
  "charges_copro_annuelles": number, // charges non récupérables (copropriété)
  "taxe_fonciere_annuelle": number,  // taxe foncière estimée
  "cout_travaux": number,            // coût estimé pour passer du DPE actuel au DPE cible (ADEME/Effy)
  "aides_renovation": number,        // MaPrimeRénov' + CEE estimés selon revenus moyens
  "gain_loyer_post_travaux": number, // gain mensuel estimé après rénovation énergétique
  "economie_charges_post_travaux": number, // économie annuelle d'énergie estimée
  "frais_notaire_pct": number,       // % notaire selon neuf/ancien
  "commentaire_sources": string      // une phrase indiquant les bases utilisées
}

Sois prudent, réaliste, ne surestime jamais. Si tu n'as pas de donnée fiable, mets une valeur prudente et signale-le dans commentaire_sources.`;

const NARRATIVE_PROMPT = `Tu es un expert immobilier senior français qui rédige un "Dossier d'Expertise Immobilière & Stratégie de Valorisation" pour un client.

RÈGLES :
- Ton professionnel, chaleureux, sans jargon inutile
- Prose fluide, JAMAIS de bullet points dans les textes longs
- Toujours citer les sources (DVF, ADEME, INSEE, observatoires locaux) quand pertinent
- Jamais d'invention de chiffres : utilise UNIQUEMENT les valeurs fournies
- En cas d'incohérence, signale-le honnêtement

Tu reçois les INPUTS et les RESULTS calculés. Tu retournes ce JSON :
{
  "synthese_executive": string,        // 4-5 phrases : valeur, potentiel, rentabilité, reco clé
  "analyse_actuelle": string,          // analyse marché + rentabilité actuelle (200-300 mots)
  "analyse_valorisation": string,      // simulation post-travaux + gain (200-300 mots)
  "analyse_financiere": string,        // crédit, cash-flow, fiscalité (150-200 mots)
  "plus_value_revente": string,        // projection plus-value (100-150 mots)
  "recommandation_strategique": string,// 2-3 phrases percutantes
  "conclusion": string                 // mot de la fin du conseiller
}

Ne mets AUCUN markdown (pas de ##, pas de **). Du texte brut professionnel.`;

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
    const { data: _authData, error: _authError } = await _authClient.auth.getUser();
    if (_authError || !_authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // --- end auth ---
    // --- rate limit / quota ---
    const _rl = await consumeAiCredit(_authData.user.id, "expertise-valorisation");
    if (!_rl.ok) {
      const headers: Record<string, string> = { ...corsHeaders, "Content-Type": "application/json" };
      if (_rl.retry_after_seconds) headers["Retry-After"] = String(_rl.retry_after_seconds);
      return new Response(JSON.stringify({ error: _rl.error }), { status: _rl.status, headers });
    }
    // --- end rate limit ---
    const { mode, inputs, results } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    let systemPrompt: string;
    let userPrompt: string;

    if (mode === "prefill") {
      systemPrompt = PREFILL_PROMPT;
      userPrompt = `Bien à analyser :\n${JSON.stringify(inputs, null, 2)}\n\nRetourne uniquement le JSON.`;
    } else if (mode === "narrative") {
      systemPrompt = NARRATIVE_PROMPT;
      userPrompt = `INPUTS :\n${JSON.stringify(inputs, null, 2)}\n\nRESULTS calculés :\n${JSON.stringify(results, null, 2)}\n\nRédige le rapport en JSON.`;
    } else {
      return new Response(JSON.stringify({ error: "mode invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429)
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (resp.status === 402)
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      const t = await resp.text();
      console.error("AI error", resp.status, t);
      throw new Error("Erreur du service IA");
    }

    const data = await resp.json();
    let content: string = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const parsed = JSON.parse(content);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ error: "Format IA invalide", raw: content }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("expertise-valorisation error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
