"use client";

import Link from "next/link";
import { StorefrontLink } from "@/components/storefront/theme/storefront-link";
import { BadgeCheck, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import type { CSSProperties } from "react";
import type { Store, StoreDiscount, StorefrontContent, StoreProduct } from "@/lib/api/types";
import { EditableHeroMedia } from "@/components/storefront/theme/editable-hero-media";
import { EditableImage } from "@/components/storefront/theme/editable-image";
import { EditableText } from "@/components/storefront/theme/editable-text";
import { StorefrontFaqSection } from "@/components/storefront/pages/storefront-faq-section";
import { CategoryShowcaseBlock } from "@/components/storefront/blocks/category-showcase-block";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { useStorefront } from "@/lib/storefront/store-context";
import { formatMoney } from "@/lib/storefront/format";
import { fashionTemplateImages } from "@/lib/storefront/fashion-defaults";
import { getHomeBlockProps, homeBlockPath } from "@/lib/storefront/home-block-content";
import { getHomepageProducts } from "@/lib/storefront/product-plugs";
import { productUnitPrice } from "@/lib/storefront/pricing";

function discountPercentLabel(unitPrice: number, compareAtPrice: number | null): string | null {
  if (compareAtPrice == null || compareAtPrice <= unitPrice || compareAtPrice <= 0) return null;
  const percent = Math.round((1 - unitPrice / compareAtPrice) * 100);
  if (percent < 1) return null;
  return `-${percent}%`;
}

function FashionImageCard({
  imageUrl,
  alt,
  imagePath,
  label,
  className = "",
}: {
  imageUrl: string;
  alt: string;
  imagePath?: string;
  label?: string | null;
  className?: string;
}) {
  return (
    <div className={`relative bg-[#eef0ef] ${className}`}>
      <EditableImage
        path={imagePath}
        src={imageUrl}
        alt={alt}
        className="h-full w-full"
        imgClassName="object-center transition duration-500 group-hover:scale-105"
      />
      {label ? (
        <span className="absolute left-3 top-3 bg-[#80131b] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          {label}
        </span>
      ) : null}
    </div>
  );
}

function FashionProductCard({
  product,
  index,
  imagePath,
  editable,
  discounts,
}: {
  product: StoreProduct;
  index: number;
  imagePath?: string;
  editable: boolean;
  discounts: StoreDiscount[];
}) {
  const { theme } = useStorefrontTheme();
  const priced = productUnitPrice(product, discounts);
  const saleLabel = discountPercentLabel(priced.unitPrice, priced.compareAtPrice);
  const card = (
    <>
      <FashionImageCard
        imageUrl={
          product.image_url ??
          fashionTemplateImages.products[index % fashionTemplateImages.products.length]
        }
        imagePath={imagePath}
        label={saleLabel}
        alt={product.name}
        className="aspect-[4/5]"
      />
      <h3 className="mt-4 min-h-9 text-xs font-bold leading-[1.15]">{product.name}</h3>
      <p className="mt-1 line-clamp-2 text-[11px] leading-4" style={{ color: theme.palette.muted }}>
        {product.description}
      </p>
      <div className="mt-2 flex items-baseline gap-2 text-xs font-semibold tracking-tight">
        <span>{formatMoney(priced.unitPrice, product.currency)}</span>
        {priced.compareAtPrice != null ? (
          <span className="font-medium line-through" style={{ color: theme.palette.muted }}>
            {formatMoney(priced.compareAtPrice, product.currency)}
          </span>
        ) : null}
      </div>
    </>
  );

  if (editable) {
    return <div className="block text-left">{card}</div>;
  }

  return (
    <Link href={`/products/${product.slug}`} className="group block text-left">
      {card}
    </Link>
  );
}

export function FashionLookbookHome({
  store,
  storefront,
}: {
  store: Store;
  storefront: StorefrontContent;
}) {
  const { theme, mode } = useStorefrontTheme();
  const { categories, discounts } = useStorefront();
  const products = storefront.products ?? [];
  const featureIcons = [ShieldCheck, BadgeCheck, RotateCcw, Truck];
  const { products: featuredProducts, source: productSource } = getHomepageProducts(
    storefront,
    "fashion_lookbook",
    4,
  );
  const fashionValueProps = (storefront.value_props ?? []).slice(0, 4);
  const heroImageUrl = storefront.media?.hero_image_url ?? fashionTemplateImages.hero;
  const heroVideoUrl = storefront.media?.hero_video_url ?? null;
  const aboutImageUrl = storefront.media?.about_image_url ?? fashionTemplateImages.about;
  const faqPage = storefront.pages?.faq;
  const featuredGrid = getHomeBlockProps<{ title?: string; subtitle?: string }>(
    storefront,
    "featured-products",
  );
  const aboutSpotlight = getHomeBlockProps<{
    cta_label?: string;
    meta_left?: string;
    meta_right?: string;
    footer_left?: string;
    footer_right?: string;
  }>(storefront, "about-spotlight");
  const heroEyebrow =
    storefront.hero.eyebrow ||
    getHomeBlockProps<{ eyebrow?: string }>(storefront, "hero-main").eyebrow ||
    "Modern essentials";
  const aboutTitleDefault = `${store.business_name} designs modern essentials that blend comfort, simplicity, and timeless style.`;

  return (
    <div style={{ backgroundColor: theme.palette.background, color: theme.palette.text }}>
      <section className="relative">
        <div className="relative min-h-[430px] overflow-hidden bg-[#a7aaa5] sm:min-h-[560px] lg:min-h-[640px]">
          <EditableHeroMedia
            imagePath="media.hero_image_url"
            videoPath="media.hero_video_url"
            imageSrc={heroImageUrl}
            videoSrc={heroVideoUrl}
            alt={`${store.business_name} campaign`}
            className="absolute inset-0 h-full w-full"
            mediaClassName="object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/12 via-black/10 to-black/20" />
        </div>
        <div className="absolute inset-0 grid place-items-center px-4 text-center">
          <div className="max-w-[720px] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.28)]">
            <EditableText
              path="hero.eyebrow"
              value={heroEyebrow}
              as="p"
              className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85"
              placeholder="Eyebrow"
            />
            <EditableText
              path="hero.headline"
              value={storefront.hero.headline}
              as="h1"
              className="text-[2.35rem] font-bold leading-[0.95] tracking-[-0.035em] sm:text-7xl sm:leading-[0.88] sm:tracking-[-0.04em] lg:text-8xl"
              style={{ fontFamily: "var(--font-editorial)" } as CSSProperties}
              placeholder="Headline"
            />
            <EditableText
              path="hero.subheadline"
              value={storefront.hero.subheadline}
              as="p"
              className="mx-auto mt-4 max-w-md text-xs font-medium leading-6 text-white/90 sm:text-sm"
              multiline
              placeholder="Supporting text"
            />
            <StorefrontLink
              href="/products"
              className="mt-7 inline-flex items-center gap-2 px-7 py-3 text-[11px] font-extrabold uppercase tracking-[0.12em] transition"
              style={{
                backgroundColor: theme.palette.surface,
                color: theme.palette.text,
              }}
            >
              <EditableText
                path="hero.cta_label"
                value={storefront.hero.cta_label || "Shop now"}
                as="span"
                placeholder="Button label"
              />
            </StorefrontLink>
          </div>
        </div>
      </section>

      {fashionValueProps.length > 0 ? (
        <section
          className="border-y px-4 py-4 sm:px-6"
          style={{ backgroundColor: theme.palette.surface, borderColor: theme.palette.border }}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {fashionValueProps.map((item, index) => {
              const Icon = featureIcons[index % featureIcons.length];
              return (
                <div key={`${item.title}-${index}`} className="flex items-center justify-center gap-3 text-left">
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={1.4} />
                  <div>
                    <EditableText
                      path={`value_props.${index}.title`}
                      value={item.title}
                      as="h3"
                      className="text-[11px] font-bold uppercase tracking-[0.08em]"
                      placeholder="Trust title"
                    />
                    <EditableText
                      path={`value_props.${index}.body`}
                      value={item.body}
                      as="p"
                      className="mt-0.5 text-[11px] leading-4"
                      style={{ color: theme.palette.muted }}
                      multiline
                      placeholder="Trust description"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <CategoryShowcaseBlock
        storefront={storefront}
        categories={categories}
        products={products}
        blockId="category-showcase"
        preferProductImages
        hideWhenNoCategories
      />

      <section
        className="px-4 py-16 text-center sm:px-6 lg:py-20"
        style={{ backgroundColor: theme.palette.background }}
      >
        <EditableText
          path={homeBlockPath("featured-products", "title")}
          value={featuredGrid.title || "Our Best Sellers"}
          as="h2"
          className="text-4xl font-bold tracking-[-0.04em]"
          style={{ fontFamily: "var(--font-editorial)" }}
          placeholder="Section title"
        />
        <EditableText
          path={homeBlockPath("featured-products", "subtitle")}
          value={featuredGrid.subtitle || "Customer favourites, always in style."}
          as="p"
          className="mt-2 text-[11px]"
          style={{ color: theme.palette.muted }}
          placeholder="Section subtitle"
        />
        <div className="mx-auto mt-10 grid max-w-7xl gap-7 sm:grid-cols-2 lg:grid-cols-4">
          {featuredProducts.map((product, index) => {
            const originalIndex = products.findIndex((item) => item.id === product.id);
            return (
              <FashionProductCard
                key={product.id}
                product={product}
                index={index}
                imagePath={
                  productSource === "merchant_products" && originalIndex >= 0
                    ? `products.${originalIndex}.image_url`
                    : undefined
                }
                editable={mode === "edit"}
                discounts={discounts ?? []}
              />
            );
          })}
        </div>
      </section>

      <section className="grid lg:grid-cols-2" style={{ backgroundColor: theme.palette.surface }}>
        <div className="relative min-h-[440px] overflow-hidden bg-[#a7aaa5] lg:min-h-[620px]">
          <EditableImage
            path="media.about_image_url"
            src={aboutImageUrl}
            alt={`${store.business_name} brand story`}
            className="absolute inset-0 h-full w-full"
            imgClassName="object-center"
          />
        </div>
        <div className="flex min-h-[460px] flex-col justify-between px-6 py-12 sm:px-12 lg:px-16">
          <div className="flex items-center justify-between text-[11px]">
            <EditableText
              path={homeBlockPath("about-spotlight", "meta_left")}
              value={aboutSpotlight.meta_left || "About"}
              as="span"
              placeholder="Label"
            />
            <EditableText
              path={homeBlockPath("about-spotlight", "meta_right")}
              value={aboutSpotlight.meta_right || "Since 2026"}
              as="span"
              placeholder="Meta"
            />
          </div>
          <div>
            <EditableText
              path="about.title"
              value={storefront.about.title || aboutTitleDefault}
              as="h2"
              className="max-w-xl text-3xl font-bold leading-[1.08] tracking-[-0.04em] sm:text-5xl"
              style={{ fontFamily: "var(--font-editorial)" }}
              placeholder="Section title"
            />
            <EditableText
              path="about.body"
              value={storefront.about.body}
              as="p"
              className="mt-5 max-w-lg text-sm leading-7"
              style={{ color: theme.palette.muted }}
              multiline
              placeholder="Tell customers about your store"
            />
            {mode === "edit" ? (
              <span
                className="mt-8 inline-flex cursor-default px-7 py-3 text-[11px] font-extrabold uppercase tracking-[0.12em]"
                style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
              >
                <EditableText
                  path={homeBlockPath("about-spotlight", "cta_label")}
                  value={aboutSpotlight.cta_label || "Learn more"}
                  as="span"
                  placeholder="Button label"
                />
              </span>
            ) : (
              <Link
                href="/about"
                className="mt-8 inline-flex px-7 py-3 text-[11px] font-extrabold uppercase tracking-[0.12em] transition"
                style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
              >
                {aboutSpotlight.cta_label || "Learn more"}
              </Link>
            )}
          </div>
          <div
            className="flex items-center justify-between text-[11px]"
            style={{ color: theme.palette.muted }}
          >
            <EditableText
              path={homeBlockPath("about-spotlight", "footer_left")}
              value={aboutSpotlight.footer_left || "Made with love"}
              as="span"
              placeholder="Footer note"
            />
            <EditableText
              path={homeBlockPath("about-spotlight", "footer_right")}
              value={aboutSpotlight.footer_right || "For every body"}
              as="span"
              placeholder="Footer note"
            />
          </div>
        </div>
      </section>

      <StorefrontFaqSection faqPage={faqPage} />
    </div>
  );
}
