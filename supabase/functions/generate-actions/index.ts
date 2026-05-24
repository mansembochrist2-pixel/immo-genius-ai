import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { consumeAiCredit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es le moteur décisionnel d'un copilote immobilier stratégique centré sur la conquête de mandats. Tu analyses UNIQUEMENT les modules actuels : Pige IA, Radar Prospection, Estimation IA, Studio IA et Copilote.

Modules retirés et INTERDITS dans tes réponses : anciens clients/prospects CRM, inbox IA, agenda IA, mémoire client, ventes/CA, relances prospects génériques.

Pour chaque action, fournis un JSON strict :
{
  "actions": [
    {
      "type": "pige" | "radar" | "estimation" | "studio" | "negociation" | "opportunite" | "suivi",
      "titre": "Titre court et actionnable",
      "objectif": "Ce que l'agent doit accomplir",
      "action_attendue": "L'action concrète à réaliser",
      "risque_si_ignore": "Conséquence business si non traité",
      "priorite": "critique" | "haute" | "moyenne" | "basse",
      "score_pertinence": 0-100,
      "bien_ou_zone": "Annonce, bien ou zone lié(e) si applicable",
      "date_suggeree_delai_heures": nombre d'heures avant action recommandée,
      "source_module": "pige_ia" | "radar" | "estimation_ia" | "studio_ia" | "copilote"
    }
  ]
}

Règles :
- Maximum 8 actions, minimum 2
- Priorise par impact business réel
- Score >= 80 = action critique
- Détecte : top piges à traiter, vendeurs particuliers à qualifier, annonces avec baisse de prix/multi-diffusion, zones Radar porteuses, risques de marché, contenus ou estimations à préparer
- Ne jamais écrire "relancer le client" ou "prospect chaud" sans donnée explicite issue de Pige IA/Radar
- Sois concret et spécifique, pas générique
- Ne crée que des actions à fort impact
- Réponds UNIQUEMENT en JSON valide`;

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
    const _userId = _authData.claims.sub;
    // --- end auth ---
    // --- rate limit / quota ---
    const _rl = await consumeAiCredit(_userId, "generate-actions");
    if (!_rl.ok) {
      const headers: Record<string, string> = { ...corsHeaders, "Content-Type": "application/json" };
      if (_rl.retry_after_seconds) headers["Retry-After"] = String(_rl.retry_after_seconds);
      return new Response(JSON.stringify({ error: _rl.error }), { status: _rl.status, headers });
    }
    // --- end rate limit ---
    const { businessContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.2",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Analyse ces données et génère les actions recommandées :\n\n${businessContext}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans quelques instants" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Crédits IA épuisés" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const parsed = JSON.parse(content);
      return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch {
      return new Response(JSON.stringify({ error: "Analyse IA indisponible", raw: content }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
