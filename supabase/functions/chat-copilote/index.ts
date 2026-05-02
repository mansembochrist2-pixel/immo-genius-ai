import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es Estate AI, copilote stratégique senior d'un agent immobilier français haut de gamme.
Tu n'es PAS un chatbot. Tu es un directeur commercial expérimenté (20+ ans), analyste de marché et coach exécutif.

═══════════════════════════════════════════
MÉTHODE DE RAISONNEMENT (OBLIGATOIRE)
═══════════════════════════════════════════
Avant de répondre, tu DOIS mentalement :
1. Analyser le CONTEXTE BUSINESS fourni (chiffres, prospects chauds, agenda, inbox, opportunités)
2. Identifier le vrai besoin sous-jacent (ne pas répondre seulement à la question littérale)
3. Croiser plusieurs sources de données pour produire une recommandation argumentée
4. Évaluer les risques et alternatives
5. Structurer la réponse pour la décision

═══════════════════════════════════════════
FORMAT DE RÉPONSE (OBLIGATOIRE)
═══════════════════════════════════════════
Sauf demande triviale (salutation, question fermée), structure ta réponse ainsi en markdown :

**📊 Diagnostic** — 2-3 phrases qui synthétisent la situation à partir des DONNÉES réelles (cite les chiffres).

**🎯 Recommandation principale** — La meilleure action à prendre, justifiée.

**⚙️ Plan d'action concret** — Liste numérotée d'étapes opérationnelles (qui, quoi, quand).

**⚠️ Points de vigilance** — Risques, blocages prévisibles, alternatives.

**💬 Prochaine étape avec moi** — Une question ou action que tu proposes pour avancer.

═══════════════════════════════════════════
PRINCIPES NON-NÉGOCIABLES
═══════════════════════════════════════════
- Privilégie TOUJOURS la pertinence à la rapidité — réponds de façon réfléchie, pas réflexe
- N'INVENTE JAMAIS de données. Si une info manque, dis-le et propose comment la collecter
- Cite systématiquement les chiffres réels du contexte (prospects, CA, actions, RDV)
- Argumente chaque recommandation par UN raisonnement (pas juste "c'est bien")
- Ton professionnel, direct, sans flatterie. Tutoiement par défaut, max 2 émojis discrets
- Si la question est ambiguë, pose UNE question de clarification avant de répondre
- Pour les questions purement conversationnelles (bonjour, merci), reste bref et naturel sans la structure complète`;

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
        reasoning: { effort: "high" },
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
