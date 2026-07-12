import { parseJsonObject } from "@/lib/storefront-builder/agents/agentThinking";
import { getAssistantMessageContent, getThinkingModelName, postChat } from "@/lib/storefront-builder/agents/openaiChat";

type UnsplashPhoto = {
  id: string;
  urls?: {
    raw?: string;
    regular?: string;
    small?: string;
  };
};

type UnsplashSearchResponse = {
  results?: UnsplashPhoto[];
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

export async function searchUnsplashPhotosDirect(query: string, count = 5): Promise<UnsplashPhoto[]> {
  const accessKey = getUnsplashAccessKey();
  const trimmed = query.trim();
  if (!accessKey || !trimmed) return [];

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", trimmed);
  url.searchParams.set("per_page", String(Math.min(Math.max(count, 1), 30)));
  url.searchParams.set("orientation", "landscape");
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

async function searchUnsplashPhotosViaProxy(query: string, count: number): Promise<UnsplashPhoto[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const url = new URL("/api/unsplash/search", window.location.origin);
    url.searchParams.set("query", trimmed);
    url.searchParams.set("count", String(Math.min(Math.max(count, 1), 30)));

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS + 2000),
    });

    if (!response.ok) {
      console.warn("[unsplash] proxy search failed", response.status, trimmed);
      return [];
    }

    const payload = (await response.json()) as {
      results?: Array<UnsplashPhoto & { url?: string }>;
    };
    const results = Array.isArray(payload.results) ? payload.results : [];
    return results.map((photo) => ({
      id: photo.id,
      urls: photo.urls ?? (photo.url ? { regular: photo.url } : undefined),
    }));
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
export async function searchUnsplashPhotos(query: string, count = 5): Promise<UnsplashPhoto[]> {
  if (typeof window !== "undefined") {
    return searchUnsplashPhotosViaProxy(query, count);
  }
  return searchUnsplashPhotosDirect(query, count);
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
