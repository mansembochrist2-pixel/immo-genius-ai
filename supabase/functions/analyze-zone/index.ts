import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es un expert senior en analyse de marché immobilier français.
Tu t'appuies exclusivement sur des sources publiques vérifiables : DVF (data.gouv.fr), INSEE, bases notariales, observatoires locaux.

Méthode obligatoire :
1. Analyser les données du marché local (prix, volumes, délais)
2. Calculer un SCORE D'OPPORTUNITÉ (0-100) — potentiel commercial pour un agent
3. Calculer un SCORE DE RISQUE (0-100) — probabilité de marché défavorable
4. Classer : "opportunite" si score_opportunite > score_risque + 15, "risque" si l'inverse, sinon "neutre"
5. Produire un PLAN D'ACTION concret et différencié selon la classification

Règles strictes :
- Ne jamais inventer de chiffres : si une donnée n'est pas inférable du marché, mets "Donnée à vérifier"
- Cite TOUJOURS les sources réelles utilisées
- Le plan d'action doit être opérationnel (pas générique)
- Utilise OBLIGATOIREMENT la fonction analyze_zone`;

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
        model: "openai/gpt-5.2",
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
                prix_m2_moyen: { type: "string", description: "Prix moyen au m² estimé (DVF)" },
                tendance: { type: "string", description: "Tendance 12 mois avec %" },
                nb_biens_estimes: { type: "string", description: "Volume de biens en vente estimé" },
                delai_vente: { type: "string", description: "Délai moyen de vente" },
                score_opportunite: { type: "number", description: "Score 0-100 du potentiel commercial" },
                score_risque: { type: "number", description: "Score 0-100 du risque marché" },
                classification: { type: "string", enum: ["opportunite", "risque", "neutre"] },
                justification_score: { type: "string", description: "2-3 phrases justifiant les scores avec données chiffrées" },
                opportunites: { type: "array", items: { type: "string" } },
                risques: { type: "array", items: { type: "string" } },
                plan_action: {
                  type: "object",
                  properties: {
                    si_opportunite: { type: "array", items: { type: "string" }, description: "3-5 actions concrètes : prospection vendeurs, campagnes estimation, ciblage" },
                    si_risque: { type: "array", items: { type: "string" }, description: "3-5 actions de prudence : ciblage spécifique, repositionnement, attentisme" },
                  },
                  required: ["si_opportunite", "si_risque"],
                  additionalProperties: false,
                },
                strategie: { type: "string", description: "Synthèse stratégique recommandée" },
                sources: { type: "array", items: { type: "string" }, description: "Sources publiques réellement utilisées" },
              },
              required: ["prix_m2_moyen", "tendance", "nb_biens_estimes", "delai_vente", "score_opportunite", "score_risque", "classification", "justification_score", "opportunites", "risques", "plan_action", "strategie", "sources"],
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
