import { parseJsonObject } from "@/lib/storefront-builder/agents/agentThinking";
import { getAssistantMessageContent, getThinkingModelName, postChat } from "@/lib/storefront-builder/agents/openaiChat";

type UnsplashPhoto = {
  id: string;
  urls?: {
    raw?: string;
    regular?: string;
    small?: string;
  };
  description?: string | null;
  alt_description?: string | null;
  tags?: Array<{ title?: string } | string>;
};

type UnsplashSearchResponse = {
  results?: UnsplashPhoto[];
};

export type UnsplashPhotoMatch = UnsplashPhoto & {
  url?: string;
};

export type UnsplashImageContext = {
  business_name?: string | null;
  industry?: string | null;
  description?: string | null;
  tone?: string[];
};

export type UnsplashSearchPlan = {
  hero: string[];
  about: string[];
  spotlight: string[];
  promo: string[];
  products: string[];
  search_terms: string[];
  summary?: string;
};

const SEARCH_TIMEOUT_MS = 5000;

const INDUSTRY_FALLBACKS: Record<string, UnsplashSearchPlan> = {
  beauty_and_skincare: {
    hero: ["skincare products flat lay", "cosmetics collection"],
    about: ["person applying skincare", "beauty studio"],
    spotlight: ["skincare routine lifestyle", "spa self care"],
    promo: ["serum bottle close up"],
    products: ["face serum", "moisturizer jar", "cleanser bottle"],
    search_terms: ["skincare", "cosmetics", "beauty"],
  },
  fashion_and_apparel: {
    hero: ["fashion editorial", "clothing flat lay"],
    about: ["person wearing outfit", "fashion studio"],
    spotlight: ["streetwear lifestyle", "outfit mirror"],
    promo: ["clothing detail texture"],
    products: ["hoodie apparel", "trousers fashion", "cotton tee"],
    search_terms: ["fashion", "apparel", "streetwear"],
  },
  food_and_beverage: {
    hero: ["coffee shop interior", "food flat lay"],
    about: ["barista making coffee", "restaurant kitchen"],
    spotlight: ["cafe lifestyle", "dining table"],
    promo: ["coffee cup close up"],
    products: ["latte art", "pastry food", "breakfast plate"],
    search_terms: ["coffee", "food", "cafe"],
  },
  home_and_garden: {
    hero: ["home decor flat lay", "candle collection"],
    about: ["person holding candle cozy", "home decor studio"],
    spotlight: ["cozy living room candle", "botanical home"],
    promo: ["scented candle close up"],
    products: ["pillar candle", "jar candle", "candle gift set"],
    search_terms: ["candles", "home decor", "botanical"],
  },
  default: {
    hero: ["product flat lay", "retail display"],
    about: ["small business maker", "shop interior"],
    spotlight: ["lifestyle product use", "handmade workshop"],
    promo: ["product close up"],
    products: ["product photography", "packaged goods", "gift box"],
    search_terms: ["small business", "product", "retail"],
  },
};

function normalizeEnvKey(value: string | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  return trimmed.length ? trimmed : null;
}

export function getUnsplashAccessKey(): string | null {
  const key =
    normalizeEnvKey(process.env.UNSPLASH_ACCESS_KEY) ??
    normalizeEnvKey(process.env.NEXT_UNSPLASH_ACCESS_KEY) ??
    normalizeEnvKey(process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY);

  if (!key || key === "demo_key") return null;
  return key;
}

export function formatUnsplashPhotoUrl(photo: UnsplashPhoto, width = 1800): string {
  if (photo.urls?.regular) return photo.urls.regular;

  const raw = photo.urls?.raw;
  if (raw) {
    const separator = raw.includes("?") ? "&" : "?";
    return `${raw}${separator}w=${width}&q=90&auto=format&fit=crop`;
  }

  if (photo.urls?.small) return photo.urls.small;
  return "";
}

function normalizeQueries(value: unknown, max = 6): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    .map((entry) => entry.trim().slice(0, 80))
    .slice(0, max);
}

function industryFallback(industry?: string | null): UnsplashSearchPlan {
  if (!industry) return INDUSTRY_FALLBACKS.default;
  const key = industry.toString().trim();
  return INDUSTRY_FALLBACKS[key] ?? INDUSTRY_FALLBACKS.default;
}

/** AI picks short, visual Unsplash queries per website slot — product & scene only, never the shop name. */
export async function inferUnsplashSearchPlanWithAi(
  context: UnsplashImageContext,
  intent: string,
): Promise<UnsplashSearchPlan> {
  const fallback = industryFallback(context.industry);

  try {
    const data = await postChat({
      model: await getThinkingModelName(),
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write short Unsplash stock-photo search queries for a small-business website.\n" +
            "Rules:\n" +
            "- NEVER include the business or shop name — only what they sell, the material, style, and visual scene.\n" +
            "- Each query is 2-5 words optimized for Unsplash (concrete nouns, visible scenes).\n" +
            "- Tailor each slot to what that image position needs on the page.\n\n" +
            "Return ONLY valid JSON:\n" +
            '- "hero_queries": string[] — 2-3 wide homepage hero shots (product collection, striking flat lay, display)\n' +
            '- "about_queries": string[] — 2-3 brand-story images (person holding/using the product, cozy lifestyle, maker studio)\n' +
            '- "spotlight_queries": string[] — 2-3 homepage about-spotlight images (lifestyle, texture, atmosphere)\n' +
            '- "promo_queries": string[] — 1-2 promo banner accents (close-up, seasonal, eye-catching)\n' +
            '- "product_queries": string[] — 3-6 individual product-grid searches (one query per product type or variant)\n' +
            '- "search_terms": string[] — 3-5 browse terms for the merchant\n' +
            '- "summary": string — one warm sentence about the photo direction\n\n' +
            'Example for botanical candles: hero ["soy candles flat lay"], about ["person holding candle cozy"], product_queries ["pillar candle", "jar candle", "candle gift set"]',
        },
        {
          role: "user",
          content: JSON.stringify({
            merchant_request: intent,
            what_they_sell: context.description ?? null,
            industry: context.industry ?? null,
            tone: context.tone ?? [],
          }),
        },
      ],
    });

    const parsed = parseJsonObject<{
      hero_queries?: unknown;
      about_queries?: unknown;
      spotlight_queries?: unknown;
      promo_queries?: unknown;
      product_queries?: unknown;
      search_terms?: unknown;
      summary?: string;
    }>(getAssistantMessageContent(data), {});

    const plan: UnsplashSearchPlan = {
      hero: normalizeQueries(parsed.hero_queries, 3),
      about: normalizeQueries(parsed.about_queries, 3),
      spotlight: normalizeQueries(parsed.spotlight_queries, 3),
      promo: normalizeQueries(parsed.promo_queries, 2),
      products: normalizeQueries(parsed.product_queries, 6),
      search_terms: normalizeQueries(parsed.search_terms, 5),
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : undefined,
    };

    if (plan.hero.length) {
      console.info("[unsplash] AI search plan", plan);
      return {
        hero: [...plan.hero, ...fallback.hero],
        about: [...plan.about, ...fallback.about],
        spotlight: [...plan.spotlight, ...plan.about, ...fallback.spotlight],
        promo: [...plan.promo, ...fallback.promo],
        products: [...plan.products, ...fallback.products],
        search_terms: plan.search_terms.length ? plan.search_terms : fallback.search_terms,
        summary: plan.summary ?? fallback.summary,
      };
    }
  } catch (error) {
    console.warn("[unsplash] AI query inference failed", error);
  }

  return fallback;
}

export async function searchUnsplashPhotosDirect(
  query: string,
  count = 5,
  options: { orientation?: "landscape" | "portrait" | "squarish" | "any" } = {},
): Promise<UnsplashPhoto[]> {
  const accessKey = getUnsplashAccessKey();
  const trimmed = query.trim();
  if (!accessKey || !trimmed) return [];

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", trimmed);
  url.searchParams.set("per_page", String(Math.min(Math.max(count, 1), 30)));
  const orientation = options.orientation ?? "landscape";
  if (orientation !== "any") {
    url.searchParams.set("orientation", orientation);
  }
  url.searchParams.set("content_filter", "high");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.warn("[unsplash] search failed", response.status, trimmed);
      return [];
    }

    const payload = (await response.json()) as UnsplashSearchResponse;
    return Array.isArray(payload.results) ? payload.results : [];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[unsplash] search error", message, trimmed);
    return [];
  }
}

async function searchUnsplashPhotosViaProxy(
  query: string,
  count: number,
  options: { orientation?: "landscape" | "portrait" | "squarish" | "any" } = {},
): Promise<UnsplashPhoto[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const { getToken } = await import("@/lib/api/client");
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const url = new URL("/api/unsplash/search", window.location.origin);
    url.searchParams.set("query", trimmed);
    url.searchParams.set("count", String(Math.min(Math.max(count, 1), 30)));
    if (options.orientation) {
      url.searchParams.set("orientation", options.orientation);
    }

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS + 2000),
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    });

    if (!response.ok) {
      console.warn("[unsplash] proxy search failed", response.status, trimmed);
      return [];
    }

    const payload = (await response.json()) as {
      results?: Array<UnsplashPhotoMatch>;
    };
    const results = Array.isArray(payload.results) ? payload.results : [];
    return results.map((photo) => {
      const formatted = typeof photo.url === "string" && photo.url.startsWith("http") ? photo.url : "";
      return {
        id: photo.id,
        description: photo.description ?? null,
        alt_description: photo.alt_description ?? null,
        tags: photo.tags,
        urls: {
          ...(photo.urls ?? {}),
          // Prefer the proxy's already-formatted live Unsplash URL.
          regular: photo.urls?.regular || formatted || undefined,
        },
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[unsplash] proxy search error", message, trimmed);
    return [];
  }
}

/**
 * Search Unsplash. From the browser this goes through `/api/unsplash/search`
 * so UNSPLASH_ACCESS_KEY stays server-side. On the server it calls Unsplash directly.
 */
export async function searchUnsplashPhotos(
  query: string,
  count = 5,
  options: { orientation?: "landscape" | "portrait" | "squarish" | "any" } = {},
): Promise<UnsplashPhoto[]> {
  if (typeof window !== "undefined") {
    return searchUnsplashPhotosViaProxy(query, count, options);
  }
  return searchUnsplashPhotosDirect(query, count, options);
}

function photoText(photo: UnsplashPhoto): string {
  const tagText = (photo.tags ?? [])
    .map((tag) => (typeof tag === "string" ? tag : tag.title ?? ""))
    .filter(Boolean)
    .join(" ");
  return `${photo.alt_description ?? ""} ${photo.description ?? ""} ${tagText}`.toLowerCase();
}

function tokenizeMatchTerms(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !["the", "and", "for", "with", "from", "product", "photo", "photography"].includes(token));
}

/** Score how well an Unsplash photo's metadata matches the product / query terms. */
export function scoreUnsplashPhotoRelevance(
  photo: UnsplashPhoto,
  matchTerms: string[],
  query: string,
): number {
  const haystack = photoText(photo);
  if (!haystack.trim()) return 0;

  const terms = [
    ...new Set([...matchTerms.flatMap(tokenizeMatchTerms), ...tokenizeMatchTerms(query)]),
  ];
  if (!terms.length) return 0;

  let score = 0;
  for (const term of terms) {
    if (haystack.includes(term)) {
      score += term.length >= 4 ? 4 : 2;
    }
  }

  // Penalize near-miss product families (e.g. PSP for PS5, AirPods for iPhone).
  const joined = terms.join(" ");
  if (/\bps5|playstation\s*5\b/.test(joined) && /\b(psp|playstation portable|ps vita|handheld)\b/.test(haystack)) {
    score -= 25;
  }
  if (/\bps4|playstation\s*4\b/.test(joined) && /\b(psp|ps5|playstation\s*5)\b/.test(haystack)) {
    score -= 15;
  }
  if (/\biphone\b/.test(joined) && /\b(ipad|macbook|airpods|imac)\b/.test(haystack) && !haystack.includes("iphone")) {
    score -= 15;
  }
  if (/\blatitude|macbook|thinkpad|laptop\b/.test(joined) && /\b(phone|tablet|monitor only)\b/.test(haystack) && !/\b(laptop|notebook|macbook|thinkpad|latitude)\b/.test(haystack)) {
    score -= 10;
  }

  return score;
}

/** Return a live images.unsplash.com URL for the best matching photo, or null. */
export async function resolveUnsplashPhotoUrl(
  queries: string[],
  options: {
    count?: number;
    orientation?: "landscape" | "portrait" | "squarish" | "any";
    usedUrls?: Set<string>;
    /** When set, prefer photos whose alt/description mention these product terms. */
    matchTerms?: string[];
    /** Minimum relevance score when matchTerms are provided. 0 keeps first result. */
    minScore?: number;
  } = {},
): Promise<string | null> {
  const used = options.usedUrls ?? new Set<string>();
  const count = options.count ?? 8;
  const orientation = options.orientation ?? "any";
  const matchTerms = options.matchTerms ?? [];
  const minScore = options.minScore ?? (matchTerms.length ? 1 : 0);

  let bestFallback: { url: string; query: string; score: number } | null = null;

  for (const query of queries) {
    const trimmed = query.trim();
    if (!trimmed) continue;
    const results = await searchUnsplashPhotos(trimmed, count, { orientation });

    let bestForQuery: { url: string; score: number } | null = null;
    for (const photo of results) {
      const url = formatUnsplashPhotoUrl(photo, 900);
      if (!url || !url.includes("images.unsplash.com") || used.has(url)) continue;

      const score = matchTerms.length
        ? scoreUnsplashPhotoRelevance(photo, matchTerms, trimmed)
        : 0;

      if (!bestForQuery || score > bestForQuery.score) {
        bestForQuery = { url, score };
      }
    }

    if (!bestForQuery) continue;

    if (!matchTerms.length || bestForQuery.score >= minScore) {
      used.add(bestForQuery.url);
      console.info(
        `[unsplash] product photo matched "${trimmed}"` +
          (matchTerms.length ? ` (score ${bestForQuery.score})` : ""),
      );
      return bestForQuery.url;
    }

    if (!bestFallback || bestForQuery.score > bestFallback.score) {
      bestFallback = { ...bestForQuery, query: trimmed };
    }
  }

  // Retry without orientation if the first pass was constrained and failed.
  if (orientation !== "any") {
    return resolveUnsplashPhotoUrl(queries, { ...options, orientation: "any" });
  }

  // Last resort: best low-score candidate from a specific query (still better than nothing).
  if (bestFallback) {
    used.add(bestFallback.url);
    console.info(
      `[unsplash] product photo weak match "${bestFallback.query}" (score ${bestFallback.score})`,
    );
    return bestFallback.url;
  }

  return null;
}

async function searchUnsplashWithFallbacks(candidates: string[], count: number): Promise<UnsplashPhoto[]> {
  for (const query of candidates) {
    const results = await searchUnsplashPhotos(query, count);
    if (results.length) {
      console.info(`[unsplash] matched "${query}" (${results.length} photos)`);
      return results;
    }
  }
  return [];
}

async function searchProductPhotos(queries: string[]): Promise<string[]> {
  const urls: string[] = [];
  const seen = new Set<string>();

  for (const query of queries.slice(0, 6)) {
    const results = await searchUnsplashPhotos(query, 3);
    for (const photo of results) {
      const url = formatUnsplashPhotoUrl(photo, 900);
      if (url && !seen.has(url)) {
        seen.add(url);
        urls.push(url);
        break;
      }
    }
  }

  return urls;
}

export async function fetchTemplatePlanFromUnsplash(
  context: UnsplashImageContext,
  intent: string,
): Promise<{
  hero_url: string;
  about_url: string;
  promo_url: string;
  spotlight_url: string;
  product_urls: string[];
  search_terms: string[];
  summary?: string;
} | null> {
  if (!getUnsplashAccessKey()) {
    console.warn("[unsplash] no API key configured");
    return null;
  }

  const searchPlan = await inferUnsplashSearchPlanWithAi(context, intent);

  const [heroResults, aboutResults, spotlightResults, promoResults] = await Promise.all([
    searchUnsplashWithFallbacks(searchPlan.hero, 5),
    searchUnsplashWithFallbacks(searchPlan.about, 5),
    searchUnsplashWithFallbacks(searchPlan.spotlight, 5),
    searchUnsplashWithFallbacks(searchPlan.promo, 3),
  ]);

  const heroUrl = heroResults[0] ? formatUnsplashPhotoUrl(heroResults[0]) : "";
  if (!heroUrl) {
    console.warn("[unsplash] no hero results after AI queries");
    return null;
  }

  const aboutUrl = aboutResults[0]
    ? formatUnsplashPhotoUrl(aboutResults[0], 1400)
    : spotlightResults[0]
      ? formatUnsplashPhotoUrl(spotlightResults[0], 1400)
      : heroUrl;

  const spotlightUrl = spotlightResults[0]
    ? formatUnsplashPhotoUrl(spotlightResults[0], 1400)
    : aboutUrl;

  const promoUrl = promoResults[0]
    ? formatUnsplashPhotoUrl(promoResults[0], 1200)
    : spotlightUrl;

  const productUrls = await searchProductPhotos(searchPlan.products);

  return {
    hero_url: heroUrl,
    about_url: aboutUrl,
    promo_url: promoUrl,
    spotlight_url: spotlightUrl,
    product_urls: productUrls.length ? productUrls : [heroUrl, aboutUrl, promoUrl],
    search_terms: searchPlan.search_terms,
    summary: searchPlan.summary,
  };
}
