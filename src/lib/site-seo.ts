import { parseStoreSlugFromHost, STORE_PLATFORM_DOMAIN } from "@/lib/store-host";

/** Canonical platform origin (apex redirects to www in production). */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  `https://www.${STORE_PLATFORM_DOMAIN}`;

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

/**
 * Base URL for sitemap/robots entries for the current request host.
 * Google requires every <loc> to match the sitemap's host exactly
 * (www vs apex and subdomains are different hosts).
 */
export function getSitemapBaseUrl(host: string | null | undefined): string {
  const slug = parseStoreSlugFromHost(host);
  if (slug) {
    return getStorefrontBaseUrl(slug);
  }

  if (host) {
    const hostname = host.split(":")[0].toLowerCase();
    if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return `http://${host}`;
    }
    return `https://${hostname}`;
  }

  return SITE_URL;
}

/** Indexable platform marketing/legal pages (same-host sitemap only). */
export const PLATFORM_PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/privacy",
  "/terms",
  "/stores",
  "/academy",
  "/industries",
] as const;

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
