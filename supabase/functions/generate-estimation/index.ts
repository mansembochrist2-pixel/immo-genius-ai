import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es un expert immobilier senior spécialisé dans l'estimation de biens immobiliers en France.

Tu rédiges des rapports d'estimation professionnels basés sur les données du marché (DVF Étalab, données.gouv.fr, observatoires locaux, INSEE).

RÈGLES ABSOLUES :
- Rédige en prose fluide, professionnelle et humaine
- Zéro bullet point dans tout le document
- Le texte doit sembler écrit par un expert immobilier senior
- Jamais de tournures typiquement IA
- Cite les sources de données utilisées
- Sois précis sur les chiffres et les comparaisons

Tu dois retourner un JSON avec cette structure exacte :
{
  "prix_min": number,
  "prix_moyen": number, 
  "prix_max": number,
  "prix_m2_secteur": number,
  "comparaison_quartier": "texte",
  "historique_ventes": "texte décrivant les ventes récentes similaires",
  "tendance_12_mois": "texte avec pourcentage",
  "recommandation_prix": number,
  "argumentaire_prix": "texte long justifiant le prix recommandé",
  "analyse_marche": "texte long d'analyse du marché local",
  "methode_estimation": "texte expliquant la méthode utilisée",
  "conclusion": "texte de conclusion et recommandation de mise en vente"
}`;

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
    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { adresse, surface, pieces, etage, etat, dpe, annee_construction, parking, cave, balcon } = body;

    const userPrompt = `Estime ce bien immobilier :
- Adresse : ${adresse}
- Surface : ${surface} m²
- Nombre de pièces : ${pieces}
- Étage : ${etage || "Non précisé"}
- État général : ${etat || "Non précisé"}
- DPE : ${dpe || "Non précisé"}
- Année de construction : ${annee_construction || "Non précisée"}
- Parking : ${parking ? "Oui" : "Non"}
- Cave : ${cave ? "Oui" : "Non"}
- Balcon/Terrasse : ${balcon ? "Oui" : "Non"}

Fournis une estimation détaillée basée sur les données DVF, INSEE et les observatoires locaux.
Retourne uniquement le JSON demandé, sans markdown ni backticks.`;

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
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("Erreur du service IA");
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

    try {
      const estimation = JSON.parse(content);
      return new Response(JSON.stringify(estimation), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ error: "Format de réponse IA invalide", raw: content }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (e) {
    console.error("generate-estimation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
