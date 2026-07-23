import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { parseStoreSlugFromHost } from "@/lib/store-host";
import { storefrontApi } from "@/lib/api/storefront";
import {
  getSitemapBaseUrl,
  getStorefrontBaseUrl,
  PLATFORM_PUBLIC_PATHS,
  STOREFRONT_STATIC_PATHS,
} from "@/lib/site-seo";

function toAbsoluteUrl(baseUrl: string, path: string): string {
  if (path === "/") {
    return baseUrl;
  }

  return `${baseUrl}${path}`;
}

function parseLastModified(value: string | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

async function buildPlatformSitemap(host: string | null): Promise<MetadataRoute.Sitemap> {
  // Only same-host URLs are allowed here. Merchant subdomains are advertised via robots.txt.
  const baseUrl = getSitemapBaseUrl(host);
  const now = new Date();

  const entries: MetadataRoute.Sitemap = PLATFORM_PUBLIC_PATHS.map((path) => ({
    url: toAbsoluteUrl(baseUrl, path),
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : path === "/stores" ? "daily" : "monthly",
    priority: path === "/" ? 1 : path === "/stores" ? 0.8 : 0.6,
  }));

  // Path-based storefront URLs stay on the platform host and help Google discover shops.
  // Canonical tags on /s/[slug] point at the preferred subdomain URL when available.
  try {
    const published = await storefrontApi.listPublished();
    for (const store of published) {
      if (!store.slug) continue;
      entries.push({
        url: toAbsoluteUrl(baseUrl, `/s/${store.slug}`),
        lastModified: parseLastModified(store.published_at) ?? now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch {
    // Platform pages only if the index endpoint is unavailable.
  }

  return entries;
}

async function buildStorefrontSitemap(slug: string): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getStorefrontBaseUrl(slug);
  const now = new Date();

  try {
    const data = await storefrontApi.getBySlug(slug);
    const lastModified = parseLastModified(data.store.published_at) ?? now;

    const entries: MetadataRoute.Sitemap = STOREFRONT_STATIC_PATHS.map((path) => ({
      url: toAbsoluteUrl(baseUrl, path),
      lastModified,
      changeFrequency: path === "/" ? "weekly" : "monthly",
      priority: path === "/" ? 1 : 0.7,
    }));

    for (const product of data.storefront.products ?? []) {
      if ((product.status ?? "active") !== "active" || !product.slug) {
        continue;
      }

      entries.push({
        url: toAbsoluteUrl(baseUrl, `/products/${product.slug}`),
        lastModified,
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }

    return entries;
  } catch {
    return [
      {
        url: baseUrl,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 1,
      },
    ];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers();
  const host = headersList.get("host");
  const slug = parseStoreSlugFromHost(host);

  if (slug) {
    return buildStorefrontSitemap(slug);
  }

  return buildPlatformSitemap(host);
}
