import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { parseStoreSlugFromHost } from "@/lib/store-host";
import { getSitemapBaseUrl } from "@/lib/site-seo";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const headersList = await headers();
  const host = headersList.get("host");
  const slug = parseStoreSlugFromHost(host);
  const baseUrl = getSitemapBaseUrl(host);
  const sitemap = `${baseUrl}/sitemap.xml`;

  if (slug) {
    return {
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: ["/cart", "/checkout", "/checkout/success"],
      },
      sitemap,
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/app", "/onboarding"],
    },
    sitemap,
    host: baseUrl.replace(/^https?:\/\//, ""),
  };
}
