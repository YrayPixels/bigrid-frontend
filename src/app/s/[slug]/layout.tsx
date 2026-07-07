import type { Metadata } from "next";
import { headers } from "next/headers";
import { StorefrontGate } from "@/components/storefront/storefront-gate";
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
    const title = data.storefront.seo.title || data.store.business_name || `${slug} | Bizgrid`;
    const description =
      data.storefront.seo.description || data.store.description || "Shop online with Bizgrid.";

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
        siteName: data.store.business_name || "Bizgrid",
        images: [{ url: ogImage }],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [ogImage],
      },
      icons: {
        icon,
        apple: icon,
      },
    };
  } catch {
    return {
      metadataBase: new URL(baseUrl),
      title: `${slug} | Bizgrid`,
      description: "Shop online with Bizgrid.",
      alternates: { canonical: "./" },
    };
  }
}

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await loadStorefront(slug);
  return (
    <StorefrontGate slug={slug} data={data}>
      {children}
    </StorefrontGate>
  );
}
