import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es un expert en marketing immobilier digital pour le marché français.
Tu crées du contenu marketing percutant, professionnel et adapté au canal demandé.
Utilise la fonction generate_marketing pour structurer ta réponse.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, bien, cible, ton } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userPrompt = `Génère du contenu marketing immobilier :
- Type de contenu : ${type} (email / post_social / sms / flyer)
- Bien ou sujet : ${bien || "Non précisé"}
- Cible : ${cible || "Acheteurs potentiels"}
- Ton souhaité : ${ton || "professionnel et engageant"}

Adapte le format, la longueur et le style au canal demandé.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_marketing",
            description: "Génère du contenu marketing immobilier structuré",
            parameters: {
              type: "object",
              properties: {
                objet: { type: "string", description: "Objet de l'email ou titre du post" },
                contenu_principal: { type: "string", description: "Corps du contenu marketing" },
                call_to_action: { type: "string", description: "Appel à l'action" },
                variante_courte: { type: "string", description: "Version courte (SMS ou story)" },
                hashtags: { type: "array", items: { type: "string" }, description: "Hashtags pertinents" },
                conseils: { type: "array", items: { type: "string" }, description: "Conseils d'utilisation du contenu" },
              },
              required: ["objet", "contenu_principal", "call_to_action", "variante_courte", "hashtags", "conseils"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_marketing" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans quelques instants." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(JSON.stringify({ error: "L'IA n'a pas pu générer le contenu" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const marketing = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(marketing), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-marketing error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
