"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { ChevronDown, Minus, Plane, Plus } from "lucide-react";
import type { StoreProduct } from "@/lib/api/types";
import { ProductReviewsModule } from "@/components/storefront/product-reviews-module";
import { RelatedProductsSection } from "@/components/storefront/related-products-section";
import { ProductVariantSelector } from "@/components/storefront/product-variant-selector";
import { mergeProductPerks } from "@/lib/storefront/pricing";
import { useStorefront } from "@/lib/storefront/store-context";
import { beautyTemplateImages } from "@/lib/storefront/beauty-defaults";
import { cosmeticsTemplateImages } from "@/lib/storefront/cosmetics-defaults";
import { fashionTemplateImages } from "@/lib/storefront/fashion-defaults";
import { minimalisticTemplateImages } from "@/lib/storefront/minimalistic-defaults";
import { formatMoney } from "@/lib/storefront/format";
import { resolveProductGalleryImages } from "@/lib/storefront/product-gallery";
import { useProductPurchase } from "@/lib/storefront/use-product-purchase";
import { PageContainer } from "@/components/storefront/theme/page-container";
import { PrimaryButton } from "@/components/storefront/theme/primary-button";
import { StorefrontFaqSection } from "@/components/storefront/pages/storefront-faq-section";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { cn } from "@/lib/utils";

function ProductGallery({
  productName,
  images,
  className,
  thumbClassName,
  mainClassName,
  imgClassName,
  surfaceColor,
  mainFit = "contain",
}: {
  productName: string;
  images: string[];
  className?: string;
  thumbClassName?: string;
  mainClassName?: string;
  imgClassName?: string;
  surfaceColor: string;
  /** Use cover + fixed frame for templates where mixed aspect ratios look shaky. */
  mainFit?: "contain" | "cover";
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const safeIndex = images.length ? Math.min(selectedIndex, images.length - 1) : 0;
  const mainSrc = images[safeIndex];
  const fitClass = mainFit === "cover" ? "object-cover" : "object-contain";

  if (!images.length) {
    return (
      <div
        className={cn(
          "flex h-[min(70vw,380px)] items-center justify-center text-5xl font-bold text-white sm:h-[430px] lg:h-[520px]",
          mainClassName,
        )}
        style={{
          background: `linear-gradient(135deg, ${surfaceColor}, ${surfaceColor}88)`,
        }}
      >
        {productName.slice(0, 1)}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-2 sm:grid-cols-[88px_minmax(0,1fr)] sm:gap-3", className)}>
      {images.length > 1 ? (
        <div className="order-2 grid grid-cols-4 gap-2 sm:order-1 sm:grid-cols-1 sm:self-start">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={cn(
                "aspect-square overflow-hidden transition ring-offset-2",
                thumbClassName,
                index === safeIndex ? "ring-2 opacity-100" : "opacity-80 hover:opacity-100",
              )}
              style={{
                backgroundColor: surfaceColor,
                ...(index === safeIndex
                  ? ({ ["--tw-ring-color"]: "currentColor", color: "inherit" } as CSSProperties)
                  : {}),
              }}
              aria-label={`View ${productName} image ${index + 1}`}
              aria-pressed={index === safeIndex}
            >
              <img
                src={image}
                alt=""
                className={cn("h-full w-full object-center", fitClass)}
              />
            </button>
          ))}
        </div>
      ) : null}
      <div
        className={cn(
          "order-1 h-[min(70vw,380px)] overflow-hidden sm:order-2 sm:h-[430px] lg:h-[520px]",
          images.length === 1 && "sm:col-span-2",
          mainClassName,
        )}
        style={{ backgroundColor: surfaceColor }}
      >
        <img
          src={mainSrc}
          alt={productName}
          className={cn("h-full w-full object-center", fitClass, imgClassName)}
        />
      </div>
    </div>
  );
}

function FashionProductDetail({ product }: { product: StoreProduct }) {
  const { store, storefront } = useStorefront();
  const { theme } = useStorefrontTheme();
  const {
    quantity,
    setQuantity,
    selectedOptions,
    setSelectedOptions,
    addToCart,
    buyNow,
    outOfStock,
    priced,
    displayImageUrl,
  } = useProductPurchase(product);
  const variantGroups = product.variants ?? [];
  const perks = mergeProductPerks(product, store.store_perks);
  const faqPage = storefront.pages?.faq;
  const galleryImages = useMemo(() => {
    const images = resolveProductGalleryImages(
      displayImageUrl ?? product.image_url,
      fashionTemplateImages.products,
      8,
      product.images,
    );
    if (displayImageUrl && images[0] !== displayImageUrl) {
      return [displayImageUrl, ...images.filter((src) => src !== displayImageUrl)];
    }
    return images;
  }, [displayImageUrl, product.image_url, product.images]);

  return (
    <div style={{ backgroundColor: theme.palette.background, color: theme.palette.text }}>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:gap-12 lg:py-12">
        <ProductGallery
          productName={product.name}
          images={galleryImages}
          surfaceColor={theme.palette.surface}
        />

        <section className="lg:pt-1">
          <nav className="mb-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold" style={{ color: theme.palette.muted }}>
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href="/products">Products</Link>
            <span>/</span>
            <span style={{ color: theme.palette.text }}>{product.name}</span>
          </nav>

          <h1 className="max-w-xl text-xl font-bold leading-tight sm:text-2xl">{product.name}</h1>
          {product.category ? (
            <span
              className="mt-3 inline-flex px-2 py-1 text-[10px] font-bold uppercase tracking-wide"
              style={{ backgroundColor: theme.palette.accent, color: theme.palette.text }}
            >
              {product.category}
            </span>
          ) : null}

          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-sm font-bold">
              {formatMoney(priced.unitPrice, product.currency)}
            </span>
            {priced.compareAtPrice != null ? (
              <span className="text-sm line-through" style={{ color: theme.palette.muted }}>
                {formatMoney(priced.compareAtPrice, product.currency)}
              </span>
            ) : null}
            {priced.discountLabel ? (
              <span className="text-[11px] font-bold uppercase" style={{ color: theme.palette.accent }}>
                {priced.discountLabel}
              </span>
            ) : null}
          </div>

          {outOfStock ? (
            <p className="mt-4 text-sm font-semibold" style={{ color: theme.palette.accent }}>
              Out of stock
            </p>
          ) : null}

          {variantGroups.length ? (
            <div className="mt-7">
              <div className="mb-3 text-[11px] font-semibold">Select options</div>
              <ProductVariantSelector
                variants={variantGroups}
                selectedOptions={selectedOptions}
                onChange={setSelectedOptions}
                appearance="square"
              />
            </div>
          ) : null}

          {perks.length ? (
            <div
              className="mt-6 px-4 py-4 text-center text-[10px] font-extrabold uppercase tracking-[0.08em]"
              style={{ backgroundColor: theme.palette.surface }}
            >
              {perks.join(" · ")}
            </div>
          ) : null}

          <div
            className="mt-6 flex w-fit items-center border"
            style={{ borderColor: theme.palette.text }}
          >
            <button
              type="button"
              className="grid h-9 w-9 place-items-center"
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              aria-label="Decrease quantity"
              disabled={outOfStock}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="grid h-9 w-8 place-items-center text-sm font-semibold">
              {quantity}
            </span>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center"
              onClick={() => setQuantity((current) => current + 1)}
              aria-label="Increase quantity"
              disabled={outOfStock}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={buyNow}
              disabled={outOfStock}
              className="px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
            >
              Buy now
            </button>
            <button
              type="button"
              onClick={() => addToCart()}
              disabled={outOfStock}
              className="border px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                backgroundColor: theme.palette.surface,
                borderColor: theme.palette.primary,
                color: theme.palette.primary,
              }}
            >
              Add to cart
            </button>
          </div>

          {perks.length ? (
            <div
              className="mt-6 space-y-3 border-b pb-5"
              style={{ borderColor: theme.palette.border }}
            >
              {perks.map((perk) => (
                <div key={perk} className="flex gap-3">
                  <Plane className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.5} />
                  <p className="text-sm font-bold">{perk}</p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="divide-y border-b" style={{ borderColor: theme.palette.border }}>
            {[
              ["Description", product.description],
              ...(perks.length
                ? ([["Highlights", perks.join(" · ")]] as [string, string][])
                : []),
            ].map(([title, body]) => (
              <details key={title} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold">
                  {title}
                  <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-6" style={{ color: theme.palette.muted }}>
                  {body}
                </p>
              </details>
            ))}
          </div>
        </section>
      </div>

      <ProductReviewsModule
        productId={product.id}
        productName={product.name}
        appearance="fashion"
      />

      <RelatedProductsSection product={product} appearance="fashion" />

      <StorefrontFaqSection faqPage={faqPage} />
    </div>
  );
}

function MinimalisticProductDetail({ product }: { product: StoreProduct }) {
  const { store, storefront } = useStorefront();
  const { theme } = useStorefrontTheme();
  const {
    quantity,
    setQuantity,
    selectedOptions,
    setSelectedOptions,
    addToCart,
    buyNow,
    outOfStock,
    priced,
    displayImageUrl,
  } = useProductPurchase(product);
  const perks = mergeProductPerks(product, store.store_perks);
  const faqPage = storefront.pages?.faq;
  const galleryImages = useMemo(() => {
    const images = resolveProductGalleryImages(
      displayImageUrl ?? product.image_url,
      minimalisticTemplateImages.products,
      8,
      product.images,
    );
    if (displayImageUrl && images[0] !== displayImageUrl) {
      return [displayImageUrl, ...images.filter((src) => src !== displayImageUrl)];
    }
    return images;
  }, [displayImageUrl, product.image_url, product.images]);

  return (
    <div style={{ backgroundColor: theme.palette.background, color: theme.palette.text }}>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] lg:py-14">
        <ProductGallery
          productName={product.name}
          images={galleryImages}
          surfaceColor={`${theme.palette.surface}cc`}
          thumbClassName="rounded-2xl shadow-sm"
          mainClassName="overflow-hidden rounded-[1.5rem] shadow-[0_24px_80px_rgba(7,62,63,0.08)] sm:rounded-[2rem]"
          className="sm:grid-cols-[72px_minmax(0,1fr)] lg:grid-cols-[88px_minmax(0,1fr)]"
          mainFit="cover"
        />

        <section
          className="rounded-[1.5rem] p-5 shadow-[0_24px_80px_rgba(7,62,63,0.08)] ring-1 sm:rounded-[2rem] sm:p-8"
          style={
            {
              backgroundColor: `${theme.palette.surface}cc`,
              "--tw-ring-color": theme.palette.border,
            } as CSSProperties
          }
        >
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold"
            style={{ backgroundColor: theme.palette.background }}
          >
            <span
              className="h-2 w-5 rounded-full"
              style={{ backgroundColor: theme.palette.primary }}
            />
            Daily Essential
            <span
              className="h-2 w-5 rounded-full"
              style={{ backgroundColor: theme.palette.primary }}
            />
          </div>
          <h1 className="mt-4 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.045em] sm:mt-5 sm:text-4xl">
            {product.name}
          </h1>
          {product.category ? (
            <span
              className="mt-4 inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold"
              style={{ backgroundColor: theme.palette.accent, color: theme.palette.text }}
            >
              {product.category}
            </span>
          ) : null}

          <p className="mt-5 max-w-xl text-sm leading-7" style={{ color: theme.palette.muted }}>
            {product.description}
          </p>

          <div className="mt-6 text-3xl font-semibold tracking-[-0.04em]">
            {formatMoney(priced.unitPrice, product.currency)}
            {priced.compareAtPrice != null ? (
              <span className="ml-3 text-lg font-normal line-through" style={{ color: theme.palette.muted }}>
                {formatMoney(priced.compareAtPrice, product.currency)}
              </span>
            ) : null}
          </div>

          {outOfStock ? (
            <p className="mt-4 text-sm font-semibold" style={{ color: theme.palette.accent }}>
              Out of stock
            </p>
          ) : null}

          {product.variants?.length ? (
            <ProductVariantSelector
              className="mt-7"
              variants={product.variants}
              selectedOptions={selectedOptions}
              onChange={setSelectedOptions}
              appearance="soft"
            />
          ) : null}

          <div
            className="mt-7 flex w-fit items-center gap-3 rounded-full p-1"
            style={{ backgroundColor: theme.palette.background }}
          >
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full"
              style={{ backgroundColor: theme.palette.surface, color: theme.palette.text }}
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              aria-label="Decrease quantity"
              disabled={outOfStock}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-5 text-center text-sm font-semibold">{quantity}</span>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full"
              style={{ backgroundColor: theme.palette.surface, color: theme.palette.text }}
              onClick={() => setQuantity((current) => current + 1)}
              aria-label="Increase quantity"
              disabled={outOfStock}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={buyNow}
              disabled={outOfStock}
              className="rounded-full px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
            >
              Buy now
            </button>
            <button
              type="button"
              onClick={() => addToCart()}
              disabled={outOfStock}
              className="rounded-full border px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                backgroundColor: theme.palette.surface,
                borderColor: theme.palette.border,
                color: theme.palette.primary,
              }}
            >
              Add to cart
            </button>
          </div>

          {perks.length ? (
            <div
              className="mt-6 space-y-3 rounded-2xl p-4"
              style={{ backgroundColor: theme.palette.background }}
            >
              {perks.map((perk) => (
                <div key={perk} className="flex gap-3">
                  <Plane className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={1.5} />
                  <p className="text-sm font-bold">{perk}</p>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-6 divide-y border-y" style={{ borderColor: theme.palette.border }}>
            {[
              ["Description", product.description],
              ...(perks.length
                ? ([["Highlights", perks.join(" · ")]] as [string, string][])
                : []),
            ].map(([title, body]) => (
              <details key={title} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                  {title}
                  <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-6" style={{ color: theme.palette.muted }}>
                  {body}
                </p>
              </details>
            ))}
          </div>
        </section>
      </div>

      {perks.length ? (
        <section className="px-4 pb-6 sm:px-6">
          <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-3">
            {perks.slice(0, 3).map((label) => (
              <div
                key={label}
                className="rounded-[1.5rem] p-6 text-center shadow-sm"
                style={{ backgroundColor: `${theme.palette.surface}cc` }}
              >
                <div
                  className="mx-auto mb-4 h-2 w-10 rounded-full"
                  style={{ backgroundColor: theme.palette.primary }}
                />
                <h2 className="font-bold">{label}</h2>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <ProductReviewsModule
        productId={product.id}
        productName={product.name}
        appearance="minimal"
      />

      <RelatedProductsSection product={product} appearance="minimal" />

      <StorefrontFaqSection faqPage={faqPage} />
    </div>
  );
}

function BeautyProductDetail({ product }: { product: StoreProduct }) {
  const { store, storefront } = useStorefront();
  const { theme } = useStorefrontTheme();
  const {
    quantity,
    setQuantity,
    selectedOptions,
    setSelectedOptions,
    addToCart,
    buyNow,
    outOfStock,
    priced,
    displayImageUrl,
  } = useProductPurchase(product);
  const perks = mergeProductPerks(product, store.store_perks);
  const faqPage = storefront.pages?.faq;
  const isCosmetics = theme.id === "cosmetics";
  const templateImages = isCosmetics ? cosmeticsTemplateImages : beautyTemplateImages;
  const galleryImages = useMemo(() => {
    const images = resolveProductGalleryImages(
      displayImageUrl ?? product.image_url,
      templateImages.products,
      8,
      product.images,
    );
    if (displayImageUrl && images[0] !== displayImageUrl) {
      return [displayImageUrl, ...images.filter((src) => src !== displayImageUrl)];
    }
    return images;
  }, [displayImageUrl, product.image_url, product.images, templateImages]);

  return (
    <div style={{ backgroundColor: theme.palette.background, color: theme.palette.text }}>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-16">
        <ProductGallery
          productName={product.name}
          images={galleryImages}
          surfaceColor={theme.palette.surface}
          className="sm:grid-cols-[96px_minmax(0,1fr)] gap-4"
          thumbClassName="rounded-2xl border"
          mainClassName="overflow-hidden rounded-[2.5rem] border"
        />

        <section className="lg:py-8">
          <Link href="/products" className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: theme.palette.muted }}>
            {isCosmetics ? "Back to skincare edit" : "Back to beauty edit"}
          </Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: theme.palette.accent }}>
            {product.category ?? (isCosmetics ? "Skincare essential" : "Beauty essential")}
          </p>
          <h1 className="mt-3 font-display text-5xl font-semibold leading-none tracking-[-0.055em]">
            {product.name}
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-7" style={{ color: theme.palette.muted }}>
            {product.description}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <span className="font-display text-3xl font-semibold">
              {formatMoney(priced.unitPrice, product.currency)}
            </span>
            {priced.compareAtPrice != null ? (
              <span className="text-lg line-through" style={{ color: theme.palette.muted }}>
                {formatMoney(priced.compareAtPrice, product.currency)}
              </span>
            ) : null}
          </div>

          {outOfStock ? (
            <p className="mt-4 text-sm font-semibold" style={{ color: theme.palette.accent }}>
              Out of stock
            </p>
          ) : null}

          {product.variants?.length ? (
            <ProductVariantSelector
              className="mt-8"
              variants={product.variants}
              selectedOptions={selectedOptions}
              onChange={setSelectedOptions}
              appearance="pill"
            />
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-full border" style={{ borderColor: theme.palette.border }}>
              <button type="button" className="grid h-11 w-11 place-items-center" onClick={() => setQuantity((current) => Math.max(1, current - 1))} disabled={outOfStock}>
                <Minus className="h-4 w-4" />
              </button>
              <span className="grid h-11 w-9 place-items-center text-sm font-semibold">{quantity}</span>
              <button type="button" className="grid h-11 w-11 place-items-center" onClick={() => setQuantity((current) => current + 1)} disabled={outOfStock}>
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => addToCart()}
              disabled={outOfStock}
              className="rounded-full px-8 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
            >
              Add to cart
            </button>
            <button
              type="button"
              onClick={buyNow}
              disabled={outOfStock}
              className="rounded-full border px-8 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderColor: theme.palette.primary, color: theme.palette.primary }}
            >
              Buy now
            </button>
          </div>

          {perks.length ? (
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {perks.slice(0, 3).map((label) => (
                <div
                  key={label}
                  className="rounded-2xl border p-4 text-sm font-semibold"
                  style={{ borderColor: theme.palette.border, backgroundColor: theme.palette.surface }}
                >
                  {label}
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </section>

      <ProductReviewsModule
        productId={product.id}
        productName={product.name}
        appearance="soft"
      />

      <RelatedProductsSection product={product} appearance="soft" />

      <StorefrontFaqSection faqPage={faqPage} />
    </div>
  );
}

function DefaultProductDetail({ product }: { product: StoreProduct }) {
  const { theme, mode } = useStorefrontTheme();
  const { store } = useStorefront();
  const {
    selectedOptions,
    setSelectedOptions,
    addToCart,
    buyNow,
    outOfStock,
    priced,
    displayImageUrl,
  } = useProductPurchase(product);
  const perks = mergeProductPerks(product, store.store_perks);
  const galleryImages = useMemo(() => {
    const images = resolveProductGalleryImages(
      displayImageUrl ?? product.image_url,
      [],
      8,
      product.images,
    );
    if (displayImageUrl && images[0] !== displayImageUrl) {
      return [displayImageUrl, ...images.filter((src) => src !== displayImageUrl)];
    }
    return images;
  }, [displayImageUrl, product.image_url, product.images]);

  return (
    <PageContainer>
      <div className="grid gap-10 lg:grid-cols-2">
        {galleryImages.length > 1 ? (
          <ProductGallery
            productName={product.name}
            images={galleryImages}
            surfaceColor={theme.palette.surface}
            thumbClassName="rounded-2xl"
            mainClassName="rounded-3xl"
            imgClassName="rounded-3xl"
          />
        ) : (
          <div
            className="flex aspect-square items-center justify-center rounded-3xl text-6xl font-bold text-white"
            style={{
              background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.primary}88)`,
            }}
          >
            {galleryImages[0] ? (
              <img
                src={galleryImages[0]}
                alt={product.name}
                className="h-full w-full rounded-3xl object-contain object-center"
              />
            ) : (
              product.name.slice(0, 1)
            )}
          </div>
        )}
        <div>
          {mode !== "edit" ? (
            <Link
              href="/products"
              className="text-sm hover:opacity-80"
              style={{ color: theme.palette.muted }}
            >
              Back to products
            </Link>
          ) : null}
          <h1
            className="mt-4 text-4xl font-bold tracking-tight"
            style={{ fontFamily: theme.displayFont }}
          >
            {product.name}
          </h1>
          <p className="mt-4 text-sm leading-7" style={{ color: theme.palette.muted }}>
            {product.description}
          </p>
          <div className="mt-6 text-2xl font-semibold" style={{ color: theme.palette.primary }}>
            {formatMoney(priced.unitPrice, product.currency)}
            {priced.compareAtPrice != null ? (
              <span className="ml-3 text-lg font-normal line-through" style={{ color: theme.palette.muted }}>
                {formatMoney(priced.compareAtPrice, product.currency)}
              </span>
            ) : null}
          </div>
          {outOfStock ? (
            <p className="mt-4 text-sm font-semibold" style={{ color: theme.palette.accent }}>
              Out of stock
            </p>
          ) : null}
          {product.variants?.length ? (
            <ProductVariantSelector
              className="mt-6"
              variants={product.variants}
              selectedOptions={selectedOptions}
              onChange={setSelectedOptions}
              appearance="soft"
            />
          ) : null}
          {perks.length ? (
            <div className={`mt-6 rounded-2xl border ${theme.borderColor} ${theme.cardBg} p-4`}>
              <h2 className="text-sm font-semibold">Why customers like it</h2>
              <ul
                className="mt-3 list-disc space-y-2 pl-5 text-sm"
                style={{ color: theme.palette.muted }}
              >
                {perks.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <PrimaryButton disabled={outOfStock} onClick={() => addToCart()}>
              Add to cart
            </PrimaryButton>
            <button
              type="button"
              disabled={outOfStock}
              onClick={buyNow}
              className="rounded-full border px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderColor: theme.palette.primary, color: theme.palette.primary }}
            >
              Buy now
            </button>
          </div>
        </div>
      </div>

      <ProductReviewsModule
        className="mt-14 !px-0"
        productId={product.id}
        productName={product.name}
        appearance="soft"
      />

      <RelatedProductsSection product={product} appearance="soft" />
    </PageContainer>
  );
}

export function ProductDetailPageView({ product }: { product: StoreProduct | null }) {
  const { theme, mode } = useStorefrontTheme();

  if (!product) {
    return (
      <PageContainer className="text-center">
        <h1 className="text-3xl font-bold" style={{ fontFamily: theme.displayFont }}>
          Product not found
        </h1>
        {mode !== "edit" ? (
          <Link
            href="/products"
            className="mt-4 inline-block text-sm font-semibold"
            style={{ color: theme.palette.primary }}
          >
            Back to products
          </Link>
        ) : null}
      </PageContainer>
    );
  }

  if (theme.id === "fashion_lookbook") {
    return <FashionProductDetail product={product} />;
  }

  if (theme.id === "minimalistic") {
    return <MinimalisticProductDetail product={product} />;
  }

  if (theme.id === "beauty" || theme.id === "cosmetics") {
    return <BeautyProductDetail product={product} />;
  }

  if (theme.id === "furniture-hardware" || theme.id === "hair-and-fashion") {
    return <FashionProductDetail product={product} />;
  }

  return <DefaultProductDetail product={product} />;
}
