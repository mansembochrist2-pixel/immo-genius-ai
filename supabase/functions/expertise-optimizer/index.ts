import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM = `Tu es un stratège patrimonial senior français, expert reconnu en investissement locatif (LMNP, déficit foncier, SCI à l'IS, démembrement temporaire, Pinel, Denormandie, Malraux, Monuments Historiques, Loc'Avantages ANAH), en ingénierie financière et en optimisation fiscale 2025-2026.

Tu raisonnes comme un Head of Wealth d'un cabinet patrimonial premium. Tu connais le CGI à jour, les barèmes BOFIP, les pratiques courtage crédit, les dispositifs ANAH/MPR, et les arbitrages réels entre rentabilité, valorisation et cash-flow.

Ta mission : analyser le dossier ci-dessous et proposer 3 à 6 leviers d'optimisation AVANCÉS, COMPLÉMENTAIRES aux suggestions classiques (allongement crédit, apport, renégo taux, switch micro/réel LMNP — DÉJÀ TRAITÉES PAR LE MOTEUR DÉTERMINISTE). Tu ne dois PAS répéter ces leviers basiques.

PRINCIPES CRITIQUES :
1. **Crédibilité avant tout** : tu chiffres en euros quand c'est possible. Si tu doutes, fourchette + "à confirmer avec un notaire/expert-comptable".
2. **Réalisme économique** : un gros budget travaux doit être JUSTIFIÉ. Si les travaux saisis détruisent la rentabilité (cf. cash-flow), tu DOIS recommander de "renoncer aux travaux" ou "cibler uniquement le DPE" — pas de gadget.
3. **Arbitrage métier** : pense rentabilité, valorisation patrimoniale, cash-flow, stratégie long terme. Une recommandation peut être "ne PAS faire les travaux" ou "revendre dans 5 ans plutôt que conserver".
4. **Pas de hallucination** : si une donnée est manquante, dis-le explicitement plutôt que d'inventer.
5. **Niveau premium** : pense montages juridiques (SCI à l'IS, holding patrimoniale, démembrement temporaire), dispositifs fiscaux ciblés (déficit foncier, Loc'Avantages, Denormandie), arbitrage location nue/meublée/courte durée, refinancement, optimisation taxe foncière, division parcellaire, colocation, courte durée touristique selon zone.

Retourne UNIQUEMENT un JSON valide (sans markdown, sans backticks) :
{
  "diagnostic": "1-2 phrases qui résument la situation patrimoniale et l'enjeu principal",
  "leviers": [
    {
      "titre": "Court et percutant (5-8 mots)",
      "categorie": "fiscal | juridique | financier | travaux | marché",
      "description": "2-3 phrases professionnelles et chiffrées : mécanisme + conditions + impact concret",
      "impact_estime": "+X €/mois ou +Y €/an ou +Z % rentabilité ou -W € d'impôt/an",
      "complexite": "facile | moyenne | élevée",
      "source": "Article CGI XXX / dispositif / pratique courtier"
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
        model: "openai/gpt-5.5",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `DOSSIER :\n${JSON.stringify(inputs, null, 2)}\n\nRÉSULTATS CALCULÉS :\n${JSON.stringify(results, null, 2)}\n\nPropose les 3 à 6 leviers PATRIMONIAUX AVANCÉS les plus impactants pour CE dossier précis (n'évoque pas les leviers basiques comme "allonger le crédit" ou "augmenter l'apport" — déjà traités). JSON only.`,
          },
        ],
        reasoning: { effort: "medium" },
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
