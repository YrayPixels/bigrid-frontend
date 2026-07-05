"use client";

import {
  ArrowLeft,
  ArrowRight,
  Star,
} from "lucide-react";
import type { Store, StorefrontContent, StoreProduct } from "@/lib/api/types";
import { EditableImage } from "@/components/storefront/theme/editable-image";
import { EditableText } from "@/components/storefront/theme/editable-text";
import { StorefrontLink } from "@/components/storefront/theme/storefront-link";
import { FurnitureHeader } from "@/components/storefront/shell/furniture-header";
import {
  furnitureHardwareCategories,
  furnitureHardwareFooterColumns,
  furnitureHardwareProductDisplay,
  furnitureHardwareReviews,
  furnitureHardwareRooms,
  furnitureHardwareTemplateImages,
} from "@/lib/storefront/furniture-hardware-defaults";
import { getHomepageProducts } from "@/lib/storefront/product-plugs";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

const arrivalFilters = ["All", "Chairs", "Tables", "Sofas", "Accessories"];

function FurnitureProductCard({
  product,
  index,
  editable,
}: {
  product: StoreProduct;
  index: number;
  editable: boolean;
}) {
  const imageUrl =
    product.image_url ?? furnitureHardwareTemplateImages.products[index % furnitureHardwareTemplateImages.products.length];
  const display = furnitureHardwareProductDisplay[product.slug];
  const price = product.price / 100;
  const was = display?.was ?? price * 1.2;

  return (
    <StorefrontLink
      href={`/products/${product.slug}`}
      className={`group ${editable ? "pointer-events-none" : ""}`}
    >
      <div className="aspect-square overflow-hidden rounded-2xl bg-[#f4f0e8]">
        <img
          src={imageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
      <div className="mt-4 px-1">
        <div className="text-sm font-medium md:text-base">{product.name}</div>
        <div className="mt-1 flex items-baseline gap-2 text-sm">
          <span className="font-semibold">${price.toFixed(2)}</span>
          <span className="text-xs text-[#7a6e5e] line-through">${was.toFixed(2)}</span>
        </div>
        {display?.swatches ? (
          <div className="mt-2 flex gap-1.5">
            {display.swatches.map((hex) => (
              <span
                key={hex}
                className="size-3 rounded-full border border-[#1c1812]/10"
                style={{ backgroundColor: hex }}
              />
            ))}
          </div>
        ) : null}
      </div>
    </StorefrontLink>
  );
}

export function FurnitureHardwareHome({
  store,
  storefront,
}: {
  store: Store;
  storefront: StorefrontContent;
}) {
  const { mode } = useStorefrontTheme();
  const editable = mode === "edit";
  const { products: featuredProducts } = getHomepageProducts(storefront, "furniture-hardware", 4);
  const brandLabel = store.business_name.toUpperCase().slice(0, 5).padEnd(5, " ");

  return (
    <div className="min-h-screen bg-[#f7f3eb] text-[#1c1812]">
      <FurnitureHeader />

      <main>
        <section className="relative mx-3 mt-3 min-h-[560px] overflow-hidden rounded-3xl bg-[#e8dfd0] md:mx-6 md:min-h-[640px]">
          <EditableImage
            path="media.hero_image_url"
            src={storefront.media?.hero_image_url ?? furnitureHardwareTemplateImages.hero}
            alt="Modern elegant wingback chair"
            className="absolute inset-0 h-full w-full"
            imgClassName="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#f7f3eb]/60 via-[#f7f3eb]/10 to-transparent" />
          <div className="relative grid min-h-[560px] gap-6 p-6 md:min-h-[640px] md:grid-cols-2 md:p-14 lg:p-20">
            <div className="flex flex-col justify-between">
              <div>
                <EditableText
                  path="hero.headline"
                  value={storefront.hero.headline}
                  as="h1"
                  className="whitespace-pre-line text-[15vw] font-bold leading-[0.9] md:text-[6.5rem] lg:text-[8rem]"
                />
                <EditableText
                  path="hero.subheadline"
                  value={storefront.hero.subheadline}
                  as="p"
                  className="mt-6 max-w-md text-sm leading-relaxed text-[#1c1812]/70 md:text-base"
                />
              </div>
              <div className="mt-8 flex gap-3">
                <StorefrontLink
                  href="/products"
                  className="flex h-12 items-center rounded-full bg-[#f7f3eb] px-6 text-sm font-medium text-[#1c1812] hover:bg-[#f7f3eb]/90"
                >
                  <EditableText path="hero.cta_label" value={storefront.hero.cta_label} as="span" />
                </StorefrontLink>
                <StorefrontLink
                  href="/products"
                  className="flex h-12 items-center rounded-full border border-[#1c1812]/30 px-6 text-sm font-medium hover:bg-[#1c1812]/5"
                >
                  View product
                </StorefrontLink>
              </div>
            </div>
          </div>
          <div className="absolute right-8 top-8 flex size-24 rotate-[-8deg] items-center justify-center rounded-full bg-[#c43d2f] text-center text-lg font-bold leading-tight text-[#f7f3eb] shadow-lg md:right-1/2 md:top-14 md:size-28 md:translate-x-[220%] md:text-xl">
            10%
            <br />
            OFF
          </div>
        </section>

        <section className="mx-3 mt-16 md:mx-6 md:mt-24">
          <div className="mb-8 flex items-end justify-between">
            <h2 className="text-3xl font-semibold md:text-5xl">Discover Our Curated Collections</h2>
            <StorefrontLink
              href="/products"
              className="ml-4 flex h-11 shrink-0 items-center rounded-full border border-[#1c1812]/30 px-6 text-sm font-medium hover:bg-[#1c1812]/5"
            >
              View All
            </StorefrontLink>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {furnitureHardwareCategories.map((category) => (
              <StorefrontLink
                key={category.name}
                href="/products"
                className={`group relative aspect-[4/5] overflow-hidden rounded-2xl ${editable ? "pointer-events-none" : ""}`}
              >
                <img
                  src={category.image}
                  alt={category.name}
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute bottom-5 left-5 text-white">
                  <div className="text-2xl font-semibold md:text-3xl">{category.name}</div>
                  <div className="mt-1 text-xs opacity-80">{category.count} Products</div>
                </div>
              </StorefrontLink>
            ))}
          </div>
        </section>

        <section className="mx-3 mt-16 md:mx-6 md:mt-24">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-3xl font-semibold md:text-5xl">New Arrivals</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              {arrivalFilters.map((filter, index) => (
                <button
                  key={filter}
                  type="button"
                  className={`h-9 rounded-full border px-4 ${
                    index === 0
                      ? "border-[#1c1812] bg-[#1c1812] text-[#f7f3eb]"
                      : "border-[#1c1812]/25 hover:bg-[#1c1812]/5"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {featuredProducts.slice(0, 4).map((product, index) => (
              <FurnitureProductCard key={product.id} product={product} index={index} editable={editable} />
            ))}
          </div>
          <div className="mt-8 flex justify-center gap-2">
            <button type="button" aria-label="Previous" className="flex size-10 items-center justify-center rounded-full border border-[#1c1812]/20 hover:bg-[#1c1812]/5">
              <ArrowLeft className="size-4" />
            </button>
            <button type="button" aria-label="Next" className="flex size-10 items-center justify-center rounded-full bg-[#1c1812] text-[#f7f3eb]">
              <ArrowRight className="size-4" />
            </button>
          </div>
        </section>

        <section className="relative mx-3 mt-16 min-h-[420px] overflow-hidden rounded-3xl bg-[#e8dfd0] md:mx-6 md:mt-24 md:min-h-[520px]">
          <img
            src={furnitureHardwareTemplateImages.collection}
            alt="Modern Form Collection"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#f7f3eb]/70 via-[#f7f3eb]/20 to-transparent" />
          <div className="relative max-w-xl p-6 md:p-14 lg:p-20">
            <div className="mb-4 text-xs uppercase tracking-widest text-[#1c1812]/60">New Season Edit</div>
            <h2 className="text-4xl font-semibold leading-[0.95] md:text-6xl">
              Modern Form
              <br />
              Collection
            </h2>
            <p className="mt-5 text-sm text-[#1c1812]/70">Designed for contemporary living.</p>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#1c1812]/70">
              Minimal shapes, natural materials, and refined details come together to create furniture that feels calm, functional, and timeless. Crafted to elevate modern spaces — without excess.
            </p>
            <StorefrontLink
              href="/products"
              className="mt-8 inline-flex h-12 items-center rounded-full bg-[#f7f3eb] px-6 text-sm font-medium text-[#1c1812] hover:bg-[#f7f3eb]/90"
            >
              View All
            </StorefrontLink>
          </div>
          <div className="pointer-events-none absolute right-0 top-0 h-52 w-52 overflow-hidden">
            <div className="absolute -right-14 top-8 w-72 rotate-45 bg-[#c43d2f] py-2 text-center text-xs font-semibold tracking-wider text-[#f7f3eb]">
              UP TO 10% OFF • UP TO 10% OFF
            </div>
          </div>
          <div className="absolute bottom-6 right-6 flex gap-2">
            <button type="button" aria-label="Previous" className="flex size-10 items-center justify-center rounded-full border border-[#1c1812]/10 bg-[#f7f3eb]/80 backdrop-blur">
              <ArrowLeft className="size-4" />
            </button>
            <button type="button" aria-label="Next" className="flex size-10 items-center justify-center rounded-full border border-[#1c1812]/10 bg-[#f7f3eb]/80 backdrop-blur">
              <ArrowRight className="size-4" />
            </button>
          </div>
        </section>

        <section className="mx-3 mt-16 md:mx-6 md:mt-24">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-3xl font-semibold md:text-5xl">Style your space by room</h2>
            <div className="flex gap-2">
              <button type="button" aria-label="Previous" className="flex size-10 items-center justify-center rounded-full border border-[#1c1812]/20">
                <ArrowLeft className="size-4" />
              </button>
              <button type="button" aria-label="Next" className="flex size-10 items-center justify-center rounded-full border border-[#1c1812]/20">
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {furnitureHardwareRooms.map((room) => (
              <div key={room.name} className="group relative aspect-[4/5] overflow-hidden rounded-2xl">
                <img
                  src={room.image}
                  alt={room.name}
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between gap-4 text-white">
                  <div>
                    <div className="text-2xl font-semibold md:text-3xl">{room.name}</div>
                    <div className="mt-1 max-w-[220px] text-xs opacity-85">{room.copy}</div>
                  </div>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/90 text-[#1c1812]">
                    <ArrowRight className="size-4" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-3 mt-16 md:mx-6 md:mt-24">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-3xl font-semibold md:text-5xl">Crafted &amp; Loved</h2>
            <div className="flex gap-2">
              <button type="button" aria-label="Previous" className="flex size-10 items-center justify-center rounded-full border border-[#1c1812]/20">
                <ArrowLeft className="size-4" />
              </button>
              <button type="button" aria-label="Next" className="flex size-10 items-center justify-center rounded-full border border-[#1c1812]/20">
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {furnitureHardwareReviews.map((review) => (
              <article key={review.name} className="rounded-2xl border border-[#e8e0d4]/60 bg-white p-6">
                <div className="flex items-center gap-3 rounded-xl border border-[#e8e0d4] p-3">
                  <img src={review.image} alt={review.product} className="size-12 rounded-lg object-cover bg-[#f4f0e8]" />
                  <div>
                    <div className="text-sm font-medium">{review.product}</div>
                    <div className="mt-0.5 text-xs text-[#7a6e5e]">${review.price.toFixed(2)}</div>
                  </div>
                </div>
                <div className="mt-4 flex gap-0.5 text-[#c43d2f]">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="size-4 fill-current" />
                  ))}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-[#1c1812]/75">{review.body}</p>
                <div className="mt-5 flex items-center gap-3 border-t border-[#e8e0d4] pt-4">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#f4f0e8] text-xs font-semibold">
                    {review.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{review.name}</div>
                    <div className="text-xs text-[#7a6e5e]">{review.city}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="mx-3 mb-6 mt-20 rounded-3xl bg-[#1c1812] p-8 text-[#f7f3eb] md:mx-6 md:mt-28 md:p-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="text-2xl font-semibold tracking-[0.35em]" style={{ fontFamily: "var(--font-display)" }}>
              {brandLabel}
            </div>
            <p className="mt-4 max-w-sm text-sm text-[#f7f3eb]/70">
              Furniture designed to blend timeless silhouettes with the calm of modern living.
            </p>
            <form className="mt-6 flex max-w-sm gap-2" onSubmit={(event) => event.preventDefault()}>
              <input
                type="email"
                placeholder="Enter your email"
                className="h-11 flex-1 rounded-full border border-[#f7f3eb]/20 bg-[#f7f3eb]/10 px-4 text-sm outline-none placeholder:text-[#f7f3eb]/50 focus:border-[#f7f3eb]/50"
              />
              <button type="submit" className="h-11 rounded-full bg-[#c43d2f] px-5 text-sm font-medium text-[#f7f3eb]">
                Subscribe
              </button>
            </form>
          </div>
          {furnitureHardwareFooterColumns.map((column) => (
            <div key={column.title}>
              <div className="mb-4 text-sm font-semibold">{column.title}</div>
              <ul className="space-y-3 text-sm text-[#f7f3eb]/70">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <StorefrontLink href={link.href} className="hover:text-[#f7f3eb]">
                      {link.label}
                    </StorefrontLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap justify-between gap-2 border-t border-[#f7f3eb]/15 pt-6 text-xs text-[#f7f3eb]/60">
          <span>© {new Date().getFullYear()} {store.business_name}. All rights reserved.</span>
          <span>Crafted with care.</span>
        </div>
      </footer>
    </div>
  );
}
