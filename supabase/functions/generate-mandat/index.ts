import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es un expert juridique immobilier français spécialisé dans la rédaction de mandats immobiliers.

Tu rédiges des mandats conformes à la loi Hoguet (loi n°70-9 du 2 janvier 1970), à la loi ALUR (loi n°2014-366 du 24 mars 2014) et au décret n°72-678.

RÈGLES ABSOLUES :
- Rédige en prose juridique fluide et professionnelle
- Utilise le vocabulaire juridique exact du droit immobilier français
- Numérote les articles (Article 1, Article 2, etc.)
- Inclus toutes les clauses légales obligatoires
- Aucun bullet point, aucun style IA visible
- Le document doit sembler rédigé par un notaire ou un juriste
- Ajoute "Généré par Estate AI" en petit en bas du document
- Remplis les informations fournies par l'agent, laisse les champs manquants avec des espaces à compléter : "________________"

STRUCTURE selon le type de mandat :

Pour un MANDAT DE VENTE EXCLUSIF :
- En-tête : "MANDAT DE VENTE EXCLUSIF" centré
- Préambule avec identification des parties (mandant/mandataire)
- Article 1 : Objet du mandat — désignation du bien
- Article 2 : Prix de vente — prix net vendeur et honoraires
- Article 3 : Durée du mandat — durée irrévocable et tacite reconduction
- Article 4 : Clause d'exclusivité (conformément à l'article 6 de la loi Hoguet)
- Article 5 : Obligations du mandataire
- Article 6 : Obligations du mandant
- Article 7 : Rémunération — montant ou pourcentage TTC
- Article 8 : Clause pénale
- Article 9 : Diagnostics obligatoires (DPE, amiante, plomb, etc.)
- Article 10 : Droit de rétractation (14 jours si démarchage)
- Article 11 : Protection des données personnelles (RGPD)
- Article 12 : Loi applicable et juridiction compétente
- Signatures : Fait en deux exemplaires, date, signatures

Pour un MANDAT DE VENTE SIMPLE :
- Même structure sans la clause d'exclusivité (Article 4 adapté)

Pour un MANDAT DE RECHERCHE ACQUÉREUR :
- Adapter les articles pour la recherche de biens
- Critères de recherche du mandant
- Obligations spécifiques à la recherche

Retourne le mandat complet en texte structuré.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { type, informations } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const userPrompt = `Génère un ${type} complet avec les informations suivantes :

${informations}

Rédige le mandat complet, professionnel, conforme à la législation française en vigueur.`;

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
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-mandat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
