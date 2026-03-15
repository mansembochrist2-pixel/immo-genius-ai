import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es l'IA d'analyse conversationnelle d'Estate AI, un copilote pour agents immobiliers.

Tu reçois un message client et tu dois fournir une analyse structurée + 3 réponses suggérées.

RETOURNE UN JSON STRICT (pas de markdown) avec cette structure :
{
  "intention": "Visite" | "Négociation" | "Information" | "Urgence" | "Suivi" | "Réclamation" | "Offre",
  "urgence": 1-4 (1=basse, 4=critique),
  "sentiment": "Positif" | "Neutre" | "Négatif" | "Anxieux",
  "stress_level": 1-5,
  "key_points": ["point clé 1", "point clé 2"],
  "reponses": {
    "professionnelle": "Réponse formelle et structurée...",
    "commerciale": "Réponse orientée closing/opportunité...",
    "empathique": "Réponse chaleureuse et rassurante..."
  }
}

RÈGLES :
- Réponses de 2-4 phrases, naturelles, jamais robotiques
- Personnalisées au contexte immobilier
- La réponse commerciale doit toujours pousser vers l'action suivante
- La réponse empathique doit rassurer et créer de la confiance
- Adapte le vouvoiement/tutoiement au ton du message original`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message, clientName, canal } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userPrompt = `Client: ${clientName || "Inconnu"}
Canal: ${canal || "email"}
Message: "${message}"

Analyse ce message et génère les 3 réponses suggérées.`;

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
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans quelques secondes." }), {
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
    let content = data.choices?.[0]?.message?.content || "";
    
    // Strip markdown fences if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    
    try {
      const analysis = JSON.parse(content);
      return new Response(JSON.stringify(analysis), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ 
        error: "Analyse IA indisponible",
        raw: content 
      }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("analyze-inbox error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
