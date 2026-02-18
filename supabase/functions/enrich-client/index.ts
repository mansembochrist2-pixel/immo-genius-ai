import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es l'IA d'Estate AI, spécialisée dans l'analyse de profils clients immobiliers.

Tu reçois les données d'un client et son historique d'interactions (messages inbox).

Tu dois retourner un JSON STRICT (pas de markdown) :
{
  "score_ia": 0-100 (probabilité de signature),
  "score_urgence": 0-10 (urgence de relance),
  "motivation": "phrase courte décrivant la motivation principale",
  "freins": "phrase courte décrivant les freins principaux",
  "resume_ia": "résumé stratégique de 2-3 phrases sur ce client",
  "strategie_adaptee": "recommandation concrète d'action en 2-3 phrases",
  "taux_signature": 0-100 (pourcentage estimé)
}

RÈGLES :
- Sois précis et actionnable
- Base-toi sur les données réelles fournies
- Si peu de données, indique-le et donne des recommandations pour enrichir le profil
- Le score_ia combine : budget, motivation, engagement (messages), statut actuel`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { client, interactions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userPrompt = `CLIENT :
Nom: ${client.nom}
Statut: ${client.statut}
Email: ${client.email || "non renseigné"}
Téléphone: ${client.telephone || "non renseigné"}
Budget: ${client.budget_min || "?"} - ${client.budget_max || "?"} €
Secteur recherché: ${client.secteur_recherche || "non renseigné"}
Type de bien: ${client.type_bien_recherche || "non renseigné"}
Source/Provenance: ${client.source || client.provenance || "non renseigné"}
Canal préféré: ${client.canal_prefere || "non renseigné"}
Notes: ${client.notes || "aucune"}
Tags: ${(client.tags || []).join(", ") || "aucun"}

HISTORIQUE INTERACTIONS (${(interactions || []).length} messages) :
${(interactions || []).map((m: any) => `[${m.canal}] ${m.direction === "entrant" ? "Client→Agent" : "Agent→Client"}: ${m.contenu.slice(0, 200)}`).join("\n") || "Aucune interaction"}

Analyse ce profil et génère le JSON d'enrichissement.`;

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
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    try {
      const enrichment = JSON.parse(content);
      return new Response(JSON.stringify(enrichment), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Analyse IA indisponible", raw: content }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("enrich-client error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
