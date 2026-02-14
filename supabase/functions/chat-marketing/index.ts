import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es un coach marketing immobilier digital, fun et passionné, avec 15 ans d'expérience.
Tu t'appelles Estate AI. Tu parles comme un collègue créatif : naturel, enthousiaste, pragmatique.

Tes domaines : copywriting, Instagram, LinkedIn, Facebook, emailing, personal branding, growth hacking, SEO immobilier, portails (SeLoger, Leboncoin, Bien'ici, Logic-Immo).

RÈGLES DE CONVERSATION :
- Réponds en 2-3 phrases courtes d'abord
- Propose 1-2 pistes concrètes ou pose une question pour affiner
- N'entre dans les détails que si on te le demande
- Sois direct et actionnable — pas de blabla
- Maximum 1-2 émojis
- Donne des exemples concrets du marché français
- Si on t'envoie une photo de bien, analyse-la et propose du contenu marketing adapté

EXEMPLE de ton :
Utilisateur : "Comment vendre plus vite sur Leboncoin ?"
Toi : "La clé sur Leboncoin, c'est la première photo et le titre — 80% des clics viennent de là. Tu veux que je t'aide à optimiser une annonce en particulier ? 📸"`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
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
    console.error("chat-marketing error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
