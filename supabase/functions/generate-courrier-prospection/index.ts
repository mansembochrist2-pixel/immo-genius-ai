import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { consumeAiCredit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es un agent immobilier français senior qui rédige un courrier de prospection vendeur ULTRA personnalisé.

RÈGLES ABSOLUES :
- Tu cites OBLIGATOIREMENT 2 à 3 vraies ventes récentes fournies (adresse, surface, prix, date) — JAMAIS de chiffres inventés.
- Ton chaleureux, professionnel, humain. PAS de jargon corporate. PAS de "synergies", "value proposition", "leveraging".
- Adresse-toi directement au propriétaire ("Bonjour,").
- Structure : accroche locale concrète (1 phrase) → preuve de marché chiffrée (les ventes) → bénéfice clair pour lui (estimation offerte, valeur réelle) → call-to-action simple (un rendez-vous, un appel).
- 180-250 mots maximum. Format courrier papier (paragraphes courts, aérés).
- INTERDIT d'écrire "votre bien situé au [adresse]" en formule générique — utilise vraiment l'adresse fournie.
- Aucune mention d'agence (signature laissée vide pour l'agent).

Utilise OBLIGATOIREMENT la fonction generer_courrier.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await authClient.auth.getClaims(token);
    if (authError || !authData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = authData.claims.sub;

    const rl = await consumeAiCredit(userId, "generate-courrier-prospection");
    if (!rl.ok) {
      const headers: Record<string, string> = { ...corsHeaders, "Content-Type": "application/json" };
      if (rl.retry_after_seconds) headers["Retry-After"] = String(rl.retry_after_seconds);
      return new Response(JSON.stringify({ error: rl.error }), { status: rl.status, headers });
    }

    const {
      adresse_cible,
      type_bien,
      situation_probable,
      angle_approche,
      ventes_recentes = [],
      prix_m2_median,
      ville,
      signaux_vendeurs = [],
    } = await req.json();

    if (!adresse_cible) {
      return new Response(JSON.stringify({ error: "adresse_cible requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY non configurée");

    const ventesTxt = (ventes_recentes as any[])
      .slice(0, 5)
      .map(
        (v, i) =>
          `${i + 1}. ${v.adresse_numero || ""} ${v.adresse_nom_voie || v.adresse || ""} — ${v.type_local || "bien"} ${v.surface_reelle_bati || v.surface || "?"}m² — vendu ${v.valeur_fonciere || v.prix_total || "?"}€ (${v.prix_m2 || "?"}€/m²) le ${v.date_mutation || v.date || "?"}`,
      )
      .join("\n") || "Aucune vente récente fournie";

    const userPrompt = `Rédige un courrier de prospection pour cette cible :

BIEN CIBLE : ${adresse_cible}
VILLE : ${ville || "—"}
TYPE PROBABLE : ${type_bien || "appartement / maison"}
SITUATION PROBABLE DU PROPRIETAIRE : ${situation_probable || "Non précisée — angle marché général"}
ANGLE D'APPROCHE SUGGERE : ${angle_approche || "Estimation offerte, marché actif"}

PRIX MEDIAN AU M² DU SECTEUR : ${prix_m2_median ? `${prix_m2_median} €/m²` : "non disponible"}

SIGNAUX DE MARCHE : ${signaux_vendeurs.join(" · ") || "—"}

VENTES RECENTES REELLES A CITER (DVF / Etalab) :
${ventesTxt}

Rédige le courrier en citant 2-3 de ces ventes nominativement.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-5.2",
        max_completion_tokens: 2000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generer_courrier",
              description: "Génère un courrier de prospection vendeur personnalisé avec données DVF",
              parameters: {
                type: "object",
                properties: {
                  objet: { type: "string", description: "Objet du courrier (1 ligne percutante)" },
                  courrier: { type: "string", description: "Texte intégral du courrier, format papier, paragraphes aérés" },
                  ventes_citees: {
                    type: "array",
                    items: { type: "string" },
                    description: "Les 2-3 ventes effectivement citées dans le courrier",
                  },
                },
                required: ["objet", "courrier", "ventes_citees"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generer_courrier" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "L'IA n'a pas généré de courrier" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-courrier-prospection error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
