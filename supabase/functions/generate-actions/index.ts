import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es le moteur décisionnel d'un copilote immobilier stratégique. Tu analyses les données multi-modules (clients, messages, opportunités, ventes) pour générer des ACTIONS RECOMMANDÉES précises et actionnables.

Pour chaque action, fournis un JSON strict :
{
  "actions": [
    {
      "type": "relance" | "rdv" | "negociation" | "alerte_risque" | "opportunite" | "suivi",
      "titre": "Titre court et actionnable",
      "objectif": "Ce que l'agent doit accomplir",
      "action_attendue": "L'action concrète à réaliser",
      "risque_si_ignore": "Conséquence business si non traité",
      "priorite": "critique" | "haute" | "moyenne" | "basse",
      "score_pertinence": 0-100,
      "client_nom": "Nom du client lié (si applicable)",
      "date_suggeree_delai_heures": nombre d'heures avant action recommandée,
      "source_module": "inbox" | "clients" | "radar" | "ventes"
    }
  ]
}

Règles :
- Maximum 8 actions, minimum 2
- Priorise par impact business réel
- Score >= 80 = action critique
- Détecte : relances manquées (>48h sans réponse), RDV implicites, engagements flous, risques commerciaux, prospects inactifs
- Sois concret et spécifique, pas générique
- Ne crée que des actions à fort impact
- Réponds UNIQUEMENT en JSON valide`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { businessContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
          { role: "user", content: `Analyse ces données et génère les actions recommandées :\n\n${businessContext}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans quelques instants" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Crédits IA épuisés" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const parsed = JSON.parse(content);
      return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch {
      return new Response(JSON.stringify({ error: "Analyse IA indisponible", raw: content }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
