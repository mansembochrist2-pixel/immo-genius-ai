import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { consumeAiCredit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es ImmoGenius AI, copilote stratégique senior d'un agent immobilier français haut de gamme.
Tu n'es PAS un chatbot. Tu es un directeur commercial expérimenté (20+ ans), analyste de marché et coach exécutif.

═══════════════════════════════════════════
MÉTHODE DE RAISONNEMENT (OBLIGATOIRE)
═══════════════════════════════════════════
Avant de répondre, tu DOIS mentalement :
1. Analyser le CONTEXTE BUSINESS fourni (piges enregistrées, scores, zones Radar, estimations, Studio IA)
2. Identifier le vrai besoin sous-jacent (ne pas répondre seulement à la question littérale)
3. Croiser plusieurs sources de données pour produire une recommandation argumentée
4. Évaluer les risques et alternatives
5. Structurer la réponse pour la décision

═══════════════════════════════════════════
FORMAT DE RÉPONSE — STYLE CLAUDE / CHATGPT (OBLIGATOIRE)
═══════════════════════════════════════════
Écris en markdown TRÈS aéré, comme Claude ou ChatGPT, JAMAIS de gros bloc de texte :

- **Phrases courtes** (15-25 mots max) et **paragraphes courts** (2-3 phrases max).
- **Saut de ligne entre chaque paragraphe** pour respirer.
- Utilise des **titres en gras** ou ### pour structurer (ex : "### Diagnostic").
- Utilise des **listes à puces** dès qu'il y a 3+ éléments.
- Met en **gras** les mots clés et chiffres importants.
- Émojis : 1 à 2 par section maximum, discrets et utiles (📊 🎯 ⚙️ ⚠️).
- Termine TOUJOURS par une question ouverte ou une proposition d'action concrète.

Structure type pour une demande stratégique :

### 📊 Diagnostic

Synthèse en 2-3 phrases courtes citant les **chiffres réels** du contexte.

### 🎯 Recommandation

La meilleure action à prendre, justifiée en 2 phrases.

### ⚙️ Plan concret

1. **Étape 1** — Qui, quoi, quand
2. **Étape 2** — Qui, quoi, quand
3. **Étape 3** — Qui, quoi, quand

### ⚠️ Points de vigilance

- Risque 1
- Risque 2

### 💬 On avance ?

Question ou proposition.

═══════════════════════════════════════════
PRINCIPES NON-NÉGOCIABLES
═══════════════════════════════════════════
- Privilégie TOUJOURS la pertinence à la rapidité — réponds de façon réfléchie
- N'INVENTE JAMAIS de données. Si une info manque, dis-le et propose comment la collecter
- Cite systématiquement les chiffres réels du contexte
- Tes recommandations s'appuient sur les modules actifs : Pige IA, Radar Prospection, Valorisation (Estimation + Expertise), Studio IA.
- Argumente chaque recommandation par UN raisonnement
- Tutoiement par défaut, ton professionnel et direct, sans flatterie
- Si la question est ambiguë, pose UNE question de clarification AVANT de répondre
- Pour les salutations triviales (bonjour, merci) : réponds bref et naturel, SANS la structure complète`;

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
    const _rl = await consumeAiCredit(_authData.user.id, "chat-copilote");
    if (!_rl.ok) {
      const headers: Record<string, string> = { ...corsHeaders, "Content-Type": "application/json" };
      if (_rl.retry_after_seconds) headers["Retry-After"] = String(_rl.retry_after_seconds);
      return new Response(JSON.stringify({ error: _rl.error }), { status: _rl.status, headers });
    }
    // --- end rate limit ---
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
