import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { storefrontApi } from "@/lib/api/storefront";
import { parseStoreSlugFromHost } from "@/lib/store-host";
import { getSitemapBaseUrl, getStorefrontBaseUrl } from "@/lib/site-seo";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const host = headersList.get("host");
  const slug = parseStoreSlugFromHost(host);
  const baseUrl = getSitemapBaseUrl(host);
  const platformSitemap = `${baseUrl}/sitemap.xml`;

  if (slug) {
    return {
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/cart", "/checkout", "/checkout/success"],
      },
      sitemap: platformSitemap,
    };
  }

  // robots.txt may reference sitemaps on other hosts; platform sitemap cannot.
  const sitemaps = [platformSitemap];
  try {
    const published = await storefrontApi.listPublished();
    for (const store of published) {
      if (!store.slug) continue;
      sitemaps.push(`${getStorefrontBaseUrl(store.slug)}/sitemap.xml`);
    }
  } catch {
    // Keep platform sitemap only if the index endpoint is unavailable.
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/app", "/onboarding", "/login", "/signup"],
    },
    sitemap: sitemaps,
    host: baseUrl.replace(/^https?:\/\//, ""),
  };
}
