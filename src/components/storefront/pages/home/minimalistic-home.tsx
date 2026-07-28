"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { Store, StorefrontContent } from "@/lib/api/types";
import { EditableHeroMedia } from "@/components/storefront/theme/editable-hero-media";
import { EditableImage } from "@/components/storefront/theme/editable-image";
import { EditableText } from "@/components/storefront/theme/editable-text";
import { MinimalisticProductCard } from "@/components/storefront/theme/minimalistic-product-card";
import { StorefrontLink } from "@/components/storefront/theme/storefront-link";
import { StorefrontFaqSection } from "@/components/storefront/pages/storefront-faq-section";
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

export function MinimalisticHome({
  store,
  storefront,
}: {
  store: Store;
  storefront: StorefrontContent;
}) {
  const { theme, mode } = useStorefrontTheme();
  const { categories: apiCategories, discounts } = useStorefront();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const products = useMemo(() => storefront.products ?? [], [storefront.products]);
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
      <section className="relative isolate flex min-h-[min(68vh,34rem)] items-center justify-center overflow-hidden px-4 py-12 text-center sm:min-h-[min(78vh,44rem)] sm:px-6 sm:py-20 lg:py-24">
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
          <div className="mx-auto mb-5 inline-flex max-w-full items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-semibold shadow-sm backdrop-blur-md sm:mb-8 sm:px-4 sm:py-2 sm:text-sm">
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
            className="mx-auto max-w-4xl text-[1.75rem] font-semibold leading-[1.12] tracking-[-0.035em] text-white sm:text-5xl sm:leading-[1.05] sm:tracking-[-0.04em] md:text-6xl lg:text-7xl"
            placeholder="Headline"
          />
          <EditableText
            path="hero.subheadline"
            value={storefront.hero.subheadline}
            as="p"
            className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-white/85 sm:mt-6 sm:text-lg sm:leading-8 md:text-xl md:leading-9"
            multiline
            placeholder="Supporting text"
          />
          <div className="mt-6 flex justify-center sm:mt-8">
            <StorefrontLink
              href="/products"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm"
              style={{ backgroundColor: theme.palette.background, color: theme.palette.primary }}
            >
              <EditableText
                path="hero.cta_label"
                value={storefront.hero.cta_label || "Explore now"}
                as="span"
                className="text-inherit"
                placeholder="Button label"
              />
              <ArrowUpRight className="h-4 w-4 shrink-0" />
            </StorefrontLink>
          </div>
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

          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-3">
            {visibleProducts.map((product, index) => {
              const originalIndex = products.findIndex((item) => item.id === product.id);
              return (
                <MinimalisticProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  imagePath={
                    productSource === "merchant_products" && originalIndex >= 0
                      ? `products.${originalIndex}.image_url`
                      : undefined
                  }
                  editable={mode === "edit"}
                  discounts={discounts}
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
