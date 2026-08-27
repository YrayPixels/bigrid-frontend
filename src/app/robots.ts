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
  const hostSitemap = `${baseUrl}/sitemap.xml`;

  // Storefront host: advertise this shop's subdomain sitemap only.
  if (slug) {
    return {
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/cart", "/checkout", "/checkout/success"],
      },
      sitemap: hostSitemap,
    };
  }

  // Platform host: www sitemap + each published store's subdomain sitemap.
  // (Platform sitemap must stay same-host; store URLs are discovered via these refs.)
  const sitemaps = [hostSitemap];
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
      disallow: ["/admin", "/api", "/app", "/onboarding"],
    },
    sitemap: sitemaps,
    host: baseUrl.replace(/^https?:\/\//, ""),
  };
}
