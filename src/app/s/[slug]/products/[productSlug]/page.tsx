import type { Metadata } from "next";
import ProductDetailPageClient from "./page.client";
import { getStorefrontBaseUrl, resolveMetadataAssetUrl } from "@/lib/site-seo";
import { loadStorefront } from "@/lib/storefront/load-storefront";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}): Promise<Metadata> {
  const { slug, productSlug } = await params;
  const baseUrl = getStorefrontBaseUrl(slug);

  try {
    const data = await loadStorefront(slug);
    const storeName = data.store.business_name || slug;
    const product = (data.storefront.products ?? []).find((p) => p.slug === productSlug);

    const title = product?.name ? `${product.name} — ${storeName}` : `${storeName} — Product`;
    const description =
      product?.description?.trim() ||
      data.storefront.seo.description ||
      data.store.description ||
      `Buy online from ${storeName}.`;

    const banner = data.storefront.media?.hero_image_url ?? undefined;
    const logo = data.store.logo_url ?? undefined;
    const ogImage = resolveMetadataAssetUrl(
      baseUrl,
      product?.image_url ?? banner ?? logo ?? "/bizgridlogo.png",
    );
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
      title: `${slug} — Product`,
      description: "View product details.",
      alternates: { canonical: "./" },
      robots: { index: false, follow: false },
    };
  }
}

export default function ProductDetailPage() {
  return <ProductDetailPageClient />;
}
