import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `Tu es un stratège patrimonial senior français, expert en investissement locatif (LMNP, déficit foncier, SCI, démembrement, Pinel, Denormandie, Malraux, Monuments Historiques).

Ta mission : analyser le dossier et proposer 3 à 6 leviers d'optimisation AVANCÉS, complémentaires aux suggestions classiques (allongement crédit, apport, négo taux). Pense large : montage juridique, démembrement, holding, déficit foncier, dispositifs fiscaux, refinancement, recours à un courtier crédit, optimisation du chauffage / DPE, négociation taxe foncière, dispositifs ANAH Loc'Avantages, SCI à l'IS, achat en démembrement temporaire, division parcellaire, etc.

Tu connais la fiscalité française 2025-2026 à jour. Tu chiffres les économies en euros quand c'est possible. Tu ne hallucines pas : si tu doutes, tu mets une fourchette et "à confirmer avec un notaire/expert-comptable".

Retourne UNIQUEMENT un JSON valide (sans markdown) :
{
  "diagnostic": "1-2 phrases qui résument la situation",
  "leviers": [
    {
      "titre": "Court (5-8 mots)",
      "categorie": "fiscal | juridique | financier | travaux | marché",
      "description": "2-3 phrases percutantes, chiffrées si possible",
      "impact_estime": "+X €/mois ou +Y €/an ou +Z % rentabilité",
      "complexite": "facile | moyenne | élevée",
      "source": "Article CGI / dispositif / pratique"
    }
  ]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { inputs, results } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.4",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `DOSSIER :\n${JSON.stringify(inputs, null, 2)}\n\nRÉSULTATS CALCULÉS :\n${JSON.stringify(results, null, 2)}\n\nPropose les 3 à 6 leviers les plus impactants pour CE dossier précis. JSON only.`,
          },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429)
        return new Response(JSON.stringify({ error: "Trop de requêtes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      if (resp.status === 402)
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      throw new Error("Erreur du service IA");
    }
    const data = await resp.json();
    let content: string = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    try {
      return new Response(content, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch {
      return new Response(JSON.stringify({ error: "Format invalide", raw: content }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
