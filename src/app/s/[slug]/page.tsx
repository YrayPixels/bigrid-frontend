import type { Metadata } from "next";
import type { ReactNode } from "react";
import StorefrontHomePageClient from "./page.client";
import { storefrontApi } from "@/lib/api/storefront";
import { JsonLd } from "@/lib/seo/json-ld";
import {
  breadcrumbSchema,
  faqSchema,
  localBusinessSchema,
  storeWebSiteSchema,
} from "@/lib/seo/schema";
import { countryCodeFromBusinessLocation } from "@/lib/seo/storefront-meta";
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
    const title =
      data.storefront.seo.title ||
      `${storeName} — Online Store | Shop on Bizgrid`;
    const description =
      data.storefront.seo.description ||
      data.store.description ||
      `Shop ${storeName} online. Browse products and checkout securely on Bizgrid.`;

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
      title: `${slug} | Bizgrid`,
      description: "Shop online with Bizgrid.",
      alternates: { canonical: "./" },
      robots: { index: false, follow: false },
    };
  }
}

export default async function StorefrontHomePage({
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
    const description =
      data.storefront.seo.description || data.store.description || null;
    const logo = data.store.logo_url
      ? resolveMetadataAssetUrl(baseUrl, data.store.logo_url)
      : null;
    const faqItems = data.storefront.pages?.faq?.items ?? [];

    schema = (
      <>
        <JsonLd
          data={storeWebSiteSchema({
            name: storeName,
            url: baseUrl,
            description,
          })}
        />
        <JsonLd
          data={localBusinessSchema({
            name: storeName,
            description,
            url: baseUrl,
            logo,
            email: data.store.contact_email,
            phone: data.store.contact_phone,
            addressCountry: countryCodeFromBusinessLocation(data.store.business_location),
          })}
        />
        <JsonLd data={breadcrumbSchema([{ name: "Home", url: baseUrl }])} />
        {faqItems.length > 0 ? <JsonLd data={faqSchema(faqItems)} /> : null}
      </>
    );
  } catch {
    schema = null;
  }

  return (
    <>
      {schema}
      <StorefrontHomePageClient />
    </>
  );
}
