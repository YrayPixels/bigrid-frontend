"use client";

import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import { toast } from "sonner";
import type { Store, StorefrontContent, StoreProduct } from "@/lib/api/types";
import { EditableImage } from "@/components/storefront/theme/editable-image";
import { EditableText } from "@/components/storefront/theme/editable-text";
import { StorefrontLink } from "@/components/storefront/theme/storefront-link";
import { StorefrontFaqSection } from "@/components/storefront/pages/storefront-faq-section";
import { formatMoney } from "@/lib/storefront/format";
import { useCart } from "@/lib/storefront/cart-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import {
  minimalisticCategories,
  minimalisticTemplateImages,
} from "@/lib/storefront/minimalistic-defaults";
import { getHomepageProducts } from "@/lib/storefront/product-plugs";

function FloatingPill({
  className,
  color = "bg-[#c97955]",
}: {
  className: string;
  color?: string;
}) {
  return (
    <span
      className={`pointer-events-none absolute h-10 w-5 rotate-45 rounded-full opacity-75 blur-[0.2px] ${color} ${className}`}
    />
  );
}

function MinimalProductCard({
  product,
  index,
  imagePath,
  editable,
}: {
  product: StoreProduct;
  index: number;
  imagePath?: string;
  editable: boolean;
}) {
  const { addItem } = useCart();
  const { theme } = useStorefrontTheme();
  const imageUrl =
    product.image_url ??
    minimalisticTemplateImages.products[index % minimalisticTemplateImages.products.length];

  function addToCart() {
    addItem(product, 1);
    toast.success("Added to cart");
  }

  return (
    <article className="group flex h-full flex-col text-left">
      <Link
        href={editable ? "#" : `/products/${product.slug}`}
        className={editable ? "pointer-events-none block" : "block"}
        aria-disabled={editable}
      >
        <div className="aspect-square overflow-hidden rounded-xl bg-[#f0f0f0]">
          <EditableImage
            path={imagePath}
            src={imageUrl}
            alt={product.name}
            className="h-full w-full"
            imgClassName="object-cover object-center transition duration-500 group-hover:scale-105"
          />
        </div>
      </Link>
      <div className="mt-3 flex min-h-[2.75rem] items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="line-clamp-1 text-sm font-bold" style={{ color: theme.palette.text }}>
            {product.name}
          </h3>
          <p className="mt-1 line-clamp-1 text-[11px]" style={{ color: theme.palette.muted }}>
            {product.description}
          </p>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold"
          style={{ color: theme.palette.text }}
        >
          <Star className="h-3 w-3 fill-[#efc64b] text-[#efc64b]" />
          {index % 3 === 0 ? "4.9" : "4.8"}
        </span>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 pt-3">
        <span className="text-sm font-bold" style={{ color: theme.palette.text }}>
          {formatMoney(product.price, product.currency)}
        </span>
        <button
          type="button"
          onClick={addToCart}
          disabled={editable}
          className="shrink-0 rounded-full px-3 py-1.5 text-[10px] font-semibold transition disabled:cursor-default disabled:opacity-70"
          style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
        >
          Add to Cart
        </button>
      </div>
    </article>
  );
}

export function MinimalisticHome({
  store,
  storefront,
}: {
  store: Store;
  storefront: StorefrontContent;
}) {
  const { theme, mode } = useStorefrontTheme();
  const products = storefront.products ?? [];
  const { products: featuredProducts, source: productSource } = getHomepageProducts(
    storefront,
    "minimalistic",
    6,
  );
  const heroImageUrl = storefront.media?.hero_image_url ?? minimalisticTemplateImages.hero;
  const aboutImageUrl = storefront.media?.about_image_url ?? minimalisticTemplateImages.about;
  return (
    <div style={{ backgroundColor: theme.palette.background, color: theme.palette.text }}>
      <section className="relative overflow-hidden px-4 pb-14 pt-14 text-center sm:px-6 lg:pb-20 lg:pt-20">
        <FloatingPill className="left-[8%] top-[55%]" color="bg-[#d99359]" />
        <FloatingPill className="left-[29%] top-[61%]" color="bg-[#eadfbd]" />
        <FloatingPill className="right-[20%] top-[52%]" color="bg-[#eef0c8]" />
        <span className="pointer-events-none absolute left-[14%] top-[67%] h-9 w-9 rounded-full bg-[#e4e1c8]" />
        <span className="pointer-events-none absolute right-[6%] top-[58%] h-10 w-10 rounded-full bg-[#dedbc1]" />

        <div className="relative mx-auto max-w-4xl">
          <div
            className="mx-auto mb-7 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-sm"
            style={{ backgroundColor: `${theme.palette.surface}b3` }}
          >
            <span
              className="h-2 w-5 rounded-full"
              style={{ backgroundColor: theme.palette.primary }}
            />
            Products List
            <span
              className="h-2 w-5 rounded-full"
              style={{ backgroundColor: theme.palette.primary }}
            />
          </div>
          <EditableText
            path="hero.headline"
            value={storefront.hero.headline}
            as="h1"
            className="mx-auto max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl"
          />
          <EditableText
            path="hero.subheadline"
            value={storefront.hero.subheadline}
            as="p"
            className="mx-auto mt-4 max-w-lg text-sm leading-6"
            style={{ color: theme.palette.muted }}
            multiline
          />
        </div>

        <EditableImage
          path="media.hero_image_url"
          src={heroImageUrl}
          alt={`${store.business_name} wellness essentials`}
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 mx-auto h-56 max-w-5xl opacity-20"
          imgClassName="object-cover object-center"
        />
      </section>

      <section
        className="rounded-t-[2.5rem] px-4 py-10 sm:px-6 lg:py-14"
        style={{ backgroundColor: theme.palette.surface }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-wrap justify-center gap-3">
            {minimalisticCategories.map((category, index) => (
              <span
                key={category}
                className={`rounded-full px-4 py-2 text-[11px] font-semibold ${
                  index === 0 ? "" : ""
                }`}
                style={{
                  backgroundColor: index === 0 ? theme.palette.primary : theme.palette.background,
                  color: index === 0 ? theme.palette.surface : theme.palette.muted,
                }}
              >
                {category}
              </span>
            ))}
          </div>

          <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {featuredProducts.map((product, index) => (
              <MinimalProductCard
                key={product.id}
                product={product}
                index={index}
                imagePath={
                  productSource === "merchant_products" && products[index]?.id === product.id
                    ? `products.${index}.image_url`
                    : undefined
                }
                editable={mode === "edit"}
              />
            ))}
          </div>
        </div>
      </section>

      <section
        className="px-4 pb-12 sm:px-6 lg:pb-16"
        style={{ backgroundColor: theme.palette.surface }}
      >
        <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2">
          <EditableImage
            path="media.about_image_url"
            src={aboutImageUrl}
            alt={`${store.business_name} lifestyle`}
            className="min-h-56 rounded-xl bg-[#eef0df]"
            imgClassName="object-cover object-center"
          />
          <div
            className="flex min-h-56 flex-col justify-center rounded-xl p-8"
            style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
          >
            <h2 className="text-2xl font-semibold tracking-[-0.035em]">
              Ready to Elevate Your Health
            </h2>
            <EditableText
              path="about.body"
              value={storefront.about.body}
              as="p"
              className="mt-4 max-w-sm text-sm leading-6"
              style={{ color: `${theme.palette.background}bf` }}
              multiline
            />
            <StorefrontLink href="/products" className="mt-6 inline-flex w-fit items-center gap-2">
              <span
                className="rounded-full px-4 py-2 text-xs font-semibold"
                style={{ backgroundColor: theme.palette.background, color: theme.palette.primary }}
              >
                Explore now
              </span>
              <ArrowUpRight className="h-4 w-4" />
            </StorefrontLink>
          </div>
        </div>
      </section>

      <StorefrontFaqSection faqPage={storefront.pages?.faq} />
    </div>
  );
}
