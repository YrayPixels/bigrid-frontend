import { isPlatformRootHost, parseStoreSlugFromHost, STORE_PLATFORM_DOMAIN } from "@/lib/store-host";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  `https://${STORE_PLATFORM_DOMAIN}`;

function supportsSubdomainStorefronts(): boolean {
  return !STORE_PLATFORM_DOMAIN.endsWith(".vercel.app");
}

/** Canonical public URL for a merchant storefront (server-safe). */
export function getStorefrontBaseUrl(slug: string): string {
  if (!supportsSubdomainStorefronts()) {
    return `${SITE_URL}/s/${slug}`;
  }

  return `https://${slug}.${STORE_PLATFORM_DOMAIN}`;
}

/** Base URL for sitemap entries based on the incoming request host. */
export function getSitemapBaseUrl(host: string | null | undefined): string {
  const slug = parseStoreSlugFromHost(host);
  if (slug) {
    return getStorefrontBaseUrl(slug);
  }

  if (host && !isPlatformRootHost(host)) {
    const hostname = host.split(":")[0];
    return `https://${hostname}`;
  }

  return SITE_URL;
}

export const PLATFORM_PUBLIC_PATHS = ["/", "/login", "/signup", "/privacy"] as const;

export const PLATFORM_PRIVACY_URL = "/privacy";

export const STOREFRONT_STATIC_PATHS = [
  "/",
  "/products",
  "/about",
  "/contact",
  "/faq",
  "/privacy-policy",
] as const;

export function resolveMetadataAssetUrl(baseUrl: string, url: string): string {
  if (!url) return baseUrl;
  if (/^https?:\/\//i.test(url)) return url;
  return new URL(url, baseUrl).toString();
}
