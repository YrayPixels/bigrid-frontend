import type { Metadata } from "next";
import type { ReactNode } from "react";
import FaqPageClient from "./page.client";
import { storefrontApi } from "@/lib/api/storefront";
import { JsonLd } from "@/lib/seo/json-ld";
import { breadcrumbSchema, faqSchema } from "@/lib/seo/schema";
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
    const pageTitle = data.storefront.pages?.faq?.title?.trim() || "FAQ";

    const title = `${storeName} — ${pageTitle}`;
    const description = `Frequently asked questions about ${storeName}. Shipping, returns, payments, and more.`;

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
      title: `${slug} — FAQ`,
      description: "Frequently asked questions.",
      alternates: { canonical: "./" },
      robots: { index: false, follow: false },
    };
  }
}

export default async function FaqPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const baseUrl = getStorefrontBaseUrl(slug);

  let schema: ReactNode = null;
  try {
    const data = await storefrontApi.getBySlug(slug);
    const storeName = data.store.business_name || slug;
    const faqItems = data.storefront.pages?.faq?.items ?? [];

    schema = (
      <>
        <JsonLd
          data={breadcrumbSchema([
            { name: storeName, url: baseUrl },
            { name: "FAQ", url: `${baseUrl}/faq` },
          ])}
        />
        {faqItems.length > 0 ? <JsonLd data={faqSchema(faqItems)} /> : null}
      </>
    );
  } catch {
    schema = null;
  }

  return (
    <>
      {schema}
      <FaqPageClient />
    </>
  );
}
