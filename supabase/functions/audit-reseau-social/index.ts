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

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const normalizeUrl = (raw: string) => {
  try {
    const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    return new URL(candidate).toString();
  } catch {
    return raw;
  }
};

const decodeHtml = (value: string) => value
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">");

const extractHandleFromUrl = (raw: string, platform: string) => {
  try {
    const u = new URL(normalizeUrl(raw));
    const host = u.hostname.replace(/^www\./, "");
    const parts = u.pathname.split("/").filter(Boolean).map(p => p.replace(/^@/, ""));
    if (platform === "instagram" && host.includes("instagram.com")) {
      const reserved = new Set(["p", "reel", "reels", "stories", "explore", "accounts", "direct"]);
      return parts.find(p => !reserved.has(p.toLowerCase())) || "";
    }
    if (platform === "tiktok" && host.includes("tiktok.com")) return parts.find(p => p) || "";
    if (platform === "linkedin" && host.includes("linkedin.com")) return parts.slice(0, 2).join("/") || "";
    if (platform === "facebook" && host.includes("facebook.com")) {
      const reserved = new Set(["profile.php", "pages", "groups", "events"]);
      return parts.find(p => !reserved.has(p.toLowerCase())) || "";
    }
  } catch { /* fallback below */ }
  const fallback = raw.match(/(?:@|\/)([\w.\-]{2,40})(?:\/|\?|$)/);
  return fallback ? fallback[1].replace(/^@/, "") : "";
};

const metaFromHtml = (html: string) => {
  const meta: Record<string, string> = {};
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (title) meta.title = decodeHtml(title.replace(/<[^>]+>/g, " ").trim());
  const tags = html.match(/<meta\s+[^>]*>/gi) || [];
  for (const tag of tags) {
    const key = tag.match(/\b(?:property|name)=["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const content = tag.match(/\bcontent=["']([^"']*)["']/i)?.[1];
    if (key && content) meta[key] = decodeHtml(content.trim());
  }
  return meta;
};

const fetchText = async (targetUrl: string, timeoutMs = 14000) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(targetUrl, {
      signal: ctrl.signal,
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8" },
    });
    const text = await res.text().catch(() => "");
    return { ok: res.ok, status: res.status, text };
  } catch (e: any) {
    return { ok: false, status: 0, text: "", error: e?.message || "fetch failed" };
  } finally {
    clearTimeout(t);
  }
};

const fetchInstagramProfile = async (handle: string) => {
  if (!handle) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 14000);
  try {
    const apiUrl = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`;
    const res = await fetch(apiUrl, {
      signal: ctrl.signal,
      headers: {
        "User-Agent": USER_AGENT,
        "X-IG-App-ID": "936619743392459",
        "Accept": "application/json,text/plain,*/*",
        "Referer": `https://www.instagram.com/${handle}/`,
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return { status: "error", http_status: res.status, error: json?.message || "Instagram a refusé l'accès public" };
    const user = json?.data?.user || json?.user;
    if (!user) return { status: "empty", http_status: res.status, error: "Profil Instagram non trouvé dans la réponse" };
    const mediaEdges = user.edge_owner_to_timeline_media?.edges || [];
    return {
      status: "ok",
      username: user.username,
      full_name: user.full_name,
      biography: user.biography,
      category_name: user.category_name,
      is_verified: Boolean(user.is_verified),
      is_private: Boolean(user.is_private),
      external_url: user.external_url,
      followers: user.edge_followed_by?.count ?? user.follower_count ?? null,
      following: user.edge_follow?.count ?? user.following_count ?? null,
      posts_count: user.edge_owner_to_timeline_media?.count ?? user.media_count ?? null,
      recent_posts: mediaEdges.slice(0, 9).map((edge: any) => {
        const n = edge.node || edge;
        return {
          shortcode: n.shortcode,
          caption: compact(n.edge_media_to_caption?.edges?.[0]?.node?.text || n.caption?.text || "", 700),
          likes: n.edge_liked_by?.count ?? n.like_count ?? null,
          comments: n.edge_media_to_comment?.count ?? n.comment_count ?? null,
          timestamp: n.taken_at_timestamp ? new Date(n.taken_at_timestamp * 1000).toISOString() : null,
          is_video: Boolean(n.is_video),
        };
      }),
    };
  } catch (e: any) {
    return { status: e?.name === "AbortError" ? "timeout" : "error", error: e?.message || "Instagram profile fetch failed" };
  } finally {
    clearTimeout(t);
  }
};

const fetchTikTokProfile = async (handle: string) => {
  if (!handle) return null;
  const clean = handle.replace(/^@/, "");
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 14000);
  try {
    const res = await fetch(`https://www.tiktok.com/@${encodeURIComponent(clean)}`, {
      signal: ctrl.signal,
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8" },
    });
    const html = await res.text().catch(() => "");
    if (!html) return { status: "error", platform: "tiktok", http_status: res.status, error: "Réponse TikTok vide" };
    const m = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) return { status: "empty", platform: "tiktok", http_status: res.status, error: "Données TikTok introuvables" };
    let data: any = {};
    try { data = JSON.parse(m[1]); } catch { return { status: "error", platform: "tiktok", error: "Parsing TikTok échoué" }; }
    const userDetail = data?.__DEFAULT_SCOPE__?.["webapp.user-detail"];
    const user = userDetail?.userInfo?.user;
    const stats = userDetail?.userInfo?.stats || userDetail?.userInfo?.statsV2;
    if (!user) return { status: "empty", platform: "tiktok", error: "Profil TikTok introuvable" };
    const itemList = data?.__DEFAULT_SCOPE__?.["webapp.user-post"]?.itemList || [];
    return {
      status: "ok",
      platform: "tiktok",
      username: user.uniqueId,
      full_name: user.nickname,
      biography: user.signature,
      is_verified: Boolean(user.verified),
      is_private: Boolean(user.privateAccount),
      followers: Number(stats?.followerCount ?? 0) || null,
      following: Number(stats?.followingCount ?? 0) || null,
      posts_count: Number(stats?.videoCount ?? 0) || null,
      total_likes: Number(stats?.heartCount ?? stats?.heart ?? 0) || null,
      recent_posts: itemList.slice(0, 9).map((it: any) => ({
        id: it.id,
        caption: compact(it.desc, 500),
        likes: it.stats?.diggCount ?? null,
        comments: it.stats?.commentCount ?? null,
        shares: it.stats?.shareCount ?? null,
        plays: it.stats?.playCount ?? null,
        timestamp: it.createTime ? new Date(it.createTime * 1000).toISOString() : null,
      })),
    };
  } catch (e: any) {
    return { status: e?.name === "AbortError" ? "timeout" : "error", platform: "tiktok", error: e?.message || "TikTok fetch failed" };
  } finally {
    clearTimeout(t);
  }
};

const fetchOpenGraphProfile = async (targetUrl: string, platform: string) => {
  const res = await fetchText(targetUrl, 14000);
  if (!res.text) return { status: "error", platform, error: res.error || "Pas de HTML" };
  const meta = metaFromHtml(res.text);
  const text = res.text
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
  const followersMatch = text.match(/([\d][\d\s.,kKmM]*)\s*(abonnés?|followers|j['']aime|likes|mentions j['']aime|relations)/i);
  return {
    status: (meta?.["og:title"] || meta?.title) ? "ok" : "partial",
    platform,
    http_status: res.status,
    full_name: meta?.["og:title"] || meta?.title || null,
    biography: meta?.["og:description"] || meta?.description || null,
    image: meta?.["og:image"] || null,
    external_url: meta?.["og:url"] || targetUrl,
    followers_text: followersMatch?.[0]?.trim() || null,
    html_excerpt: compact(text, 3500),
  };
};

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
    const _rl = await consumeAiCredit(_userId, "audit-reseau-social");
    if (!_rl.ok) {
      const headers: Record<string, string> = { ...corsHeaders, "Content-Type": "application/json" };
      if (_rl.retry_after_seconds) headers["Retry-After"] = String(_rl.retry_after_seconds);
      return new Response(JSON.stringify({ error: _rl.error }), { status: _rl.status, headers });
    }
    // --- end rate limit ---
    const { url, plateforme } = await req.json();
    if (!url || !plateforme) {
      return new Response(JSON.stringify({ error: "url et plateforme requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const normalizedUrl = normalizeUrl(String(url).trim());
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

    // 1. Collecte multi-sources : API publique Instagram quand possible, HTML direct, Firecrawl scrape puis recherche web.
    let scrapedMarkdown = "";
    let scrapedMeta: any = {};
    let scrapedLinks: string[] = [];
    let searchEvidence: any[] = [];
    let directProfileData: any = null;
    let htmlEvidence = "";
    let scrapeStatus: "ok" | "timeout" | "skipped" | "error" = "skipped";
    const handle = extractHandleFromUrl(normalizedUrl, platKey);

    if (platKey === "instagram" && handle) {
      directProfileData = await fetchInstagramProfile(handle);
      if (directProfileData?.status === "ok") scrapeStatus = "ok";
    } else if (platKey === "tiktok" && handle) {
      directProfileData = await fetchTikTokProfile(handle);
      if (directProfileData?.status === "ok") scrapeStatus = "ok";
    } else if ((platKey === "facebook" || platKey === "linkedin") && handle) {
      directProfileData = await fetchOpenGraphProfile(normalizedUrl, platKey);
      if (directProfileData?.status === "ok") scrapeStatus = "ok";
    }

    const htmlFetch = await fetchText(normalizedUrl);
    if (htmlFetch.text) {
      scrapedMeta = { ...metaFromHtml(htmlFetch.text), ...scrapedMeta };
      htmlEvidence = compact(htmlFetch.text
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " "), 5000);
      if (!isWeakScrape(htmlEvidence)) scrapeStatus = "ok";
    }

    if (FIRECRAWL_API_KEY) {
      try {
        const profile = await firecrawlPost(FIRECRAWL_API_KEY, "scrape", {
          url: normalizedUrl,
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
          scrapedMeta = { ...scrapedMeta, ...(fcJson.metadata || fcJson.data?.metadata || {}) };
          scrapedLinks = (fcJson.links || fcJson.data?.links || []).slice(0, 25);
          if (!isWeakScrape(scrapedMarkdown)) scrapeStatus = "ok";
        } else {
          if (scrapeStatus !== "ok") scrapeStatus = "error";
        }

        if (handle && (scrapeStatus !== "ok" || isWeakScrape(scrapedMarkdown))) {
          const domainMap: Record<string, string> = { instagram: "instagram.com", facebook: "facebook.com", tiktok: "tiktok.com", linkedin: "linkedin.com" };
          const queries = [
            `site:${domainMap[platKey] || platKey + ".com"} ${handle}`,
            `"${handle}" "${platMeta.name}" immobilier`,
            `"${handle}" agent immobilier`,
            `"${handle}" real estate`,
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

Important : quand "Données directes plateforme" contient biography, followers, posts_count ou recent_posts, ces données sont prioritaires sur Firecrawl. Tu dois les exploiter explicitement dans la synthèse, le scoring et les recommandations.

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
URL : ${normalizedUrl}
Handle détecté : ${handle || "inconnu"}
Métadonnées : ${JSON.stringify(scrapedMeta).slice(0, 1500)}

Statut extraction : ${scrapeStatus}
Liens détectés : ${scrapedLinks.slice(0, 10).join(" | ") || "non disponibles"}

Données directes plateforme / API publique / HTML :
${JSON.stringify({ directProfileData, htmlEvidence: htmlEvidence.slice(0, 3500) }).slice(0, 8500)}

Contenu scrapé de la page de profil :
"""
${scrapedMarkdown || htmlEvidence || "(scraping non disponible — base ton audit sur l'URL/handle et les bonnes pratiques générales de la plateforme pour un agent immobilier)"}
"""

Éléments complémentaires trouvés via recherche web :
${JSON.stringify(searchEvidence).slice(0, 9000) || "[]"}

Produis un audit complet, lucide et actionnable pour un agent immobilier qui veut générer plus de mandats via cette plateforme. Si les données d'engagement exactes ne sont pas disponibles, analyse quand même la bio, le positionnement, les contenus visibles, les résultats de recherche et la cohérence commerciale.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": LOVABLE_API_KEY },
      body: JSON.stringify({
        model: "openai/gpt-5.4",
        max_completion_tokens: 2000,
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
      profil_data: { url: normalizedUrl, plateforme: platKey, handle, scraped_at: new Date().toISOString(), scrape_status: scrapeStatus, direct_profile: directProfileData, meta: scrapedMeta, links: scrapedLinks, search_evidence: searchEvidence.slice(0, 8), excerpt: (scrapedMarkdown || htmlEvidence).slice(0, 2000) },
      metrics: analyse.metrics || {},
      score_global: typeof analyse.score_global === "number" ? analyse.score_global : 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message || "Erreur serveur" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
