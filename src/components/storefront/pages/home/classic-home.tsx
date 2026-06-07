"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Store, StorefrontContent } from "@/lib/api/types";
import { EditableImage } from "@/components/storefront/theme/editable-image";
import { EditableText } from "@/components/storefront/theme/editable-text";
import { StorefrontFaqSection } from "@/components/storefront/pages/storefront-faq-section";
import { ProductCardThemed } from "@/components/storefront/theme/product-card-themed";
import { getHomepageProducts } from "@/lib/storefront/product-plugs";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

export function ClassicHome({
  store,
  storefront,
  variant = "classic",
}: {
  store: Store;
  storefront: StorefrontContent;
  variant?: "classic" | "editorial" | "bold_grid";
}) {
  const { theme, mode } = useStorefrontTheme();
  const products = storefront.products ?? [];
  const isEditorial = variant === "editorial";
  const isBoldGrid = variant === "bold_grid";
  const CtaLink = mode === "edit" ? "span" : Link;
  const heroImageUrl = storefront.media?.hero_image_url;
  const { products: homepageProducts, source: productSource } = getHomepageProducts(
    storefront,
    theme.id,
    isBoldGrid ? 6 : 3,
  );

  return (
    <div>
      <section
        className={`relative overflow-hidden px-4 py-16 sm:px-6 sm:py-24 ${
          isEditorial ? "text-center" : ""
        }`}
        style={{
          background: heroImageUrl
            ? undefined
            : isBoldGrid
              ? `linear-gradient(135deg, ${theme.brandColor}24 0%, ${theme.brandColor}08 52%, transparent 52%)`
              : `linear-gradient(135deg, ${theme.brandColor}18, ${theme.brandColor}05)`,
        }}
      >
        {heroImageUrl || mode === "edit" ? (
          <>
            <EditableImage
              path="media.hero_image_url"
              src={heroImageUrl}
              alt={`${store.business_name} hero`}
              className="absolute inset-0 h-full w-full"
            />
            {heroImageUrl ? <div className="absolute inset-0 bg-background/85" /> : null}
          </>
        ) : null}
        <div className={`relative w-full ${isEditorial ? "grid place-items-center" : ""}`}>
          <span
            className="inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
            style={{ backgroundColor: `${theme.brandColor}22`, color: theme.brandColor }}
          >
            {store.business_name} · {variant.replace("_", " ")}
          </span>
          <EditableText
            path="hero.headline"
            value={storefront.hero.headline}
            as="h1"
            className={`mt-4 w-full text-4xl font-bold tracking-tight sm:text-5xl ${isBoldGrid ? "sm:text-6xl" : ""}`}
            style={{ fontFamily: theme.displayFont }}
          />
          <EditableText
            path="hero.subheadline"
            value={storefront.hero.subheadline}
            as="p"
            className="mt-4 w-full text-lg text-muted-foreground"
            multiline
          />
          <CtaLink
            {...(mode === "edit"
              ? {}
              : {
                  href: "/products",
                  className:
                    "mt-8 inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold text-white shadow-elevated",
                  style: { backgroundColor: theme.brandColor },
                })}
            className={
              mode === "edit"
                ? "mt-8 inline-flex cursor-default items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold text-white shadow-elevated"
                : undefined
            }
            style={mode === "edit" ? { backgroundColor: theme.brandColor } : undefined}
          >
            <EditableText path="hero.cta_label" value={storefront.hero.cta_label} as="span" />
            {mode !== "edit" ? <ArrowRight className="h-4 w-4" /> : null}
          </CtaLink>
        </div>
      </section>

      <section className="w-full px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold" style={{ fontFamily: theme.displayFont }}>
              {isEditorial ? "The collection" : "Featured products"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {isBoldGrid
                ? "A quick look at what customers are buying now."
                : "Browse the catalog and add items to your cart."}
            </p>
          </div>
          {mode !== "edit" ? (
            <Link
              href="/products"
              className="text-sm font-semibold"
              style={{ color: theme.brandColor }}
            >
              View all
            </Link>
          ) : null}
        </div>
        <div className={`grid gap-6 ${theme.productGridCols}`}>
          {homepageProducts.map((product, index) => (
            <ProductCardThemed
              key={product.id}
              product={product}
              imagePath={
                productSource === "merchant_products" && products[index]?.id === product.id
                  ? `products.${index}.image_url`
                  : undefined
              }
            />
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-card">
        <div
          className={`grid w-full gap-8 px-4 py-16 sm:grid-cols-3 sm:px-6 ${isEditorial ? "text-center" : ""}`}
        >
          {storefront.value_props.map((item, index) => (
            <div key={item.title}>
              <div
                className={`grid h-9 w-9 place-items-center text-sm font-bold text-white ${isEditorial ? "mx-auto rounded-full" : "rounded-lg"}`}
                style={{ backgroundColor: theme.brandColor }}
              >
                {index + 1}
              </div>
              <EditableText
                path={`value_props.${index}.title`}
                value={item.title}
                as="h3"
                className="mt-3 text-lg font-semibold"
                style={{ fontFamily: theme.displayFont }}
              />
              <EditableText
                path={`value_props.${index}.body`}
                value={item.body}
                as="p"
                className="mt-2 text-sm text-muted-foreground"
                multiline
              />
            </div>
          ))}
        </div>
      </section>

      <StorefrontFaqSection faqPage={storefront.pages?.faq} />
    </div>
  );
}
