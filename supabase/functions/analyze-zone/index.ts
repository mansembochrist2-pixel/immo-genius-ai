import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const SYSTEM_PROMPT = `Tu es un responsable d'agence immobilière française expérimenté.
Tu analyses des zones de prospection en t'appuyant EXCLUSIVEMENT sur les données DVF (Demandes de Valeurs Foncières) qui te sont fournies dans le contexte utilisateur.

RÈGLES ABSOLUES :
- N'INVENTE JAMAIS de données. Si une donnée DVF est absente, écris "Donnée à vérifier".
- Pondère les ventes selon leur fraîcheur : <3 mois (poids fort), 3-6 mois (poids moyen), >6 mois (poids faible).
- Les scores doivent être DÉRIVÉS des données réelles fournies (volume de ventes, évolution prix, vitesse, liquidité).
- Tes recommandations doivent être concrètes et opérationnelles, jamais génériques.
- Cite obligatoirement "DVF (data.gouv.fr / Etalab)" dans les sources si données réelles fournies.

MÉTHODE :
1. Évaluer activité (nb ventes, volume 12m, tension marché)
2. Évaluer prix (médiane, évolution)
3. Évaluer dynamique (délai vente, liquidité)
4. Score Opportunité (0-100) : volume élevé + prix stable/hausse + ventes fréquentes + marché fluide
5. Score Risque (0-100) : faible volume + baisse prix + ventes rares + marché peu liquide
6. Classification : "opportunite" si score_opp > score_risque, sinon "risque"
7. Plan d'action différencié selon classification

Utilise OBLIGATOIREMENT la fonction analyze_zone.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { adresse, secteur } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // 1. Récupérer les données DVF réelles via l'edge function dvf-lookup
    let dvfData: any = null;
    let dvfError: string | null = null;
    try {
      const dvfRes = await fetch(`${SUPABASE_URL}/functions/v1/dvf-lookup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
        },
        body: JSON.stringify({ adresse, type_bien: "appartement" }),
      });
      if (dvfRes.ok) {
        dvfData = await dvfRes.json();
      } else {
        dvfError = `DVF lookup ${dvfRes.status}`;
      }
    } catch (e) {
      dvfError = e instanceof Error ? e.message : "DVF unreachable";
    }

    // 2. Calculer la fraîcheur des données DVF
    let freshness = { recent_3m: 0, mid_6m: 0, old: 0 };
    if (dvfData?.ventes?.length) {
      const now = Date.now();
      for (const v of dvfData.ventes) {
        const ageMs = now - new Date(v.date_mutation).getTime();
        const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30);
        if (ageMonths < 3) freshness.recent_3m++;
        else if (ageMonths < 6) freshness.mid_6m++;
        else freshness.old++;
      }
    }

    // 3. Préparer un contexte riche pour l'IA
    const contexteDVF = dvfData && !dvfData.error
      ? `=== DONNÉES DVF RÉELLES (data.gouv.fr / Etalab) ===
Ville : ${dvfData.ville || "?"} (${dvfData.code_postal || "?"})
Section cadastrale : ${dvfData.section || "?"}
Prix médian au m² : ${dvfData.prix_m2_median ? `${dvfData.prix_m2_median} €/m²` : "Non disponible"}
Tension marché : ${dvfData.tension_marche || "?"}
Volume ventes 12 mois (toutes mutations) : ${dvfData.volume_12_mois ?? "?"}
Nombre de ventes filtrées (18 derniers mois, type compatible) : ${dvfData.nb_ventes_filtrees ?? 0}

Fraîcheur des ventes filtrées :
- <3 mois (poids fort) : ${freshness.recent_3m} ventes
- 3-6 mois (poids moyen) : ${freshness.mid_6m} ventes
- >6 mois (poids faible) : ${freshness.old} ventes

Top 3 ventes récentes :
${(dvfData.ventes || []).map((v: any, i: number) =>
  `${i + 1}. ${v.date_mutation} — ${v.type_local} ${v.surface_reelle_bati}m² — ${v.valeur_fonciere}€ (${v.prix_m2}€/m²) — ${v.adresse_numero || ""} ${v.adresse_nom_voie || ""}`
).join("\n") || "Aucune"}

Date d'extraction : ${dvfData.date_extraction || new Date().toISOString()}`
      : `=== DONNÉES DVF INDISPONIBLES ===
Raison : ${dvfError || dvfData?.message || dvfData?.error || "Aucune donnée trouvée pour cette zone"}
Tu dois indiquer clairement que l'analyse est basée sur des estimations marché général sans données DVF spécifiques. Marque les chiffres "Donnée à vérifier" et baisse la confiance des scores.`;

    const userPrompt = `Analyse cette zone de prospection immobilière :
- Adresse / Quartier : ${adresse}
- Secteur ciblé : ${secteur}

${contexteDVF}

Calcule scores opportunité et risque en t'appuyant sur ces données réelles, et produis un plan d'action concret.`;

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
            description: "Analyse structurée d'une zone immobilière à partir des données DVF",
            parameters: {
              type: "object",
              properties: {
                prix_m2_moyen: { type: "string", description: "Prix médian au m² (reprendre la valeur DVF si disponible)" },
                tendance: { type: "string", description: "Évolution prix sur 12 mois avec %" },
                nb_biens_estimes: { type: "string", description: "Volume estimé de biens en vente" },
                delai_vente: { type: "string", description: "Délai moyen estimé de vente" },
                volume_ventes: { type: "string", description: "Nombre de ventes récentes pondérées par fraîcheur" },
                liquidite: { type: "string", description: "Niveau de liquidité du marché (Élevée/Moyenne/Faible)" },
                score_opportunite: { type: "number", description: "Score 0-100 du potentiel commercial vendeur" },
                score_risque: { type: "number", description: "Score 0-100 du risque marché" },
                classification: { type: "string", enum: ["opportunite", "risque"] },
                niveau_global: {
                  type: "string",
                  enum: ["Très forte opportunité", "Opportunité", "Neutre", "Risque", "Risque élevé"],
                  description: "Niveau global basé sur score_opportunite - score_risque",
                },
                justification_score: { type: "string", description: "2-3 phrases citant les données DVF chiffrées qui justifient les scores" },
                analyse_strategique: {
                  type: "object",
                  properties: {
                    resume_marche: { type: "string" },
                    positionnement: { type: "string" },
                    concurrence: { type: "string" },
                    attractivite: { type: "string" },
                  },
                  required: ["resume_marche", "positionnement", "concurrence", "attractivite"],
                  additionalProperties: false,
                },
                opportunites: { type: "array", items: { type: "string" } },
                risques: { type: "array", items: { type: "string" } },
                plan_action: {
                  type: "object",
                  properties: {
                    si_opportunite: { type: "array", items: { type: "string" }, description: "3-5 actions concrètes : prospection vendeurs, campagnes estimation, ciblage" },
                    si_risque: { type: "array", items: { type: "string" }, description: "3-5 actions de prudence : ciblage investisseurs, repositionnement, attentisme" },
                  },
                  required: ["si_opportunite", "si_risque"],
                  additionalProperties: false,
                },
                strategie: { type: "string", description: "Synthèse stratégique recommandée à l'agent" },
                fraicheur_donnees: { type: "string", description: "Niveau de fraîcheur des données utilisées" },
                sources: { type: "array", items: { type: "string" } },
              },
              required: ["prix_m2_moyen", "tendance", "nb_biens_estimes", "delai_vente", "volume_ventes", "liquidite", "score_opportunite", "score_risque", "classification", "niveau_global", "justification_score", "analyse_strategique", "opportunites", "risques", "plan_action", "strategie", "fraicheur_donnees", "sources"],
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

    // 4. Validation déterministe : score_global et classification
    const scoreOpp = Number(analyse.score_opportunite) || 0;
    const scoreRisk = Number(analyse.score_risque) || 0;
    analyse.score_global = scoreOpp - scoreRisk;
    analyse.classification = scoreOpp > scoreRisk ? "opportunite" : "risque";

    // Niveau global déterministe (override si incohérent)
    const sg = analyse.score_global;
    analyse.niveau_global =
      sg >= 30 ? "Très forte opportunité" :
      sg >= 10 ? "Opportunité" :
      sg > -10 ? "Neutre" :
      sg > -30 ? "Risque" : "Risque élevé";

    // Injection des données DVF brutes pour traçabilité côté UI
    analyse.dvf_raw = dvfData && !dvfData.error ? {
      prix_m2_median: dvfData.prix_m2_median,
      nb_ventes_filtrees: dvfData.nb_ventes_filtrees,
      volume_12_mois: dvfData.volume_12_mois,
      tension_marche: dvfData.tension_marche,
      ville: dvfData.ville,
      code_postal: dvfData.code_postal,
      ventes: dvfData.ventes,
      freshness,
      date_extraction: dvfData.date_extraction,
    } : null;

    if (dvfData && !dvfData.error && !analyse.sources?.includes("DVF (data.gouv.fr / Etalab)")) {
      analyse.sources = [...(analyse.sources || []), "DVF (data.gouv.fr / Etalab)"];
    }

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
