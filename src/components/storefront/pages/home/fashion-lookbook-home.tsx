"use client";

import Link from "next/link";
import { StorefrontLink } from "@/components/storefront/theme/storefront-link";
import { BadgeCheck, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import type { CSSProperties } from "react";
import type { Store, StorefrontContent } from "@/lib/api/types";
import { EditableImage } from "@/components/storefront/theme/editable-image";
import { EditableText } from "@/components/storefront/theme/editable-text";
import { StorefrontFaqSection } from "@/components/storefront/pages/storefront-faq-section";
import { CategoryShowcaseBlock } from "@/components/storefront/blocks/category-showcase-block";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { useStorefront } from "@/lib/storefront/store-context";
import { formatMoney } from "@/lib/storefront/format";
import { fashionTemplateImages } from "@/lib/storefront/fashion-defaults";
import { getHomepageProducts } from "@/lib/storefront/product-plugs";

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
  label?: string;
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

export function FashionLookbookHome({
  store,
  storefront,
}: {
  store: Store;
  storefront: StorefrontContent;
}) {
  const { theme, mode } = useStorefrontTheme();
  const { categories } = useStorefront();
  const products = storefront.products ?? [];
  const featureIcons = [ShieldCheck, BadgeCheck, RotateCcw, Truck];
  const { products: featuredProducts, source: productSource } = getHomepageProducts(
    storefront,
    "fashion_lookbook",
    4,
  );
  const fashionValueProps = [
    ...storefront.value_props,
    { title: "Secure checkout", body: "Trusted payment protection." },
  ].slice(0, 4);
  const heroImageUrl = storefront.media?.hero_image_url ?? fashionTemplateImages.hero;
  const aboutImageUrl = storefront.media?.about_image_url ?? fashionTemplateImages.about;
  const faqPage = storefront.pages?.faq;

  return (
    <div style={{ backgroundColor: theme.palette.background, color: theme.palette.text }}>
      <section className="relative">
        <div className="relative min-h-[430px] overflow-hidden bg-[#a7aaa5] sm:min-h-[560px] lg:min-h-[640px]">
          <EditableImage
            path="media.hero_image_url"
            src={heroImageUrl}
            alt={`${store.business_name} campaign`}
            className="absolute inset-0 h-full w-full"
            imgClassName="object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/12 via-black/10 to-black/20" />
        </div>
        <div className="absolute inset-0 grid place-items-center px-4 text-center">
          <div className="max-w-[720px] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.28)]">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85">
              Modern essentials
            </p>
            <EditableText
              path="hero.headline"
              value={storefront.hero.headline}
              as="h1"
              className="text-5xl font-bold leading-[0.88] tracking-[-0.04em] sm:text-7xl lg:text-8xl"
              style={{ fontFamily: "var(--font-editorial)" } as CSSProperties}
            />
            <EditableText
              path="hero.subheadline"
              value={storefront.hero.subheadline}
              as="p"
              className="mx-auto mt-4 max-w-md text-xs font-medium leading-6 text-white/90 sm:text-sm"
              multiline
            />
            <StorefrontLink
              href="/products"
              className="mt-7 inline-flex items-center gap-2 px-7 py-3 text-[11px] font-extrabold uppercase tracking-[0.12em] transition"
              style={{
                backgroundColor: theme.palette.surface,
                color: theme.palette.text,
              }}
            >
              <EditableText path="hero.cta_label" value={storefront.hero.cta_label} as="span" />
            </StorefrontLink>
          </div>
        </div>
      </section>

      <section
        className="border-y px-4 py-4 sm:px-6"
        style={{ backgroundColor: theme.palette.surface, borderColor: theme.palette.border }}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {fashionValueProps.map((item, index) => {
            const Icon = featureIcons[index % featureIcons.length];
            return (
              <div key={item.title} className="flex items-center justify-center gap-3 text-left">
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.4} />
                <div>
                  <EditableText
                    path={`value_props.${index}.title`}
                    value={item.title}
                    as="h3"
                    className="text-[11px] font-bold uppercase tracking-[0.08em]"
                  />
                  <EditableText
                    path={`value_props.${index}.body`}
                    value={item.body}
                    as="p"
                    className="mt-0.5 text-[11px] leading-4"
                    style={{ color: theme.palette.muted }}
                    multiline
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <CategoryShowcaseBlock
        storefront={storefront}
        categories={categories}
        blockId="category-showcase"
      />

      <section
        className="px-4 py-16 text-center sm:px-6 lg:py-20"
        style={{ backgroundColor: theme.palette.background }}
      >
        <h2
          className="text-4xl font-bold tracking-[-0.04em]"
          style={{ fontFamily: "var(--font-editorial)" }}
        >
          Our Best Sellers
        </h2>
        <p className="mt-2 text-[11px]" style={{ color: theme.palette.muted }}>
          Customer favourites, always in style.
        </p>
        <div className="mx-auto mt-10 grid max-w-7xl gap-7 sm:grid-cols-2 lg:grid-cols-4">
          {featuredProducts.map((product, index) => {
            const card = (
              <>
                <FashionImageCard
                  imageUrl={
                    product.image_url ??
                    fashionTemplateImages.products[index % fashionTemplateImages.products.length]
                  }
                  imagePath={
                    productSource === "merchant_products" && products[index]?.id === product.id
                      ? `products.${index}.image_url`
                      : undefined
                  }
                  label={index === 1 ? "-19%" : index === 2 ? "-5%" : undefined}
                  alt={product.name}
                  className="aspect-[4/5]"
                />
                <h3 className="mt-4 min-h-9 text-xs font-bold leading-[1.15]">{product.name}</h3>
                <p
                  className="mt-1 line-clamp-2 text-[11px] leading-4"
                  style={{ color: theme.palette.muted }}
                >
                  {product.description}
                </p>
                <div className="mt-2 text-xs font-semibold tracking-tight">
                  {formatMoney(product.price, product.currency)}
                </div>
              </>
            );
            return mode === "edit" ? (
              <div key={product.id} className="block text-left">
                {card}
              </div>
            ) : (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group block text-left"
              >
                {card}
              </Link>
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
            <span>About</span>
            <span>Since 2026</span>
          </div>
          <div>
            <h2
              className="max-w-xl text-3xl font-bold leading-[1.08] tracking-[-0.04em] sm:text-5xl"
              style={{ fontFamily: "var(--font-editorial)" }}
            >
              {store.business_name} designs modern essentials that blend comfort, simplicity, and
              timeless style.
            </h2>
            <EditableText
              path="about.body"
              value={storefront.about.body}
              as="p"
              className="mt-5 max-w-lg text-sm leading-7"
              style={{ color: theme.palette.muted }}
              multiline
            />
            {mode === "edit" ? (
              <span
                className="mt-8 inline-flex cursor-default px-7 py-3 text-[11px] font-extrabold uppercase tracking-[0.12em]"
                style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
              >
                Learn more
              </span>
            ) : (
              <Link
                href="/about"
                className="mt-8 inline-flex px-7 py-3 text-[11px] font-extrabold uppercase tracking-[0.12em] transition"
                style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
              >
                Learn more
              </Link>
            )}
          </div>
          <div
            className="flex items-center justify-between text-[11px]"
            style={{ color: theme.palette.muted }}
          >
            <span>Made with love</span>
            <span>For every body</span>
          </div>
        </div>
      </section>

      <StorefrontFaqSection faqPage={faqPage} />
    </div>
  );
}
