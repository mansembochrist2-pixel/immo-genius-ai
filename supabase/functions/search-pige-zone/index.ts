// Recherche RÉELLE d'annonces immobilières par zone (Firecrawl-first)
// Pipeline : Firecrawl Search → validation → extraction IA enrichie (contact + signaux marché + qualité)
//            → scoring détaillé pondéré → catégorisation → insert
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const j = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const isRealListingUrl = (url: string): boolean => {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname;
    const bad = /\/(recherche|search|annonces?\/?$|achat\/?$|ventes_immobilieres\/?$|liste|resultat|categories?)/i;
    if (bad.test(path)) return false;
    if (path === "/" || path.length < 6) return false;
    if (host.includes("leboncoin.fr")) return /\/ad\/ventes_immobilieres\/\d+/i.test(path) || /\/vi\/\d+/i.test(path);
    if (host.includes("seloger.com")) return /\d{4,}\.htm/i.test(path) || /\/annonces\/(achat|location|achat-de-prestige)\/.+\d+/i.test(path);
    if (host.includes("bienici.com")) return /\/annonce\/.+\/[a-z0-9-]+/i.test(path);
    if (host.includes("pap.fr")) return /\/annonces\/.+-r\d+/i.test(path) || /-h\d+/i.test(path);
    if (host.includes("logic-immo")) return /\/detail-/i.test(path);
    if (host.includes("orpi.com")) return /\/annonce/i.test(path);
    if (host.includes("century21.fr")) return /\/annonce/i.test(path);
    if (host.includes("laforet.com")) return /\/annonce/i.test(path) || /-\d{4,}/i.test(path);
    if (host.includes("guy-hoquet.com")) return /\/annonce/i.test(path) || /-\d{4,}/i.test(path);
    if (host.includes("lefigaro.fr")) return /\/annonces\/.+\/\d+/i.test(path) || /-\d{5,}\.html?$/i.test(path);
    if (host.includes("avendrealouer.fr")) return /\/vente\/.+\/.+\d+/i.test(path);
    if (host.includes("paruvendu.fr")) return /\/immobilier\/.+\d+/i.test(path) || /\/annonce\//i.test(path);
    if (host.includes("ouestfrance-immo.com")) return /\/(vente|immobilier-)/i.test(path) && /\d{4,}/.test(path);
    return false;
  } catch { return false; }
};

const sourceFromUrl = (url: string): string => {
  if (url.includes("leboncoin")) return "leboncoin";
  if (url.includes("seloger")) return "seloger";
  if (url.includes("bienici")) return "bienici";
  if (url.includes("pap.fr")) return "pap";
  if (url.includes("logic-immo")) return "logic-immo";
  if (url.includes("orpi")) return "orpi";
  if (url.includes("century21")) return "century21";
  if (url.includes("laforet")) return "laforet";
  if (url.includes("guy-hoquet")) return "guy-hoquet";
  if (url.includes("lefigaro")) return "figaro";
  if (url.includes("avendrealouer")) return "avendrealouer";
  if (url.includes("paruvendu")) return "paruvendu";
  if (url.includes("ouestfrance-immo")) return "ouestfrance";
  return "web";
};

type FcResult = {
  url: string;
  title?: string;
  description?: string;
  markdown?: string;
  image?: string;
  metadata?: { ogImage?: string; image?: string; sourceURL?: string; statusCode?: number };
};

const normalizeListingUrl = (url: string): string => {
  try {
    const u = new URL(url);
    u.hash = "";
    ["utm_source","utm_medium","utm_campaign","utm_content","utm_term","fbclid","gclid"].forEach(p => u.searchParams.delete(p));
    return u.toString();
  } catch { return url; }
};

const looksExpiredOrDead = (text: string): boolean =>
  /(annonce\s+(supprimée|désactivée|expirée|introuvable)|page\s+introuvable|404|not\s+found|n.?existe\s+plus|a été retirée)/i.test(text || "");

const extractImage = (result: Partial<FcResult>, candidate?: string | null): string | null => {
  const direct = candidate || result.image || result.metadata?.ogImage || result.metadata?.image;
  if (typeof direct === "string" && /^https?:\/\//i.test(direct)) return direct;
  const md = result.markdown || "";
  const m = md.match(/!\[[^\]]*\]\((https?:\/\/[^\s)]+\.(?:jpe?g|png|webp)(?:\?[^\s)]*)?)\)/i);
  if (m?.[1]) return m[1];
  const og = md.match(/og:image["']?\s*content=["'](https?:\/\/[^"']+)["']/i);
  return og?.[1] || null;
};

const extractAllImages = (md: string): string[] => {
  const urls = new Set<string>();
  const re = /!\[[^\]]*\]\((https?:\/\/[^\s)]+\.(?:jpe?g|png|webp)(?:\?[^\s)]*)?)\)/gi;
  let m;
  while ((m = re.exec(md || "")) !== null) urls.add(m[1]);
  return [...urls].slice(0, 8);
};

const numberFromText = (text: string, pattern: RegExp): number | null => {
  const m = text.match(pattern);
  if (!m?.[1]) return null;
  const value = Number(String(m[1]).replace(/[\s.,]/g, ""));
  return Number.isFinite(value) ? value : null;
};

// Extraction contact (RGPD-safe : uniquement ce que le vendeur a lui-même publié dans le texte)
const extractContact = (text: string) => {
  const tel = text.match(/(?:0|\+33\s?)[1-9](?:[\s.-]?\d{2}){4}/);
  const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return {
    telephone: tel ? tel[0].replace(/[\s.-]/g, "").replace(/^\+33/, "0") : null,
    email: email ? email[0] : null,
  };
};

const basicExtract = (src: FcResult, zone: string) => {
  const text = `${src.title || ""}\n${src.description || ""}\n${(src.markdown || "").slice(0, 1800)}`;
  return {
    titre: src.title || "Annonce immobilière détectée",
    prix: numberFromText(text, /(\d[\d\s.,]{4,})\s*€/i),
    surface: numberFromText(text, /(\d{2,4})\s*m\s*(?:²|2|ètres carrés)/i),
    pieces: numberFromText(text, /(\d{1,2})\s*(?:pièces|pieces|p\b)/i),
    ville: zone,
    code_postal: (text.match(/\b(0[1-9]|[1-8]\d|9[0-8])\d{3}\b/) || [])[0] || null,
    type_bien: /maison/i.test(text) ? "maison" : /terrain/i.test(text) ? "terrain" : "appartement",
    agence: /particulier/i.test(text) ? "Particulier" : null,
    description: src.description || null,
    photo: extractImage(src),
    quartier: null as string | null,
    etage: null as string | null,
  };
};

const normalizeZoneText = (value: unknown) => String(value || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[’']/g, " ")
  .replace(/\s+/g, " ")
  .trim();

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasPhrase = (text: string, phrase: string) => new RegExp(`(^|[^a-z0-9])${escapeRegex(phrase).replace(/\s+/g, "\\s+")}([^a-z0-9]|$)`, "i").test(text);

const parseSearchZone = (zone: string) => {
  const norm = normalizeZoneText(zone);
  const cp = norm.match(/\b(0[1-9]|[1-8]\d|9[0-8])\d{3}\b/)?.[0] || null;
  const cities: Record<string, { prefix: string; max: number }> = {
    paris: { prefix: "750", max: 20 },
    marseille: { prefix: "130", max: 16 },
    lyon: { prefix: "690", max: 9 },
  };
  const city = Object.keys(cities).find((c) => hasPhrase(norm, c));
  let arrondissement: { city: string; arr: number; cp: string } | null = null;
  if (city) {
    const cfg = cities[city];
    const cpArr = cp?.startsWith(cfg.prefix) ? Number(cp.slice(3)) : null;
    const typedArr = Number(norm.match(new RegExp(`\\b${city}\\s+(\\d{1,2})(?:e|eme|er)?\\b`))?.[1] || norm.match(/\b(\d{1,2})(?:e|eme|er)?\s*(?:arrondissement|arr\.?)/)?.[1] || 0);
    const arr = cpArr || typedArr;
    if (arr >= 1 && arr <= cfg.max) arrondissement = { city, arr, cp: `${cfg.prefix}${String(arr).padStart(2, "0")}` };
  }
  let cityName = arrondissement?.city || norm
    .replace(/\b(0[1-9]|[1-8]\d|9[0-8])\d{3}\b/g, " ")
    .replace(/\b\d{1,2}(?:e|eme|er)?\b/g, " ")
    .replace(/\b(a|au|aux|en|dans|sur|vente|immobilier|appartement|maison|centre|quartier|arrondissement|arr)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cityName === "cannet") cityName = "le cannet";
  const aliases = cityName === "le cannet" ? ["le cannet", "cannet"] : cityName ? [cityName] : [];
  return { norm, postalCode: arrondissement?.cp || cp, arrondissement, cityName, aliases };
};

const listingMatchesSearchZone = (candidate: any, src: FcResult, zone: string): boolean => {
  const target = parseSearchZone(zone);
  const adCp = String(candidate.code_postal || "").trim();
  const adVille = normalizeZoneText(candidate.ville);
  const haystack = normalizeZoneText([
    candidate.titre,
    candidate.description,
    candidate.adresse,
    candidate.quartier,
    candidate.ville,
    candidate.code_postal,
    src.title,
    src.description,
    (src.markdown || "").slice(0, 3000),
    src.url,
  ].filter(Boolean).join("\n"));

  if (target.arrondissement) {
    const { city, arr, cp } = target.arrondissement;
    if (adCp) return adCp === cp;
    const conflictingCp = haystack.match(new RegExp(`\\b${escapeRegex(cp.slice(0, 3))}(\\d{2})\\b`))?.[0];
    if (conflictingCp && conflictingCp !== cp) return false;
    const conflictingArr = haystack.match(new RegExp(`(^|[^a-z0-9])${escapeRegex(city)}\\s*(\\d{1,2})(?:e|eme|er)?([^a-z0-9]|$)`))?.[2];
    if (conflictingArr && Number(conflictingArr) !== arr) return false;
    const arrHit = hasPhrase(haystack, cp)
      || new RegExp(`(^|[^a-z0-9])${escapeRegex(city)}\\s*${arr}(?:e|eme|er)?([^a-z0-9]|$)`).test(haystack)
      || new RegExp(`(^|[^a-z0-9])${arr}(?:e|eme|er)?\\s*(?:arrondissement|arr\\.?)([^a-z0-9]|$)`).test(haystack);
    return (adVille === city || hasPhrase(haystack, city)) && arrHit;
  }
  if (target.postalCode) return adCp === target.postalCode || hasPhrase(haystack, target.postalCode);
  if (target.aliases.length > 0) {
    if (adVille) return target.aliases.some((alias) => adVille === alias);
    return target.aliases.some((alias) => hasPhrase(haystack, alias));
  }
  return false;
};

const categorize = (score: number): string => {
  if (score >= 75) return "top";
  if (score >= 50) return "moyenne";
  if (score >= 25) return "faible";
  return "surveiller";
};

type Criterion = { label: string; weight: number; status: "positive" | "negative" | "neutral"; detail: string };

const computeScore = (a: any, src: FcResult, signaux: any, qualite: any): { score: number; breakdown: Criterion[]; failles: string[]; opportunites: string[] } => {
  const breakdown: Criterion[] = [];
  const failles: string[] = [];
  const opportunites: string[] = [];
  let score = 40; // base

  const isParticulier = String(a.agence || "").toLowerCase().includes("particulier");
  if (isParticulier) {
    score += 30;
    breakdown.push({ label: "Vendeur particulier", weight: 30, status: "positive", detail: "Cible prioritaire pour conquérir un mandat." });
    opportunites.push("Vendeur particulier — fort potentiel de conversion en mandat");
  } else if (a.agence) {
    score -= 10;
    breakdown.push({ label: "Vendeur agence", weight: -10, status: "negative", detail: `Déjà confié à ${a.agence}.` });
  } else {
    breakdown.push({ label: "Statut vendeur", weight: 0, status: "neutral", detail: "Non identifié — à qualifier au téléphone." });
  }

  const descLen = (a.description || "").length;
  if (descLen > 0 && descLen < 120) {
    score += 12;
    breakdown.push({ label: "Description faible", weight: 12, status: "positive", detail: `${descLen} caractères — pitch de mise en valeur évident.` });
    failles.push("Description très courte — défaut de mise en valeur du bien");
  } else if (descLen >= 120) {
    breakdown.push({ label: "Description correcte", weight: 0, status: "neutral", detail: `${descLen} caractères.` });
  }

  const photoCount = qualite?.nb_photos || 0;
  if (photoCount === 0) {
    score += 8;
    breakdown.push({ label: "Aucune photo", weight: 8, status: "positive", detail: "Annonce non visuelle — argument fort." });
    failles.push("Aucune photo — annonce invisible sur le marché");
  } else if (photoCount < 4) {
    score += 6;
    breakdown.push({ label: "Peu de photos", weight: 6, status: "positive", detail: `${photoCount} photo(s) — manque de mise en valeur.` });
    failles.push(`Seulement ${photoCount} photo(s) — manque de mise en valeur professionnelle`);
  }

  if (a.prix && a.surface) {
    const prixM2 = a.prix / a.surface;
    if (prixM2 < 4500) {
      score += 8;
      breakdown.push({ label: "Prix sous marché", weight: 8, status: "positive", detail: `${Math.round(prixM2)} €/m² — bien valorisable.` });
      opportunites.push(`Prix au m² (${Math.round(prixM2)} €) potentiellement sous-évalué`);
    } else if (prixM2 > 12000) {
      score += 6;
      breakdown.push({ label: "Prix premium", weight: 6, status: "positive", detail: `${Math.round(prixM2)} €/m² — commission élevée.` });
    } else {
      breakdown.push({ label: "Prix dans le marché", weight: 0, status: "neutral", detail: `${Math.round(prixM2)} €/m².` });
    }
  }

  if (signaux?.baisse_prix_detectee) {
    score += 15;
    breakdown.push({ label: "Baisse de prix détectée", weight: 15, status: "positive", detail: "Signal de difficulté à vendre — vendeur ouvert." });
    opportunites.push("Baisse de prix récente — vendeur sous pression, terrain propice");
  }

  if (signaux?.ancienneté_jours && signaux.ancienneté_jours > 60) {
    score += 12;
    breakdown.push({ label: "Annonce ancienne", weight: 12, status: "positive", detail: `~${signaux.ancienneté_jours}j en ligne — vente qui traîne.` });
    failles.push("Annonce en ligne depuis longtemps — stratégie de mise en marché à revoir");
  }

  score = Math.min(100, Math.max(0, score));
  return { score, breakdown, failles, opportunites };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { zone } = body || {};
    if (!zone || typeof zone !== "string" || zone.trim().length < 2) {
      return j({ error: "Zone requise (ville, quartier, code postal)" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!LOVABLE_API_KEY) return j({ error: "LOVABLE_API_KEY manquant" }, 500);
    if (!FIRECRAWL_API_KEY) return j({ error: "FIRECRAWL_API_KEY manquant — connectez Firecrawl" }, 500);

    // --- Auth: verify JWT signature server-side ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return j({ error: "Unauthorized" }, 401);
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData?.user) return j({ error: "Unauthorized" }, 401);
    const user_id = authData.user.id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const zoneClean = zone.trim();
    const parsedZone = parseSearchZone(zoneClean);
    const strictZoneLabel = parsedZone.arrondissement
      ? `${parsedZone.arrondissement.city} ${parsedZone.arrondissement.arr}e arrondissement ${parsedZone.arrondissement.cp}`
      : parsedZone.postalCode || parsedZone.cityName || zoneClean;

    const queries = [
      `appartement maison à vendre ${strictZoneLabel} site:leboncoin.fr`,
      `vente appartement maison ${strictZoneLabel} particulier site:leboncoin.fr`,
      `maison appartement à vendre ${strictZoneLabel} site:seloger.com`,
      `bien immobilier à vendre ${strictZoneLabel} site:bienici.com`,
      `vente appartement maison ${strictZoneLabel} site:pap.fr`,
      `appartement maison à vendre ${strictZoneLabel} site:logic-immo.com`,
      `bien à vendre ${strictZoneLabel} site:immobilier.lefigaro.fr`,
      `vente immobilière ${strictZoneLabel} site:avendrealouer.fr`,
      `appartement maison ${strictZoneLabel} site:paruvendu.fr`,
      `immobilier vente ${strictZoneLabel} site:ouestfrance-immo.com`,
      `appartement maison à vendre ${strictZoneLabel} site:orpi.com`,
      `bien à vendre ${strictZoneLabel} site:century21.fr`,
      `vente appartement maison ${strictZoneLabel} site:laforet.com`,
      `bien immobilier à vendre ${strictZoneLabel} site:guy-hoquet.com`,
    ];

    const allResults: FcResult[] = [];
    let firecrawlOkCount = 0;
    let lastFirecrawlError: string | null = null;

    const firecrawlResponses = await Promise.all(queries.map(async (query) => {
      try {
        const fcRes = await fetch("https://api.firecrawl.dev/v2/search", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            query, limit: 12, lang: "fr", country: "fr", tbs: "qdr:m",
            scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
          }),
        });
        if (!fcRes.ok) {
          const txt = await fcRes.text();
          console.error(`[Firecrawl] query="${query}" status=${fcRes.status} body=${txt.slice(0,300)}`);
          return { ok: false, status: fcRes.status, error: `${fcRes.status}: ${txt.slice(0,200)}`, list: [] as any[] };
        }
        const fcData = await fcRes.json();
        const list: any[] = fcData?.data?.web || fcData?.data || fcData?.web || [];
        console.log(`[Firecrawl] query="${query}" results=${list.length}`);
        return { ok: true, status: 200, error: null, list };
      } catch (e) {
        return { ok: false, status: 0, error: String((e as Error)?.message || e), list: [] };
      }
    }));

    for (const r of firecrawlResponses) {
      if (!r.ok) {
        lastFirecrawlError = r.error;
        if (r.status === 402) return j({ status: "scraping_error", error: "Crédits Firecrawl épuisés. Rechargez votre connexion Firecrawl." }, 402);
        if (r.status === 401 || r.status === 403) return j({ status: "scraping_error", error: "Clé Firecrawl invalide ou expirée." }, 502);
        continue;
      }
      firecrawlOkCount++;
      for (const it of r.list) {
        const url = normalizeListingUrl(it?.url || it?.metadata?.sourceURL || "");
        if (url) allResults.push({ url, title: it.title, description: it.description, markdown: it.markdown, image: it.image, metadata: it.metadata });
      }
    }

    if (firecrawlOkCount === 0) {
      return j({ status: "scraping_error", error: "Erreur lors de la récupération des annonces. Le service de scraping est indisponible.", details: lastFirecrawlError }, 502);
    }

    // Filtrage URLs
    const seen = new Set<string>();
    const validUrlResults = allResults.filter(r => {
      if (!r.url || seen.has(r.url)) return false;
      if (!isRealListingUrl(r.url)) return false;
      if (r.metadata?.statusCode && r.metadata.statusCode >= 400) return false;
      if (looksExpiredOrDead(`${r.title || ""}\n${r.description || ""}\n${r.markdown || ""}`)) return false;
      seen.add(r.url);
      return true;
    });

    // Détection multi-diffusion : URLs ayant le même titre simplifié sur >1 source
    const titleBucket = new Map<string, Set<string>>();
    for (const r of validUrlResults) {
      const key = (r.title || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 40);
      if (!key) continue;
      if (!titleBucket.has(key)) titleBucket.set(key, new Set());
      titleBucket.get(key)!.add(sourceFromUrl(r.url));
    }

    console.log(`[Pige] zone="${zoneClean}" firecrawl_raw=${allResults.length} valid_urls=${validUrlResults.length}`);

    const { count: existingZoneCount } = await supabase
      .from("annonces_pige")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id)
      .or(`ville.ilike.%${zoneClean}%,code_postal.ilike.%${zoneClean}%`);

    if (validUrlResults.length === 0) {
      return j({ status: "no_results", count: 0, annonces: [], existing_in_zone: existingZoneCount || 0,
        message: `Aucune annonce trouvée pour "${zoneClean}". Essayez une zone plus précise.` });
    }

    const urlsCandidates = validUrlResults.map(r => r.url);
    const { data: existingRows } = await supabase
      .from("annonces_pige").select("url").eq("user_id", user_id).in("url", urlsCandidates);
    const existingUrls = new Set((existingRows || []).map((r: any) => r.url));
    const alreadyExisting = validUrlResults.filter(r => existingUrls.has(r.url));
    const fresh = validUrlResults.filter(r => !existingUrls.has(r.url)).slice(0, 24);

    if (fresh.length === 0) {
      const { data: existingAnnonces } = await supabase
        .from("annonces_pige").select("*").eq("user_id", user_id)
        .in("url", alreadyExisting.map(r => r.url))
        .order("updated_at", { ascending: false }).limit(30);
      const strictlyMatchingExisting = (existingAnnonces || []).filter((row: any) => listingMatchesSearchZone(row, { url: row.url || "", title: row.titre, description: row.description, markdown: "" }, zoneClean));
      return j({
        status: "all_existing",
        count: strictlyMatchingExisting.length,
        annonces: strictlyMatchingExisting,
        existing_in_zone: existingZoneCount || 0,
        message: strictlyMatchingExisting.length > 0
          ? `${strictlyMatchingExisting.length} annonce${strictlyMatchingExisting.length > 1 ? "s" : ""} déjà détectée${strictlyMatchingExisting.length > 1 ? "s" : ""} sur ${zoneClean}.`
          : `Aucune annonce strictement située sur "${zoneClean}".`,
      });
    }

    // Extraction IA enrichie
    const corpus = fresh.map((r, i) => `--- ANNONCE #${i + 1} ---
URL: ${r.url}
TITRE: ${r.title || ""}
DESCRIPTION: ${r.description || ""}
CONTENU:
${(r.markdown || "").slice(0, 3000)}`).join("\n\n");

    const extractPrompt = `Tu es un extracteur de données immobilières françaises strict. Pour CHAQUE annonce, extrais les champs en JSON.

Renvoie UNIQUEMENT du JSON valide :
{"annonces":[{
  "index":1,
  "titre":"...",
  "prix":350000,
  "surface":75,
  "pieces":3,
  "ville":"...",
  "code_postal":"75016",
  "quartier":"...ou null",
  "etage":"...ou null",
  "type_bien":"appartement|maison|terrain|local|autre",
  "agence":"Particulier OU nom agence",
  "nom_vendeur":"...ou null",
  "telephone":"...ou null si pas dans le texte",
  "email":"...ou null si pas dans le texte",
  "description":"résumé factuel 1-2 phrases",
  "photo":"https://...",
  "nb_photos_detectees":3,
  "indices_baisse_prix": false,
  "ancienneté_estimée_jours": null,
  "qualite_photos":"pro|amateur|absente"
}]}

Règles :
- "prix"/"surface" : nombres uniquement. null si introuvable.
- "telephone"/"email" : extrait UNIQUEMENT s'ils figurent explicitement dans le texte de l'annonce.
- "indices_baisse_prix" : true si tu vois "baisse de prix", "prix négociable", "à débattre", "prix revu", "nouveau prix" etc.
- "qualite_photos" : juge la qualité d'après le rendu et nombre de photos.
- IGNORE toute annonce sans prix OU sans titre clair OU qui semble être une page de recherche.
- Ne fabrique JAMAIS de données.

ANNONCES :
${corpus}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: extractPrompt }],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) return j({ error: "Limite IA atteinte." }, 429);
      if (aiRes.status === 402) return j({ error: "Crédits IA épuisés." }, 402);
      throw new Error(`Gateway ${aiRes.status}: ${txt}`);
    }
    const aiData = await aiRes.json();
    const content: string = aiData.choices?.[0]?.message?.content || "{}";
    let parsed: any = { annonces: [] };
    try {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(m ? m[0] : content);
    } catch { parsed = { annonces: [] }; }
    const extracted: any[] = Array.isArray(parsed.annonces) ? parsed.annonces : [];
    const extractedByIndex = new Map<number, any>();
    extracted.forEach((item) => {
      const idx = Number(item?.index);
      if (Number.isFinite(idx) && idx > 0) extractedByIndex.set(idx, item);
    });

    const inserted: any[] = [];
    const rejected: string[] = [];

    for (let i = 0; i < fresh.length; i++) {
      const src = fresh[i];
      const fallback = basicExtract(src, zoneClean);
      const ai = extractedByIndex.get(i + 1) || {};
      const a = { ...fallback, ...ai };

      const prix = a.prix ? Number(a.prix) : null;
      const surface = a.surface ? Number(a.surface) : null;
      const titre = a.titre || src.title || "";

      const allPhotos = [extractImage(src, a.photo), ...extractAllImages(src.markdown || "")]
        .filter((u): u is string => !!u);
      const uniquePhotos = [...new Set(allPhotos)];

      if (!titre || titre.length < 8) { rejected.push(`${src.url} — titre manquant`); continue; }
      if (!prix || prix < 10000) { rejected.push(`${src.url} — prix manquant/invalide`); continue; }
      if (looksExpiredOrDead(`${titre}\n${a.description || ""}`)) { rejected.push(`${src.url} — expirée`); continue; }

      if (!listingMatchesSearchZone({ ...a, titre }, src, zoneClean)) {
        rejected.push(`${src.url} — hors zone stricte (${a.ville || "?"} ${a.code_postal || "?"})`);
        continue;
      }

      // Contact (fallback regex si IA n'a rien trouvé)
      const fullText = `${src.title || ""}\n${src.description || ""}\n${src.markdown || ""}`;
      const regexContact = extractContact(fullText);
      const contact_vendeur = {
        nom: a.nom_vendeur || null,
        telephone: a.telephone || regexContact.telephone || null,
        email: a.email || regexContact.email || null,
        type: String(a.agence || "").toLowerCase().includes("particulier") ? "particulier" : (a.agence ? "agence" : "inconnu"),
        agence_nom: a.agence && !String(a.agence).toLowerCase().includes("particulier") ? a.agence : null,
      };

      // Signaux marché
      const titleKey = (titre || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 40);
      const sourcesForTitle = titleKey ? titleBucket.get(titleKey) : null;
      const signaux_marche = {
        baisse_prix_detectee: !!a.indices_baisse_prix,
        ancienneté_jours: a.ancienneté_estimée_jours ? Number(a.ancienneté_estimée_jours) : null,
        multi_diffusion: sourcesForTitle ? sourcesForTitle.size > 1 : false,
        sources_detectees: sourcesForTitle ? [...sourcesForTitle] : [sourceFromUrl(src.url)],
        prix_m2: surface ? Math.round(prix / surface) : null,
      };

      // Qualité annonce
      const descLen = (a.description || src.description || "").length;
      const qualite_annonce = {
        nb_photos: uniquePhotos.length,
        qualite_photos: a.qualite_photos || (uniquePhotos.length === 0 ? "absente" : uniquePhotos.length < 4 ? "amateur" : "pro"),
        longueur_description: descLen,
        description_faible: descLen > 0 && descLen < 120,
        titre_qualite: titre.length < 30 ? "faible" : titre.length < 60 ? "moyenne" : "bonne",
      };

      const { score, breakdown, failles, opportunites } = computeScore(a, src, signaux_marche, qualite_annonce);
      const categorie_opportunite = categorize(score);
      const tags = [contact_vendeur.type === "particulier" ? "particulier" : null,
                    signaux_marche.baisse_prix_detectee ? "baisse_prix" : null,
                    signaux_marche.multi_diffusion ? "multi_diffusion" : null]
                    .filter((t): t is string => !!t);

      const { data: row, error } = await supabase.from("annonces_pige").insert({
        user_id,
        source: sourceFromUrl(src.url),
        url: src.url,
        titre,
        description: a.description || src.description || null,
        prix,
        surface,
        pieces: a.pieces ? Number(a.pieces) : null,
        ville: parsedZone.arrondissement ? parsedZone.arrondissement.city : (a.ville || parsedZone.cityName || null),
        code_postal: a.code_postal || parsedZone.postalCode || null,
        adresse: a.quartier || null,
        type_bien: a.type_bien || null,
        agence: a.agence || null,
        date_publication: new Date().toISOString(),
        photos: uniquePhotos,
        score_pigeabilite: score,
        score_breakdown: breakdown,
        contact_vendeur,
        signaux_marche,
        qualite_annonce,
        categorie_opportunite,
        workflow_statut: "a_appeler",
        zone_recherche: zoneClean,
        analyse_ia: { failles, opportunites, zone_recherche: zoneClean, generated: false },
        tags,
      }).select().single();
      if (!error && row) inserted.push(row);
      else if (error) console.error("Insert error:", error);
    }

    console.log(`[Pige] zone="${zoneClean}" inserted=${inserted.length} rejected=${rejected.length}`);

    if (inserted.length === 0) {
      return j({
        status: "no_results", count: 0, annonces: [],
        rejected_count: rejected.length, scanned: validUrlResults.length,
        message: rejected.length > 0
          ? `${rejected.length} annonce${rejected.length > 1 ? "s" : ""} détectée${rejected.length > 1 ? "s" : ""} mais incomplète${rejected.length > 1 ? "s" : ""}.`
          : `Aucune annonce exploitable pour "${zoneClean}".`,
      });
    }

    return j({
      status: "success", count: inserted.length, annonces: inserted,
      rejected_count: rejected.length, scanned: validUrlResults.length,
    });
  } catch (e) {
    console.error("[search-pige-zone] fatal:", e);
    return j({ status: "scraping_error", error: String((e as Error).message || e) }, 500);
  }
});
