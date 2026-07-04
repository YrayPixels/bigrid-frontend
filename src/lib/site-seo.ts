import { parseStoreSlugFromHost, STORE_PLATFORM_DOMAIN } from "@/lib/store-host";

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

  return SITE_URL;
}

export const PLATFORM_PUBLIC_PATHS = ["/", "/login", "/signup"] as const;

export const STOREFRONT_STATIC_PATHS = [
  "/",
  "/products",
  "/about",
  "/contact",
  "/faq",
  "/privacy-policy",
] as const;
