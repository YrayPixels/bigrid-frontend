import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { parseStoreSlugFromHost } from "@/lib/store-host";
import { storefrontApi } from "@/lib/api/storefront";
import { allMarketingSeoPaths } from "@/lib/seo/pages";
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
  // Same-host marketing URLs only. Merchant storefronts live on
  // https://{slug}.bizgrid.shop and are advertised via robots.txt sitemap refs —
  // do not list /s/{slug} here (non-canonical duplicates under www).
  const baseUrl = getSitemapBaseUrl(host);
  const now = new Date();

  const staticPaths = new Set<string>([
    ...PLATFORM_PUBLIC_PATHS,
    ...allMarketingSeoPaths(),
  ]);

  return [...staticPaths].map((path) => ({
    url: toAbsoluteUrl(baseUrl, path),
    lastModified: now,
    changeFrequency:
      path === "/"
        ? "weekly"
        : path === "/stores" || path.startsWith("/discover/")
          ? "daily"
          : path.startsWith("/academy") || path.startsWith("/solutions")
            ? "weekly"
            : "monthly",
    priority:
      path === "/"
        ? 1
        : path === "/stores" || path.startsWith("/solutions/")
          ? 0.8
          : path.startsWith("/academy") || path.startsWith("/industries/")
            ? 0.7
            : 0.6,
  }));
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
