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

const isWeakScrape = (text: string) => {
  const t = (text || "").toLowerCase();
  return text.trim().length < 700 || /(log in|login|sign up|créez un compte|connectez-vous|page isn.?t available|content unavailable|captcha)/i.test(t);
};

const compact = (value: unknown, max = 4000) => String(value || "").replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);

const firecrawlPost = async (apiKey: string, path: string, body: Record<string, unknown>, timeoutMs = 30000) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://api.firecrawl.dev/v2/${path}`, {
      method: "POST",
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json };
  } finally {
    clearTimeout(t);
  }
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

    // 1. Scrape la page de profil + recherche web complémentaire (Firecrawl)
    let scrapedMarkdown = "";
    let scrapedMeta: any = {};
    let scrapedLinks: string[] = [];
    let searchEvidence: any[] = [];
    let scrapeStatus: "ok" | "timeout" | "skipped" | "error" = "skipped";
    const handleMatch = url.match(/(?:@|\/)([\w.\-]{2,40})(?:\/|\?|$)/);
    const handle = handleMatch ? handleMatch[1].replace(/^@/, "") : "";
    if (FIRECRAWL_API_KEY) {
      try {
        const profile = await firecrawlPost(FIRECRAWL_API_KEY, "scrape", {
          url,
          formats: ["markdown", "summary", "links", "html"],
          onlyMainContent: false,
          waitFor: 6000,
          location: { country: "FR", languages: ["fr", "en"] },
        });
        const fcJson = profile.json;
        if (profile.ok) {
          const md = fcJson.markdown || fcJson.data?.markdown || fcJson.summary || fcJson.data?.summary || "";
          const htmlFallback = compact((fcJson.html || fcJson.data?.html || "").replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "), 6000);
          scrapedMarkdown = (isWeakScrape(md) && htmlFallback ? `${md}\n\nHTML visible extrait :\n${htmlFallback}` : md).slice(0, 12000);
          scrapedMeta = fcJson.metadata || fcJson.data?.metadata || {};
          scrapedLinks = (fcJson.links || fcJson.data?.links || []).slice(0, 25);
          scrapeStatus = isWeakScrape(scrapedMarkdown) ? "error" : "ok";
        } else {
          scrapeStatus = "error";
        }

        if (handle && isWeakScrape(scrapedMarkdown)) {
          const queries = [
            `site:instagram.com/${handle} ${handle}`,
            `"${handle}" Instagram agent immobilier`,
            `"${handle}" immobilier`,
          ];
          for (const query of queries) {
            const s = await firecrawlPost(FIRECRAWL_API_KEY, "search", {
              query,
              limit: 5,
              lang: "fr",
              country: "FR",
              scrapeOptions: { formats: ["markdown"] },
            }, 20000);
            const results = Array.isArray(s.json?.data) ? s.json.data : Array.isArray(s.json?.web) ? s.json.web : [];
            searchEvidence.push(...results.slice(0, 5).map((r: any) => ({
              title: r.title,
              url: r.url,
              description: r.description,
              markdown: compact(r.markdown, 1800),
            })));
          }
          if (searchEvidence.length) scrapeStatus = "ok";
        }
      } catch (e: any) {
        scrapeStatus = e?.name === "AbortError" ? "timeout" : "error";
        console.warn("Firecrawl failed:", scrapeStatus, e?.message);
      }
    }

    // 3. Appeler Lovable AI pour l'audit complet
    const systemPrompt = `Tu es un consultant senior en stratégie de contenu et social media pour des agents immobiliers français. Tu produis des audits ${platMeta.name} professionnels, lucides, ultra-actionnables.

Règle critique : tu notes le COMPTE observé, pas la qualité du scraping. Si les données directes Instagram sont limitées mais que la recherche web/métadonnées donne des indices positifs (bio claire, posts visibles, positionnement, immobilier, cohérence), tu ne dois pas pénaliser mécaniquement à 30/100. Tu dois distinguer "données non observables" et "compte faible". Ne jamais inventer de chiffres précis absents ; indique "non disponible".

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

Statut extraction : ${scrapeStatus}
Liens détectés : ${scrapedLinks.slice(0, 10).join(" | ") || "non disponibles"}

Contenu scrapé de la page de profil :
"""
${scrapedMarkdown || "(scraping non disponible — base ton audit sur l'URL/handle et les bonnes pratiques générales de la plateforme pour un agent immobilier)"}
"""

Éléments complémentaires trouvés via recherche web :
${JSON.stringify(searchEvidence).slice(0, 9000) || "[]"}

Produis un audit complet, lucide et actionnable pour un agent immobilier qui veut générer plus de mandats via cette plateforme. Si les données d'engagement exactes ne sont pas disponibles, analyse quand même la bio, le positionnement, les contenus visibles, les résultats de recherche et la cohérence commerciale.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
      body: JSON.stringify({
        model: "openai/gpt-5.4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
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
      profil_data: { url, plateforme: platKey, scraped_at: new Date().toISOString(), scrape_status: scrapeStatus, meta: scrapedMeta, links: scrapedLinks, search_evidence: searchEvidence.slice(0, 8), excerpt: scrapedMarkdown.slice(0, 2000) },
      metrics: analyse.metrics || {},
      score_global: typeof analyse.score_global === "number" ? analyse.score_global : 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message || "Erreur serveur" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
