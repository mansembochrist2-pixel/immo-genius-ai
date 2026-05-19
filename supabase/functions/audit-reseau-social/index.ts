// Audit IA d'un compte de réseau social : scrape via Firecrawl + analyse Lovable AI
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PLATFORM_HINTS: Record<string, { name: string; conseils: string }> = {
  instagram: { name: "Instagram", conseils: "Reels, carrousels, hooks visuels, bio, highlights, hashtags géolocalisés, cohérence du feed." },
  facebook: { name: "Facebook", conseils: "Posts longs, vidéos natives, groupe, page Pro, avis, événements, audience locale." },
  tiktok: { name: "TikTok", conseils: "Hook 3 premières secondes, sons tendance, format vertical natif, voix off, sous-titres, fréquence." },
  linkedin: { name: "LinkedIn", conseils: "Posts d'expertise, storytelling pro, carrousels PDF, autorité, headline, recommandations, réseau local." },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url, plateforme } = await req.json();
    if (!url || !plateforme) {
      return new Response(JSON.stringify({ error: "url et plateforme requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const platKey = String(plateforme).toLowerCase();
    const platMeta = PLATFORM_HINTS[platKey];
    if (!platMeta) {
      return new Response(JSON.stringify({ error: "Plateforme non supportée" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY manquant" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1. Scrape la page de profil (Firecrawl si dispo, sinon best-effort)
    let scrapedMarkdown = "";
    let scrapedMeta: any = {};
    if (FIRECRAWL_API_KEY) {
      try {
        const fc = await fetch("https://api.firecrawl.dev/v2/scrape", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
            formats: ["markdown", "summary"],
            onlyMainContent: true,
            waitFor: 2500,
          }),
        });
        const fcJson = await fc.json().catch(() => ({}));
        if (fc.ok) {
          scrapedMarkdown = (fcJson.markdown || fcJson.data?.markdown || fcJson.summary || fcJson.data?.summary || "").slice(0, 12000);
          scrapedMeta = fcJson.metadata || fcJson.data?.metadata || {};
        }
      } catch (_e) { /* fallback to URL-only analysis */ }
    }

    // 2. Extraire le handle depuis l'URL
    const handleMatch = url.match(/(?:@|\/)([\w.\-]{2,40})(?:\/|\?|$)/);
    const handle = handleMatch ? handleMatch[1].replace(/^@/, "") : "";

    // 3. Appeler Lovable AI pour l'audit complet
    const systemPrompt = `Tu es un consultant senior en stratégie de contenu et social media pour des agents immobiliers français. Tu produis des audits ${platMeta.name} professionnels, lucides, ultra-actionnables. Tu ne fais JAMAIS de flatterie : tu pointes ce qui ne marche pas et donnes un plan concret. Ne JAMAIS inventer de chiffres précis (nombre d'abonnés, vues, engagement) que tu n'as pas dans les données ; si tu ne sais pas, dis "non disponible" dans les metrics et concentre-toi sur l'analyse qualitative observable.

Tu DOIS répondre UNIQUEMENT en JSON strict (sans balise markdown), au format suivant :
{
  "score_global": 0-100,
  "score_breakdown": {
    "branding": { "note": 0-100, "commentaire": "..." },
    "contenu": { "note": 0-100, "commentaire": "..." },
    "engagement": { "note": 0-100, "commentaire": "..." },
    "strategie": { "note": 0-100, "commentaire": "..." },
    "coherence": { "note": 0-100, "commentaire": "..." }
  },
  "metrics": { "abonnes": "ex: 1240 ou non disponible", "posts_recents": "...", "engagement_estime": "..." },
  "ce_qui_marche": ["...", "..."],
  "ce_qui_ne_marche_pas": ["...", "..."],
  "axes_amelioration": ["...", "..."],
  "plan_action_30j": [
    { "semaine": 1, "objectif": "...", "actions": ["...", "..."] },
    { "semaine": 2, "objectif": "...", "actions": ["..."] },
    { "semaine": 3, "objectif": "...", "actions": ["..."] },
    { "semaine": 4, "objectif": "...", "actions": ["..."] }
  ],
  "strategie_contenu": { "piliers": ["...", "..."], "formats_prioritaires": ["..."], "frequence_recommandee": "...", "hooks_exemples": ["...", "..."] },
  "ton_recommande": "...",
  "synthese": "Paragraphe de 4-6 phrases qui résume l'état du compte et la priorité absolue."
}

Spécificités plateforme : ${platMeta.conseils}`;

    const userPrompt = `Audit du compte ${platMeta.name} suivant :
URL : ${url}
Handle détecté : ${handle || "inconnu"}
Métadonnées : ${JSON.stringify(scrapedMeta).slice(0, 1500)}

Contenu scrapé de la page de profil :
"""
${scrapedMarkdown || "(scraping non disponible — base ton audit sur l'URL/handle et les bonnes pratiques générales de la plateforme pour un agent immobilier)"}
"""

Produis un audit complet, lucide et actionnable pour un agent immobilier qui veut générer plus de mandats via cette plateforme.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4,
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      const status = aiResp.status === 429 ? 429 : aiResp.status === 402 ? 402 : 500;
      return new Response(JSON.stringify({ error: `IA: ${errText.slice(0, 200)}` }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiJson = await aiResp.json();
    const content = aiJson.choices?.[0]?.message?.content || "{}";
    let analyse: any = {};
    try { analyse = JSON.parse(content); } catch { analyse = { raw: content, error: "Parsing JSON échoué" }; }

    return new Response(JSON.stringify({
      analyse,
      handle,
      profil_data: { url, plateforme: platKey, scraped_at: new Date().toISOString(), meta: scrapedMeta, excerpt: scrapedMarkdown.slice(0, 2000) },
      metrics: analyse.metrics || {},
      score_global: typeof analyse.score_global === "number" ? analyse.score_global : 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message || "Erreur serveur" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
