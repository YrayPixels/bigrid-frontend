import type { Metadata } from "next";
import type { ReactNode } from "react";
import ProductDetailPageClient from "./page.client";
import { storefrontApi } from "@/lib/api/storefront";
import { JsonLd } from "@/lib/seo/json-ld";
import { breadcrumbSchema, productSchema } from "@/lib/seo/schema";
import {
  formatProductMetaDescription,
  formatProductMetaTitle,
  resolveStoreCityHint,
} from "@/lib/seo/storefront-meta";
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
    const cityHint = resolveStoreCityHint({
      shippingCities: data.checkout?.shipping_locations?.map((loc) => loc.city),
      businessLocation: data.store.business_location,
    });

    const title = product?.name
      ? formatProductMetaTitle({
          productName: product.name,
          storeName,
          cityHint,
        })
      : `${storeName} — Product`;
    const description = formatProductMetaDescription({
      productName: product?.name || "Product",
      storeName,
      description:
        product?.description?.trim() ||
        data.storefront.seo.description ||
        data.store.description,
      cityHint,
    });

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

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string; productSlug: string }>;
}) {
  const { slug, productSlug } = await params;
  const baseUrl = getStorefrontBaseUrl(slug);

  let schema: ReactNode = null;
  try {
    const data = await storefrontApi.getBySlug(slug);
    const storeName = data.store.business_name || slug;
    const product = (data.storefront.products ?? []).find((p) => p.slug === productSlug);

    if (product) {
      const productUrl = `${baseUrl}/products/${product.slug}`;
      const image = product.image_url
        ? resolveMetadataAssetUrl(baseUrl, product.image_url)
        : null;

      let aggregateRating: { ratingValue: number; reviewCount: number } | null = null;
      try {
        const reviews = await storefrontApi.listProductReviews(slug, product.id);
        if (reviews.review_count > 0) {
          aggregateRating = {
            ratingValue: reviews.average_rating,
            reviewCount: reviews.review_count,
          };
        }
      } catch {
        aggregateRating = null;
      }

      schema = (
        <>
          <JsonLd
            data={breadcrumbSchema([
              { name: storeName, url: baseUrl },
              { name: "Products", url: `${baseUrl}/products` },
              { name: product.name, url: productUrl },
            ])}
          />
          <JsonLd
            data={productSchema({
              name: product.name,
              description: product.description,
              url: productUrl,
              image,
              sku: product.sku,
              brand: product.brand,
              price: product.effective_price ?? product.sale_price ?? product.price,
              currency: product.currency || "NGN",
              availability: product.in_stock === false ? "OutOfStock" : "InStock",
              storeName,
              storeUrl: baseUrl,
              aggregateRating,
            })}
          />
        </>
      );
    }
  } catch {
    schema = null;
  }

  return (
    <>
      {schema}
      <ProductDetailPageClient />
    </>
  );
}
