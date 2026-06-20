type UnsplashPhoto = {
  id: string;
  urls?: {
    raw?: string;
    regular?: string;
    small?: string;
  };
  alt_description?: string | null;
  description?: string | null;
};

type UnsplashSearchResponse = {
  results?: UnsplashPhoto[];
};

export function getUnsplashAccessKey(): string | null {
  const key =
    process.env.UNSPLASH_ACCESS_KEY ??
    process.env.NEXT_UNSPLASH_ACCESS_KEY ??
    process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
  return typeof key === "string" && key.trim() ? key.trim() : null;
}

export function formatUnsplashPhotoUrl(photo: UnsplashPhoto, width = 1800): string {
  const raw = photo.urls?.raw;
  if (raw) {
    const separator = raw.includes("?") ? "&" : "?";
    return `${raw}${separator}w=${width}&q=90&auto=format&fit=crop`;
  }
  if (photo.urls?.regular) return photo.urls.regular;
  if (photo.urls?.small) return photo.urls.small;
  return "";
}

export async function searchUnsplashPhotos(query: string, count = 6): Promise<UnsplashPhoto[]> {
  const accessKey = getUnsplashAccessKey();
  const trimmed = query.trim();
  if (!accessKey || !trimmed) return [];

  const url = new URL("https://api.unsplash.com/search/photos");
  url.searchParams.set("query", trimmed);
  url.searchParams.set("per_page", String(Math.min(Math.max(count, 1), 30)));
  url.searchParams.set("orientation", "landscape");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.warn("[unsplash] search failed", response.status, trimmed);
      return [];
    }

    const payload = (await response.json()) as UnsplashSearchResponse;
    return Array.isArray(payload.results) ? payload.results : [];
  } catch (error) {
    console.warn("[unsplash] search error", error);
    return [];
  }
}

export function buildUnsplashSearchQueries(
  context: {
    business_name?: string | null;
    industry?: string | null;
    description?: string | null;
  },
  intent?: string,
): { hero: string; about: string; products: string } {
  const industry = (context.industry ?? "shop").toString().replace(/_/g, " ");
  const business = context.business_name?.trim() ?? "";
  const description = context.description?.trim() ?? "";
  const request = intent?.trim() ?? "";

  const base = [business, industry, description, request].filter(Boolean).join(" ").trim();
  const hero = base ? `${base} brand hero product` : `${industry} small business storefront`;
  const about = base ? `${base} studio lifestyle brand story` : `${industry} shop interior`;
  const products = base ? `${base} product flat lay` : `${industry} product photography`;

  return { hero, about, products };
}

export async function fetchTemplatePlanFromUnsplash(
  context: {
    business_name?: string | null;
    industry?: string | null;
    description?: string | null;
  },
  intent: string,
): Promise<{
  hero_url: string;
  about_url: string;
  promo_url: string;
  spotlight_url: string;
  product_urls: string[];
} | null> {
  if (!getUnsplashAccessKey()) return null;

  const queries = buildUnsplashSearchQueries(context, intent);
  const [heroResults, aboutResults, productResults] = await Promise.all([
    searchUnsplashPhotos(queries.hero, 3),
    searchUnsplashPhotos(queries.about, 3),
    searchUnsplashPhotos(queries.products, 8),
  ]);

  const heroUrl = heroResults[0] ? formatUnsplashPhotoUrl(heroResults[0]) : "";
  if (!heroUrl) return null;

  const aboutUrl = aboutResults[0]
    ? formatUnsplashPhotoUrl(aboutResults[0], 1400)
    : heroResults[1]
      ? formatUnsplashPhotoUrl(heroResults[1], 1400)
      : heroUrl;

  const productUrls = productResults
    .map((photo) => formatUnsplashPhotoUrl(photo, 900))
    .filter(Boolean);

  const promoUrl = productUrls[0] ?? aboutUrl;
  const spotlightUrl = aboutUrl;

  return {
    hero_url: heroUrl,
    about_url: aboutUrl,
    promo_url: promoUrl,
    spotlight_url: spotlightUrl,
    product_urls: productUrls.length ? productUrls : [heroUrl, aboutUrl, promoUrl],
  };
}
