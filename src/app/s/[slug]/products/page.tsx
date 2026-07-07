import type { Metadata } from "next";
import { headers } from "next/headers";
import ProductsPageClient from "./page.client";
import { getSitemapBaseUrl, resolveMetadataAssetUrl } from "@/lib/site-seo";
import { loadStorefront } from "@/lib/storefront/load-storefront";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const host = (await headers()).get("host");
  const baseUrl = getSitemapBaseUrl(host);

  try {
    const data = await loadStorefront(slug);
    const storeName = data.store.business_name || slug;
    const title = `${storeName} — Products`;
    const description = `Browse products from ${storeName}.`;

    const banner = data.storefront.media?.hero_image_url ?? undefined;
    const logo = data.store.logo_url ?? undefined;
    const ogImage = resolveMetadataAssetUrl(baseUrl, banner ?? logo ?? "/bizgridlogo.png");
    const icon = resolveMetadataAssetUrl(baseUrl, logo ?? "/favicon.png");

    return {
      metadataBase: new URL(baseUrl),
      title,
      description,
      alternates: { canonical: "./" },
      openGraph: {
        title,
        description,
        type: "website",
        url: "./",
        siteName: storeName,
        images: [{ url: ogImage }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImage],
      },
      icons: { icon, apple: icon },
    };
  } catch {
    return {
      metadataBase: new URL(baseUrl),
      title: `${slug} — Products`,
      description: "Browse products.",
      alternates: { canonical: "./" },
    };
  }
}

export default function ProductsPage() {
  return <ProductsPageClient />;
}
