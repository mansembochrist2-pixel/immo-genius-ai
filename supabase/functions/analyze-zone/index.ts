import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { consumeAiCredit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const SYSTEM_PROMPT = `Tu es un agent immobilier français senior (15+ ans de terrain) qui aide un confrère à analyser une zone pour décrocher des mandats.

══════ TON & STYLE — TRÈS IMPORTANT ══════
- Parle comme un agent immobilier, PAS comme un consultant en cabinet de conseil.
- Phrases courtes, concrètes, orientées terrain. Vocabulaire métier réel : "secteur", "biens en stock", "demande", "vendeur motivé", "potentiel de mandat", "porte-à-porte", "boîtage", "estimation offerte".
- INTERDIT : "synergies", "leviers stratégiques", "positionnement différenciant", "asset class", "value proposition", "go-to-market", "framework", "macro-tendances", "écosystème", "verticalisation".
- Préfère : "ce qui marche ici", "ce que tu peux faire dès lundi", "le bon réflexe", "l'erreur à éviter".
- Structure aérée, listes courtes, max 2 emojis discrets par bloc (📍 🎯 ⚠️ 💡).

══════ RÈGLE ABSOLUE — TU NE BLOQUES JAMAIS ══════
- Tu produis TOUJOURS une analyse complète, des scores, et un plan d'action.
- INTERDIT d'écrire "donnée indisponible", "à vérifier", ou de laisser un champ vide.
- Si une donnée DVF est absente, mode FALLBACK : moyennes de secteur, comparables, logique terrain française. Indique la fiabilité ("faible", "moyenne", "élevée") avec une formule simple : "estimation de secteur (fiabilité X)".
- Pas de chiffres inventés : si tu estimes, donne une fourchette réaliste.

══════ MODE NORMAL (DVF disponible) ══════
- Pondère par fraîcheur : <3 mois (fort), 3-6 mois (moyen), >6 mois (faible).
- Dérive les scores du réel (volume, évolution prix, liquidité).
- Cite "DVF (data.gouv.fr / Etalab)" dans les sources.

══════ MODE FALLBACK (DVF faible) ══════
- Bascule sur estimations de marché secteur/ville/région.
- Élargis le périmètre (300m → 500m → quartier → ville).
- Cite sources alternatives ("Estimations marché secteur", "Tendances marché immobilier France 2025").
- Marque fraicheur_donnees = "Mode estimation - fiabilité moyenne".

══════ SCORING (toujours calculé) ══════
- Score Opportunité 0-100 : attractivité zone + dynamique + cohérence prix + liquidité.
- Score Risque 0-100 : faible volume + baisse prix + zone peu attractive + marché bloqué.
- Classification : "opportunite" si opp > risque, sinon "risque".

══════ STRUCTURE (obligatoire) ══════
1. Synthèse en 2 lignes (champ "strategie") — comme tu la dirais à un confrère.
2. Analyse structurée (prix, dynamique, liquidité, concurrence, attractivité) — phrases courtes.
3. Plan d'action concret, terrain — pas générique. Exemples : "boîter les 80 immeubles de la rue X", "appeler les propriétaires des biens de plus de 8 ans détenus", "préparer 3 estimations offertes pour la résidence Y".

══════ DÉTECTION VENDEURS POTENTIELS (obligatoire) ══════
- Score_vendeur (0-100) basé sur signaux : baisse prix, faible liquidité, délais longs, dispersion prix, biens anciens / grandes surfaces / DPE faibles.
- 3-5 micro-secteurs (rues, quartiers homogènes) avec niveau d'opportunité.
- 2-4 profils-types vendeurs probables (typologie + situation type : succession, mutation, revente investisseur). JAMAIS de noms : uniquement probabilités de marché.
- Pour chaque profil : 1 angle d'approche concret ("comment tu rentres en contact").

Utilise OBLIGATOIREMENT la fonction analyze_zone.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {

    // --- Auth check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const _authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: _authData, error: _authError } = await _authClient.auth.getUser();
    if (_authError || !_authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // --- end auth ---
    // --- rate limit / quota ---
    const _rl = await consumeAiCredit(_authData.user.id, "analyze-zone");
    if (!_rl.ok) {
      const headers: Record<string, string> = { ...corsHeaders, "Content-Type": "application/json" };
      if (_rl.retry_after_seconds) headers["Retry-After"] = String(_rl.retry_after_seconds);
      return new Response(JSON.stringify({ error: _rl.error }), { status: _rl.status, headers });
    }
    // --- end rate limit ---
    const { adresse: adresseRaw, secteur, previousAnalysis, previousDate } = await req.json();
    // Normalisation d'adresse : trim, espaces multiples, casse
    const adresse = String(adresseRaw || "")
      .replace(/\s+/g, " ")
      .replace(/,\s*,/g, ",")
      .trim();
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
      : `=== DONNÉES DVF INDISPONIBLES — MODE FALLBACK INTELLIGENT ACTIVÉ ===
Raison technique : ${dvfError || dvfData?.message || dvfData?.error || "Aucune transaction DVF trouvée pour cette parcelle exacte"}

Tu dois IMPÉRATIVEMENT produire une analyse complète en mode estimation :
- Élargis automatiquement le périmètre (rayon parcelle → quartier → ville → région).
- Utilise tes connaissances du marché immobilier français 2024-2025 pour la zone "${adresse}" / secteur "${secteur || 'non précisé'}".
- Estime prix au m² avec une fourchette réaliste cohérente avec la ville/région concernée.
- Calcule TOUS les scores (opportunité, risque) en t'appuyant sur : attractivité connue de la zone, dynamique régionale, typologie urbaine/rurale, tendances générales.
- Marque fraicheur_donnees = "Mode estimation - fiabilité moyenne (pas de DVF spécifique)".
- Sources alternatives à citer : "Estimations marché secteur", "Tendances marché immobilier France", "Connaissance zone".
- INTERDIT d'écrire "donnée indisponible" ou de laisser un champ vide. Formule plutôt : "estimation basée sur données de zone (fiabilité moyenne)".`;

    let contextePrevious = "";
    if (previousAnalysis && previousDate) {
      const daysAgo = Math.max(1, Math.round((Date.now() - new Date(previousDate).getTime()) / 86400000));
      contextePrevious = `\n\n=== ANALYSE PRÉCÉDENTE DE CETTE ZONE (il y a ${daysAgo} jours) ===
Score opportunité précédent : ${previousAnalysis.score_opportunite ?? "?"}/100
Score risque précédent : ${previousAnalysis.score_risque ?? "?"}/100
Prix/m² précédent : ${previousAnalysis.prix_m2_moyen ?? "?"}
Tendance précédente : ${previousAnalysis.tendance ?? "?"}
Synthèse précédente : ${previousAnalysis.analyse_strategique?.resume_marche?.slice(0, 400) || previousAnalysis.strategie?.slice(0, 400) || "—"}

INSTRUCTION : Compare ta nouvelle analyse avec la précédente. Dans ton champ "evolution_depuis_derniere", indique en 2-3 phrases ce qui a changé (prix, tension, opportunités nouvelles, risques apparus/disparus). Si tu n'as pas de nouvelles données DVF différentes, indique-le honnêtement et concentre-toi sur les évolutions stratégiques observables.`;
    }

    const userPrompt = `Analyse cette zone de prospection immobilière :
- Adresse / Quartier : ${adresse}
- Secteur ciblé : ${secteur}

${contexteDVF}${contextePrevious}

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
                score_vendeur: { type: "number", description: "Score 0-100 de probabilité de présence de vendeurs potentiels (signaux : baisse prix, faible liquidité, délais longs, dispersion, biens fragiles)" },
                confiance_vendeur: { type: "string", enum: ["faible", "moyenne", "élevée"] },
                signaux_vendeurs: { type: "array", items: { type: "string" }, description: "Signaux marché détectés (JAMAIS nominatifs)" },
                micro_secteurs: {
                  type: "array",
                  description: "3-5 micro-secteurs prioritaires (rues, quartiers, zones homogènes)",
                  items: {
                    type: "object",
                    properties: {
                      nom: { type: "string" },
                      niveau_opportunite: { type: "string", enum: ["élevé", "moyen", "faible"] },
                      justification: { type: "string" },
                    },
                    required: ["nom", "niveau_opportunite", "justification"],
                    additionalProperties: false,
                  },
                },
                profils_vendeurs_probables: {
                  type: "array",
                  description: "Profils-types (typologie + situation probable, JAMAIS nominatif)",
                  items: {
                    type: "object",
                    properties: {
                      type_bien: { type: "string" },
                      situation_probable: { type: "string" },
                      argument_approche: { type: "string" },
                    },
                    required: ["type_bien", "situation_probable", "argument_approche"],
                    additionalProperties: false,
                  },
                },
                evolution_depuis_derniere: { type: "string", description: "Si analyse précédente fournie, décrit en 2-3 phrases ce qui a changé. Sinon, chaîne vide." },
              },
              required: ["prix_m2_moyen", "tendance", "nb_biens_estimes", "delai_vente", "volume_ventes", "liquidite", "score_opportunite", "score_risque", "classification", "niveau_global", "justification_score", "analyse_strategique", "opportunites", "risques", "plan_action", "strategie", "fraicheur_donnees", "sources", "score_vendeur", "confiance_vendeur", "signaux_vendeurs", "micro_secteurs", "profils_vendeurs_probables"],
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
