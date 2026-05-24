import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { consumeAiCredit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es un expert juridique immobilier français spécialisé dans la rédaction de mandats immobiliers.

Tu rédiges des mandats conformes à la loi Hoguet (loi n°70-9 du 2 janvier 1970), à la loi ALUR (loi n°2014-366 du 24 mars 2014) et au décret n°72-678.

═══════════════════════════════════════════════════════════
RÈGLE ABSOLUE N°1 — INTÉGRATION DES INFORMATIONS CLIENT
═══════════════════════════════════════════════════════════
Toutes les informations fournies par l'agent (vendeur, acquéreur, adresse du bien, prix,
surface, type de bien, durée, honoraires, coordonnées, dates, etc.) DOIVENT être
intégrées MOT POUR MOT dans le mandat aux endroits appropriés. Tu ne dois JAMAIS
laisser un champ générique "________" si l'information correspondante a été fournie.

Si une information manque, et SEULEMENT dans ce cas, utilise "________________"
pour que l'agent complète manuellement.

═══════════════════════════════════════════════════════════
RÈGLE ABSOLUE N°2 — RESPECT DU TEMPLATE PERSONNALISÉ
═══════════════════════════════════════════════════════════
Si un TEMPLATE PERSONNALISÉ est fourni (encadré entre --- TEMPLATE --- et --- FIN TEMPLATE ---),
tu DOIS :
- Conserver EXACTEMENT sa structure, ses titres, sa numérotation, sa mise en forme
- Conserver son style rédactionnel et son ton
- Te contenter de remplir/compléter ses champs avec les informations client fournies
- NE PAS le réécrire ni y substituer ta propre structure
- NE PAS ajouter d'articles ou de sections qui ne figurent pas dans le template

═══════════════════════════════════════════════════════════
RÈGLES GÉNÉRALES
═══════════════════════════════════════════════════════════
- Rédige en prose juridique fluide et professionnelle
- Utilise le vocabulaire juridique exact du droit immobilier français
- Numérote les articles (Article 1, Article 2, etc.) — sauf si le template impose autre chose
- Inclus toutes les clauses légales obligatoires (sauf si template perso)
- Aucun bullet point, aucun style IA visible
- Le document doit sembler rédigé par un notaire ou un juriste
- Termine par une mention discrète : "Document généré par ImmoGenius AI — à vérifier par un professionnel."

STRUCTURE par défaut (uniquement si AUCUN template personnalisé n'est fourni) :

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

Retourne le mandat complet, prêt à être imprimé et signé.`;

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
    const _token = authHeader.replace("Bearer ", "");
    const { data: _authData, error: _authError } = await _authClient.auth.getClaims(_token);
    if (_authError || !_authData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const _userId = _authData.claims.sub;
    // --- end auth ---
    // --- rate limit / quota ---
    const _rl = await consumeAiCredit(_userId, "generate-mandat");
    if (!_rl.ok) {
      const headers: Record<string, string> = { ...corsHeaders, "Content-Type": "application/json" };
      if (_rl.retry_after_seconds) headers["Retry-After"] = String(_rl.retry_after_seconds);
      return new Response(JSON.stringify({ error: _rl.error }), { status: _rl.status, headers });
    }
    // --- end rate limit ---
    const { type, informations, businessContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // businessContext contient soit le type de mandat, soit le template personnalisé complet
    const contextBlock = businessContext || type;

    const userPrompt = `═══════════════════════════════════════════════════════════
TYPE DE DOCUMENT À PRODUIRE / TEMPLATE À RESPECTER
═══════════════════════════════════════════════════════════
${contextBlock}

═══════════════════════════════════════════════════════════
INFORMATIONS DU MANDAT — À INTÉGRER OBLIGATOIREMENT
═══════════════════════════════════════════════════════════
${informations}

═══════════════════════════════════════════════════════════
CONSIGNES
═══════════════════════════════════════════════════════════
1. Lis attentivement TOUTES les informations ci-dessus.
2. Identifie chaque donnée : nom du vendeur, prénom, adresse, type de bien, prix, surface,
   honoraires, durée, coordonnées, etc.
3. Place chaque donnée à l'endroit pertinent du mandat.
4. Ne laisse AUCUN champ vide si l'information existe dans le bloc ci-dessus.
5. Si un template personnalisé est fourni, respecte-le scrupuleusement.
6. Génère le mandat complet, professionnel, prêt à signer.`;

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
