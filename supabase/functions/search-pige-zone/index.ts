// Recherche RÉELLE d'annonces immobilières par zone (Firecrawl-first)
// Pipeline : Firecrawl Search → validation URL/image → extraction IA structurée → dédup → insert
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const j = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// === Heuristiques URL : on ne garde QUE les pages d'annonces réelles ===
// Évite pages de recherche / listing / catégorie / 404
const isRealListingUrl = (url: string): boolean => {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const path = u.pathname;

    // Anti-patterns globaux (recherche, listing, catégorie)
    const bad = /\/(recherche|search|annonces?\/?$|achat\/?$|ventes_immobilieres\/?$|liste|resultat|categories?)/i;
    if (bad.test(path)) return false;
    if (path === "/" || path.length < 6) return false;

    // Patterns spécifiques par plateforme
    if (host.includes("leboncoin.fr")) return /\/ad\/ventes_immobilieres\/\d+/i.test(path) || /\/vi\/\d+/i.test(path);
    if (host.includes("seloger.com")) return /\d{4,}\.htm/i.test(path) || /\/annonces\/(achat|location|achat-de-prestige)\/.+\d+/i.test(path);
    if (host.includes("bienici.com")) return /\/annonce\/.+\/[a-z0-9-]+/i.test(path);
    if (host.includes("pap.fr")) return /\/annonces\/.+-r\d+/i.test(path) || /-h\d+/i.test(path);
    if (host.includes("logic-immo")) return /\/detail-/i.test(path);
    if (host.includes("orpi.com")) return /\/annonce/i.test(path);
    if (host.includes("century21.fr")) return /\/annonce/i.test(path);

    // Inconnu : on rejette pour rester strict
    return false;
  } catch {
    return false;
  }
};

const sourceFromUrl = (url: string): string => {
  if (url.includes("leboncoin")) return "leboncoin";
  if (url.includes("seloger")) return "seloger";
  if (url.includes("bienici")) return "bienici";
  if (url.includes("pap.fr")) return "pap";
  if (url.includes("logic-immo")) return "logic-immo";
  if (url.includes("orpi")) return "orpi";
  if (url.includes("century21")) return "century21";
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
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid"].forEach((p) => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return url;
  }
};

const looksExpiredOrDead = (text: string): boolean =>
  /(annonce\s+(supprimée|désactivée|expirée|introuvable)|page\s+introuvable|404|not\s+found|n.?existe\s+plus|a été retirée)/i.test(text || "");

// Extrait la première image valide depuis markdown, metadata Firecrawl ou champs search.
const extractImage = (result: Partial<FcResult>, candidate?: string | null): string | null => {
  const direct = candidate || result.image || result.metadata?.ogImage || result.metadata?.image;
  if (typeof direct === "string" && /^https?:\/\//i.test(direct)) return direct;
  const md = result.markdown || "";
  const re = /!\[[^\]]*\]\((https?:\/\/[^\s)]+\.(?:jpe?g|png|webp)(?:\?[^\s)]*)?)\)/i;
  const m = md.match(re);
  if (m?.[1]) return m[1];
  const og = md.match(/og:image["']?\s*content=["'](https?:\/\/[^"']+)["']/i);
  return og?.[1] || null;
};

const numberFromText = (text: string, pattern: RegExp): number | null => {
  const m = text.match(pattern);
  if (!m?.[1]) return null;
  const value = Number(String(m[1]).replace(/[\s.,]/g, ""));
  return Number.isFinite(value) ? value : null;
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
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { zone, user_id: bodyUserId } = body || {};
    if (!zone || typeof zone !== "string" || zone.trim().length < 2) {
      return j({ error: "Zone requise (ville, quartier, code postal)" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!LOVABLE_API_KEY) return j({ error: "LOVABLE_API_KEY manquant" }, 500);
    if (!FIRECRAWL_API_KEY) return j({ error: "FIRECRAWL_API_KEY manquant — connectez Firecrawl" }, 500);

    // Resolve user_id
    let user_id: string | null = bodyUserId || null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const payload = JSON.parse(atob(token.split(".")[1] || ""));
        if (payload?.sub) user_id = payload.sub;
      } catch (_) { /* ignore */ }
    }
    if (!user_id) return j({ error: "user_id requis" }, 400);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const zoneClean = zone.trim();

    // ============ 1) FIRECRAWL SEARCH multi-requêtes ciblées ============
    const queries = [
      `appartement maison à vendre ${zoneClean} site:leboncoin.fr`,
      `vente appartement maison ${zoneClean} particulier site:leboncoin.fr`,
      `maison appartement à vendre ${zoneClean} site:seloger.com`,
      `bien immobilier à vendre ${zoneClean} site:bienici.com`,
      `vente appartement maison ${zoneClean} site:pap.fr`,
    ];

    const allResults: FcResult[] = [];
    let firecrawlOkCount = 0;
    let firecrawlErrCount = 0;
    let lastFirecrawlError: string | null = null;

    for (const query of queries) {
      try {
        const fcRes = await fetch("https://api.firecrawl.dev/v2/search", {
          method: "POST",
          headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            limit: 12,
            lang: "fr",
            country: "fr",
            tbs: "qdr:w",
            scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
          }),
        });

        if (!fcRes.ok) {
          const txt = await fcRes.text();
          firecrawlErrCount++;
          lastFirecrawlError = `${fcRes.status}: ${txt.slice(0, 200)}`;
          console.error(`[Firecrawl] query="${query}" status=${fcRes.status} body=${txt.slice(0, 300)}`);
          if (fcRes.status === 402) return j({ status: "scraping_error", error: "Crédits Firecrawl épuisés. Rechargez votre connexion Firecrawl." }, 402);
          if (fcRes.status === 401 || fcRes.status === 403) return j({ status: "scraping_error", error: "Clé Firecrawl invalide ou expirée." }, 502);
          continue;
        }

        const fcData = await fcRes.json();
        const list: any[] = fcData?.data?.web || fcData?.data || fcData?.web || [];
        firecrawlOkCount++;
        console.log(`[Firecrawl] query="${query}" results=${list.length}`);
        for (const r of list) {
          const url = normalizeListingUrl(r?.url || r?.metadata?.sourceURL || "");
          if (url) allResults.push({ url, title: r.title, description: r.description, markdown: r.markdown, image: r.image, metadata: r.metadata });
        }
      } catch (e) {
        firecrawlErrCount++;
        lastFirecrawlError = String((e as Error)?.message || e);
        console.error(`[Firecrawl] query="${query}" exception=`, e);
      }
    }

    // Si TOUTES les requêtes Firecrawl ont échoué → erreur scraping
    if (firecrawlOkCount === 0) {
      return j({
        status: "scraping_error",
        error: "Erreur lors de la récupération des annonces. Le service de scraping est indisponible.",
        details: lastFirecrawlError,
      }, 502);
    }

    // ============ 2) Filtre URLs (vraies pages d'annonces uniquement) ============
    const seen = new Set<string>();
    const validUrlResults = allResults.filter(r => {
      if (!r.url || seen.has(r.url)) return false;
      if (!isRealListingUrl(r.url)) return false;
      if (r.metadata?.statusCode && r.metadata.statusCode >= 400) return false;
      if (looksExpiredOrDead(`${r.title || ""}\n${r.description || ""}\n${r.markdown || ""}`)) return false;
      seen.add(r.url);
      return true;
    });

    console.log(`[Pige] zone="${zoneClean}" firecrawl_raw=${allResults.length} valid_urls=${validUrlResults.length}`);

    // Compte les annonces déjà en base pour CETTE zone (pour message contextuel)
    const { count: existingZoneCount } = await supabase
      .from("annonces_pige")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user_id)
      .or(`ville.ilike.%${zoneClean}%,code_postal.ilike.%${zoneClean}%`);

    if (validUrlResults.length === 0) {
      return j({
        status: "no_results",
        count: 0,
        annonces: [],
        existing_in_zone: existingZoneCount || 0,
        message: `Aucune annonce trouvée pour "${zoneClean}". Essayez une zone plus précise (ex: "Paris 16", "Cannes Centre").`,
      });
    }

    // ============ 3) Filtre doublons en DB ============
    const urlsCandidates = validUrlResults.map(r => r.url);
    const { data: existingRows } = await supabase
      .from("annonces_pige")
      .select("url")
      .eq("user_id", user_id)
      .in("url", urlsCandidates);
    const existingUrls = new Set((existingRows || []).map((r: any) => r.url));
    const alreadyExisting = validUrlResults.filter(r => existingUrls.has(r.url));
    const fresh = validUrlResults.filter(r => !existingUrls.has(r.url)).slice(0, 18);

    if (fresh.length === 0) {
      const { data: existingAnnonces } = await supabase
        .from("annonces_pige")
        .select("*")
        .eq("user_id", user_id)
        .in("url", alreadyExisting.map(r => r.url))
        .order("updated_at", { ascending: false })
        .limit(24);
      return j({
        status: "all_existing",
        count: existingAnnonces?.length || 0,
        annonces: existingAnnonces || [],
        existing_in_zone: existingZoneCount || 0,
        message: `${validUrlResults.length} annonce${validUrlResults.length > 1 ? "s" : ""} déjà détectée${validUrlResults.length > 1 ? "s" : ""} — affichage de la pige existante mis à jour.`,
      });
    }

    // ============ 4) Extraction structurée via Lovable AI ============
    const corpus = fresh.map((r, i) => `--- ANNONCE #${i + 1} ---
URL: ${r.url}
TITRE: ${r.title || ""}
DESCRIPTION: ${r.description || ""}
CONTENU:
${(r.markdown || "").slice(0, 2500)}`).join("\n\n");

    const extractPrompt = `Tu es un extracteur de données immobilières françaises strict. Pour CHAQUE annonce ci-dessous, extrais les champs en JSON.

Renvoie UNIQUEMENT du JSON valide :
{"annonces":[{"index":1,"titre":"...","prix":350000,"surface":75,"pieces":3,"ville":"...","code_postal":"75016","type_bien":"appartement","agence":"Particulier","description":"résumé 1-2 phrases factuel","photo":"https://..."}]}

Règles STRICTES :
- "prix" et "surface" : nombres uniquement (sans € ni m²). null si introuvable.
- "type_bien" : appartement | maison | terrain | local | autre
- "agence" : "Particulier" si annonce particulier, sinon le nom de l'agence.
- "photo" : URL image principale trouvée dans le markdown (![](url)). null sinon.
- IGNORE complètement (ne mets PAS dans la liste) toute annonce qui n'a PAS de prix OU pas de titre clair OU qui semble être une page de recherche/listing.
- Ne fabrique JAMAIS de données. Si une info manque, mets null.

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
      if (aiRes.status === 429) return j({ error: "Limite IA atteinte, réessayez dans un instant." }, 429);
      if (aiRes.status === 402) return j({ error: "Crédits IA épuisés." }, 402);
      throw new Error(`Gateway ${aiRes.status}: ${txt}`);
    }
    const aiData = await aiRes.json();
    const content: string = aiData.choices?.[0]?.message?.content || "{}";
    let parsed: any = { annonces: [] };
    try {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(m ? m[0] : content);
    } catch {
      parsed = { annonces: [] };
    }
    const extracted: any[] = Array.isArray(parsed.annonces) ? parsed.annonces : [];
    const extractedByIndex = new Map<number, any>();
    extracted.forEach((item) => {
      const idx = Number(item?.index);
      if (Number.isFinite(idx) && idx > 0) extractedByIndex.set(idx, item);
    });

    // ============ 5) Validation finale + Score + Insert ============
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

      // Photo : IA → Firecrawl metadata → markdown
      const photo: string | null = extractImage(src, a.photo);

      // QUALITÉ : on rejette les annonces sans prix/titre ou manifestement mortes.
      if (!titre || titre.length < 8) { rejected.push(`${src.url} — titre manquant`); continue; }
      if (!prix || prix < 10000) { rejected.push(`${src.url} — prix manquant/invalide`); continue; }
      if (looksExpiredOrDead(`${titre}\n${a.description || ""}`)) { rejected.push(`${src.url} — annonce expirée`); continue; }

      const isParticulier = String(a.agence || "").toLowerCase().includes("particulier");

      let score = 45;
      if (isParticulier) score += 30;
      if (a.description && String(a.description).length < 100) score += 10;
      if (surface && prix / surface < 4500) score += 5;
      score = Math.min(100, Math.max(0, score));

      const failles: string[] = [];
      if (isParticulier) failles.push("Vendeur particulier — ouverture probable à un mandat");
      if (a.description && String(a.description).length < 100) failles.push("Description très courte — défaut de mise en valeur");

      const { data: row, error } = await supabase.from("annonces_pige").insert({
        user_id,
        source: sourceFromUrl(src.url),
        url: src.url,
        titre,
        description: a.description || src.description || null,
        prix,
        surface,
        pieces: a.pieces ? Number(a.pieces) : null,
        ville: a.ville || null,
        code_postal: a.code_postal || null,
        type_bien: a.type_bien || null,
        agence: a.agence || null,
        date_publication: new Date().toISOString(),
        photos: photo ? [photo] : [],
        score_pigeabilite: score,
        analyse_ia: { failles, zone_recherche: zoneClean, generated: false },
        tags: isParticulier ? ["particulier"] : [],
      }).select().single();
      if (!error && row) inserted.push(row);
      else if (error) console.error("Insert error:", error);
    }

    console.log(`[Pige] zone="${zoneClean}" inserted=${inserted.length} rejected=${rejected.length} fresh=${fresh.length}`);

    if (inserted.length === 0) {
      return j({
        status: "no_results",
        count: 0,
        annonces: [],
        rejected_count: rejected.length,
        scanned: validUrlResults.length,
        message: rejected.length > 0
          ? `${rejected.length} annonce${rejected.length > 1 ? "s" : ""} détectée${rejected.length > 1 ? "s" : ""} mais incomplète${rejected.length > 1 ? "s" : ""} (image, prix ou titre manquant). Essayez une autre zone.`
          : `Aucune annonce exploitable trouvée pour "${zoneClean}".`,
      });
    }

    return j({
      status: "success",
      count: inserted.length,
      annonces: inserted,
      rejected_count: rejected.length,
      scanned: validUrlResults.length,
    });
  } catch (e) {
    console.error("[search-pige-zone] fatal:", e);
    return j({ status: "scraping_error", error: String((e as Error).message || e) }, 500);
  }
});
