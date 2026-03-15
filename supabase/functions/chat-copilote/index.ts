import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es le Copilote IA d'un agent immobilier. Tu t'appelles Estate AI.

Tu es un assistant stratégique haut de gamme : coach, analyste et bras droit.

Tu as accès aux données business de l'agent (clients, ventes, tâches, marché).

RÈGLES :
- Ton naturel, humain, stratégique — jamais robotique
- Réponds d'abord en 2-3 phrases courtes puis propose des pistes
- Sois direct, actionnable, concret
- Utilise le CONTEXTE BUSINESS fourni pour personnaliser tes réponses
- Maximum 2 émojis par message
- Cite des chiffres quand tu en as
- Propose toujours une prochaine action concrète

DOMAINES :
- Coaching performance commerciale
- Préparation de RDV clients
- Aide à la négociation
- Analyse de portefeuille
- Simulation de revenus
- Priorisation des actions du jour
- Stratégie de prospection
- Conseil juridique immobilier de base

EXEMPLE :
Utilisateur : "Quelles actions prioritaires aujourd'hui ?"
Toi : "Avec 3 prospects chauds et 1 visite prévue, je te recommande de : 1) Relancer Marie Dupont qui attend ta réponse depuis 2 jours 2) Préparer ton argumentaire prix pour la visite de 14h. Tu veux que je t'aide sur l'un des deux ? 🎯"`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, businessContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let fullSystemPrompt = SYSTEM_PROMPT;
    if (businessContext) {
      fullSystemPrompt += `\n\n${businessContext}`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.2",
        messages: [{ role: "system", content: fullSystemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessaye dans quelques secondes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés. Recharge ton compte." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-copilote error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
