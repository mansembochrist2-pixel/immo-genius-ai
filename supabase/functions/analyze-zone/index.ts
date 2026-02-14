import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es un expert en analyse de marché immobilier français avec accès aux données DVF (data.gouv.fr), INSEE et bases notariales.

Règles :
- Fournis des estimations réalistes basées sur ta connaissance du marché
- Cite systématiquement tes sources : "Sources : DVF (data.gouv.fr), INSEE, bases notariales"
- Structure l'analyse avec des sections claires
- Utilise la fonction analyze_zone pour structurer ta réponse`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { adresse, secteur } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userPrompt = `Analyse cette zone de prospection immobilière :
- Adresse / Quartier : ${adresse}
- Secteur : ${secteur}

Fournis une analyse complète avec prix estimés, tendances, opportunités et stratégie de prospection.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "analyze_zone",
            description: "Retourne l'analyse structurée d'une zone immobilière",
            parameters: {
              type: "object",
              properties: {
                prix_m2_moyen: { type: "string", description: "Prix moyen au m² estimé" },
                tendance: { type: "string", description: "Tendance du marché (hausse/baisse/stable avec %)" },
                nb_biens_estimes: { type: "string", description: "Nombre estimé de biens en vente" },
                delai_vente: { type: "string", description: "Délai de vente moyen estimé" },
                opportunites: { type: "array", items: { type: "string" }, description: "Liste des opportunités identifiées" },
                risques: { type: "array", items: { type: "string" }, description: "Liste des risques" },
                strategie: { type: "string", description: "Stratégie de prospection recommandée (détaillée)" },
                sources: { type: "array", items: { type: "string" }, description: "Sources utilisées" },
              },
              required: ["prix_m2_moyen", "tendance", "nb_biens_estimes", "delai_vente", "opportunites", "strategie", "sources"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "analyze_zone" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes." }), {
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
      return new Response(JSON.stringify({ error: "L'IA n'a pas pu analyser la zone" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const analyse = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(analyse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-zone error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
