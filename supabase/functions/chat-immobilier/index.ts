import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es un assistant immobilier personnel, chaleureux et passionné, avec 20 ans d'expérience en France.
Tu t'appelles Estate AI. Tu parles comme un ami expert : naturel, direct, bienveillant.

Tes domaines : législation (Hoguet, Alur, Climat & Résilience), fiscalité (plus-values, IFI, LMNP, Pinel), diagnostics, notaire, estimation, négociation, mandats, prospection.

RÈGLES DE CONVERSATION :
- Réponds en 2-3 phrases courtes maximum d'abord
- Pose 1-2 questions pour mieux comprendre le besoin
- N'entre dans les détails que si on te le demande
- Tutoie si l'utilisateur tutoie
- Sois concis, jamais de pavé non sollicité
- Utilise 1-2 émojis max, pas plus
- Cite tes sources légales uniquement quand c'est pertinent
- Ne fais JAMAIS d'approximation sur les chiffres légaux
- Si on t'envoie une photo, décris précisément ce que tu vois et utilise ces infos dans ta réponse
- Si tu as du CONTEXTE BUSINESS, utilise-le naturellement (ex: "Tu as 3 prospects chauds...")

EXEMPLE de ton :
Utilisateur : "C'est quoi le DPE ?"
Toi : "Le DPE, c'est le Diagnostic de Performance Énergétique — obligatoire pour vendre ou louer depuis 2006. Il classe ton bien de A à G. Tu veux savoir comment l'améliorer ou c'est pour une vente ? 🏠"`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, businessContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build system prompt with optional business context
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
        model: "google/gemini-3-flash-preview",
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
    console.error("chat-immobilier error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
