import type { Metadata } from "next";
import ContactPageClient from "./page.client";
import { getStorefrontBaseUrl, resolveMetadataAssetUrl } from "@/lib/site-seo";
import { loadStorefront } from "@/lib/storefront/load-storefront";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = getStorefrontBaseUrl(slug);

  try {
    const data = await loadStorefront(slug);
    const storeName = data.store.business_name || slug;
    const pageTitle = data.storefront.pages?.contact?.title?.trim() || "Contact";

    const title = `${storeName} — ${pageTitle}`;
    const description =
      data.storefront.pages?.contact?.body?.trim() ||
      `Get in touch with ${storeName} to ask questions or place an order.`;

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
      title: `${slug} — Contact`,
      description: "Contact this store.",
      alternates: { canonical: "./" },
      robots: { index: false, follow: false },
    };
  }
}

export default function ContactPage() {
  return <ContactPageClient />;
}
