"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Star } from "lucide-react";
import { toast } from "sonner";
import type { Store, StorefrontContent, StoreProduct } from "@/lib/api/types";
import { EditableHeroMedia } from "@/components/storefront/theme/editable-hero-media";
import { EditableImage } from "@/components/storefront/theme/editable-image";
import { EditableText } from "@/components/storefront/theme/editable-text";
import { StorefrontLink } from "@/components/storefront/theme/storefront-link";
import { StorefrontFaqSection } from "@/components/storefront/pages/storefront-faq-section";
import { formatMoney } from "@/lib/storefront/format";
import { useCart } from "@/lib/storefront/cart-context";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { minimalisticTemplateImages } from "@/lib/storefront/minimalistic-defaults";
import { getHomepageProducts } from "@/lib/storefront/product-plugs";
import {
  buildStorefrontCategoryTree,
  categoryLabel,
  productMatchesCategoryFilter,
  resolveStorefrontFilterCategories,
} from "@/lib/storefront/category-filters";

const HOME_CATEGORY_LIMIT = 5;

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
  const { categories: apiCategories } = useStorefront();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const products = storefront.products ?? [];
  const { products: featuredProducts, source: productSource } = getHomepageProducts(
    storefront,
    "minimalistic",
    6,
  );
  const allFilterCategories = useMemo(
    () => resolveStorefrontFilterCategories(apiCategories, products),
    [apiCategories, products],
  );
  const filterCategories = useMemo(
    () =>
      buildStorefrontCategoryTree(allFilterCategories)
        .slice(0, HOME_CATEGORY_LIMIT)
        .map((node) => node.category),
    [allFilterCategories],
  );
  const visibleProducts = useMemo(
    () =>
      featuredProducts.filter((product) =>
        productMatchesCategoryFilter(product, selectedCategoryId, allFilterCategories),
      ),
    [allFilterCategories, featuredProducts, selectedCategoryId],
  );
  const heroImageUrl = storefront.media?.hero_image_url ?? minimalisticTemplateImages.hero;
  const heroVideoUrl = storefront.media?.hero_video_url ?? null;
  const aboutImageUrl = storefront.media?.about_image_url ?? minimalisticTemplateImages.about;
  return (
    <div style={{ backgroundColor: theme.palette.background, color: theme.palette.text }}>
      <section className="relative isolate flex min-h-[min(72vh,40rem)] items-center justify-center overflow-hidden px-4 py-16 text-center sm:min-h-[min(78vh,44rem)] sm:px-6 sm:py-20 lg:py-24">
        <EditableHeroMedia
          imagePath="media.hero_image_url"
          videoPath="media.hero_video_url"
          imageSrc={heroImageUrl}
          videoSrc={heroVideoUrl}
          alt={`${store.business_name} banner`}
          className="absolute inset-0 -z-10"
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-black/50 via-black/40 to-black/55"
          aria-hidden
        />

        <div className="relative mx-auto max-w-5xl text-white">
          <div className="mx-auto mb-8 inline-flex max-w-full items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-semibold shadow-sm backdrop-blur-md sm:text-sm">
            <span
              className="h-2 w-5 shrink-0 rounded-full"
              style={{ backgroundColor: theme.palette.primary }}
            />
            <EditableText
              path="hero.eyebrow"
              value={storefront.hero.eyebrow || "Products List"}
              as="span"
              className="min-w-[4rem] text-center text-white"
              placeholder="Badge"
            />
            <span
              className="h-2 w-5 shrink-0 rounded-full"
              style={{ backgroundColor: theme.palette.primary }}
            />
          </div>
          <EditableText
            path="hero.headline"
            value={storefront.hero.headline}
            as="h1"
            className="mx-auto max-w-4xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-5xl md:text-6xl lg:text-7xl"
            placeholder="Headline"
          />
          <EditableText
            path="hero.subheadline"
            value={storefront.hero.subheadline}
            as="p"
            className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/85 sm:mt-6 sm:text-lg sm:leading-8 md:text-xl md:leading-9"
            multiline
            placeholder="Supporting text"
          />
        </div>
      </section>

      <section
        className="rounded-t-[2.5rem] px-4 py-10 sm:px-6 lg:py-14"
        style={{ backgroundColor: theme.palette.surface }}
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-wrap justify-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setSelectedCategoryId(null)}
              className="rounded-full px-4 py-2 text-[11px] font-semibold transition"
              style={{
                backgroundColor: !selectedCategoryId
                  ? theme.palette.primary
                  : theme.palette.background,
                color: !selectedCategoryId ? theme.palette.surface : theme.palette.muted,
              }}
            >
              All Products
            </button>
            {filterCategories.map((category) => {
              const active = selectedCategoryId === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(active ? null : category.id)}
                  className="rounded-full px-4 py-2 text-[11px] font-semibold transition"
                  style={{
                    backgroundColor: active ? theme.palette.primary : theme.palette.background,
                    color: active ? theme.palette.surface : theme.palette.muted,
                  }}
                >
                  {categoryLabel(category)}
                </button>
              );
            })}
          </div>

          <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProducts.map((product, index) => {
              const originalIndex = products.findIndex((item) => item.id === product.id);
              return (
                <MinimalProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  imagePath={
                    productSource === "merchant_products" && originalIndex >= 0
                      ? `products.${originalIndex}.image_url`
                      : undefined
                  }
                  editable={mode === "edit"}
                />
              );
            })}
          </div>

          {visibleProducts.length === 0 ? (
            <p className="mt-6 text-center text-sm" style={{ color: theme.palette.muted }}>
              No products in this category yet.
            </p>
          ) : null}
        </div>
      </section>

      <section
        className="px-4 py-14 sm:px-6 sm:py-16 lg:py-20"
        style={{ backgroundColor: theme.palette.surface }}
      >
        <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-2">
          <EditableImage
            path="media.about_image_url"
            src={aboutImageUrl}
            alt={`${store.business_name} lifestyle`}
            className="min-h-56 rounded-xl bg-[#eef0df] sm:min-h-72"
            imgClassName="object-cover object-center"
          />
          <div
            className="flex min-h-56 flex-col justify-center rounded-xl px-7 py-10 sm:min-h-72 sm:px-8 sm:py-12"
            style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
          >
            <EditableText
              path="about.title"
              value={storefront.about.title || "Ready to Elevate Your Health"}
              as="h2"
              className="text-2xl font-semibold tracking-[-0.035em] sm:text-[1.65rem]"
              placeholder="Section title"
            />
            <EditableText
              path="about.body"
              value={storefront.about.body}
              as="p"
              className="mt-4 max-w-sm text-sm leading-6"
              style={{ color: `${theme.palette.background}bf` }}
              multiline
              placeholder="Tell customers about your store"
            />
            <StorefrontLink href="/products" className="mt-6 inline-flex w-fit items-center gap-2">
              <EditableText
                path="hero.cta_label"
                value={storefront.hero.cta_label || "Explore now"}
                as="span"
                className="rounded-full px-4 py-2 text-xs font-semibold"
                style={{ backgroundColor: theme.palette.background, color: theme.palette.primary }}
                placeholder="Button label"
              />
              <ArrowUpRight className="h-4 w-4 shrink-0" />
            </StorefrontLink>
          </div>
        </div>
      </section>

      <StorefrontFaqSection faqPage={storefront.pages?.faq} />
    </div>
  );
}
