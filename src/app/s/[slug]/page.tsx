"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { ProductCard } from "@/components/storefront/product-card";
import { useStorefront } from "@/lib/storefront/store-context";
import { formatMoney } from "@/lib/storefront/format";

const fashionCategories = [
  {
    title: "Hoodies",
    image:
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=900&q=85",
  },
  {
    title: "Sweatshirts",
    image:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=85",
  },
  {
    title: "T-Shirts",
    image:
      "https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=900&q=85",
  },
  {
    title: "Everyday Basics",
    image:
      "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=900&q=85",
  },
];

const fashionTemplateImages = {
  hero: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1800&q=90",
  about:
    "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=90",
  products: [
    "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1554568218-0f1715e72254?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&w=900&q=88",
  ],
};

const fashionFallbackProducts = [
  {
    id: "fashion-fallback-1",
    slug: "oversized-hoodie",
    name: "Oversized Hoodie",
    description: "A relaxed everyday hoodie cut for comfort and layering.",
    price: 28500,
    currency: "NGN",
    image_url: null,
  },
  {
    id: "fashion-fallback-2",
    slug: "wide-leg-trouser",
    name: "Wide Leg Trouser",
    description: "A clean staple trouser with an easy drape and polished finish.",
    price: 32500,
    currency: "NGN",
    image_url: null,
  },
  {
    id: "fashion-fallback-3",
    slug: "zip-sweatshirt",
    name: "Zip Sweatshirt",
    description: "A versatile midweight layer for weekday fits and weekend plans.",
    price: 24800,
    currency: "NGN",
    image_url: null,
  },
  {
    id: "fashion-fallback-4",
    slug: "cotton-tee",
    name: "Cotton Tee",
    description: "A soft essential tee with a neat shape and breathable feel.",
    price: 14500,
    currency: "NGN",
    image_url: null,
  },
];

function FashionHeroVisual({
  imageUrl,
  alt,
}: {
  imageUrl: string;
  alt: string;
}) {
  return (
    <div className="relative min-h-[430px] overflow-hidden bg-[#a7aaa5] sm:min-h-[560px] lg:min-h-[640px]">
      <img
        src={imageUrl}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/12 via-black/10 to-black/20" />
    </div>
  );
}

function FashionImageCard({
  imageUrl,
  alt,
  label,
  className = "",
}: {
  imageUrl: string;
  alt: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-[#eef0ef] ${className}`}>
      <img
        src={imageUrl}
        alt={alt}
        className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-105"
      />
      {label ? (
        <span className="absolute left-3 top-3 bg-[#80131b] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
          {label}
        </span>
      ) : null}
    </div>
  );
}

export default function StorefrontHomePage() {
  const { store, storefront } = useStorefront();
  const products = storefront.products ?? [];
  const chosenTemplate = store.storefront_template_id;
  const templateId =
    storefront.template?.id ??
    (chosenTemplate && chosenTemplate !== "ai_pick" ? chosenTemplate : "classic");
  const isEditorial = templateId === "editorial";
  const isBoldGrid = templateId === "bold_grid";
  const isFashionLookbook = templateId === "fashion_lookbook";

  if (isFashionLookbook) {
    const featureIcons = [ShieldCheck, BadgeCheck, RotateCcw, Truck];
    const featuredProducts = [...products, ...fashionFallbackProducts].slice(0, 4);
    const fashionValueProps = [
      ...storefront.value_props,
      { title: "Secure checkout", body: "Trusted payment protection." },
    ].slice(0, 4);

    return (
      <div className="bg-white text-[#111111]">
        <section className="relative">
          <FashionHeroVisual
            imageUrl={fashionTemplateImages.hero}
            alt={`${store.business_name} modern essentials campaign`}
          />
          <div className="absolute inset-0 grid place-items-center px-4 text-center">
            <div className="max-w-[720px] text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.28)]">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/85">
                Modern essentials
              </p>
              <h1 className="[font-family:var(--font-editorial)] text-5xl font-bold leading-[0.88] tracking-[-0.04em] sm:text-7xl lg:text-8xl">
                {storefront.hero.headline}
              </h1>
              <p className="mx-auto mt-4 max-w-md text-xs font-medium leading-6 text-white/90 sm:text-sm">
                {storefront.hero.subheadline}
              </p>
              <Link
                href="/products"
                className="mt-7 inline-flex items-center gap-2 bg-white px-7 py-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#111111] transition hover:bg-[#111111] hover:text-white"
              >
                {storefront.hero.cta_label}
              </Link>
            </div>
          </div>
        </section>

        <section className="border-y border-black/10 bg-[#f7f7f5] px-4 py-4 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {fashionValueProps.map((item, index) => {
              const Icon = featureIcons[index % featureIcons.length];
              return (
                <div key={item.title} className="flex items-center justify-center gap-3 text-left">
                  <Icon className="h-5 w-5 shrink-0 text-[#111111]" strokeWidth={1.4} />
                  <div>
                    <h3 className="text-[11px] font-bold uppercase tracking-[0.08em]">
                      {item.title}
                    </h3>
                    <p className="mt-0.5 text-[11px] leading-4 text-[#666666]">{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="bg-white px-4 py-16 text-center sm:px-6 lg:py-20">
          <p className="text-[11px] font-medium tracking-[0.18em] text-[#6e6e6e]">
            Minimal. Comfortable. Timeless.
          </p>
          <h2 className="mt-3 [font-family:var(--font-editorial)] text-4xl font-bold tracking-[-0.04em]">
            Shop the Essentials
          </h2>
          <div className="mx-auto mt-10 grid max-w-7xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {fashionCategories.map((category) => (
              <Link key={category.title} href="/products" className="group text-left">
                <FashionImageCard
                  imageUrl={category.image}
                  alt={`${category.title} clothing category`}
                  className="aspect-[4/5]"
                />
                <div className="mx-auto mt-3 flex w-fit items-center justify-center gap-2 border-b border-[#111111] pb-0.5 [font-family:var(--font-editorial)] text-lg font-bold leading-none">
                  {category.title}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-white px-4 py-16 text-center sm:px-6 lg:py-20">
          <h2 className="[font-family:var(--font-editorial)] text-4xl font-bold tracking-[-0.04em]">
            Our Best Sellers
          </h2>
          <p className="mt-2 text-[11px] text-[#6e6e6e]">
            Customer favourites, always in style.
          </p>
          <div className="mx-auto mt-10 grid max-w-7xl gap-7 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product, index) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group block text-left"
              >
                <FashionImageCard
                  imageUrl={
                    product.image_url ??
                    fashionTemplateImages.products[index % fashionTemplateImages.products.length]
                  }
                  label={index === 1 ? "-19%" : index === 2 ? "-5%" : undefined}
                  alt={product.name}
                  className="aspect-[4/5]"
                />
                <h3 className="mt-4 min-h-9 text-xs font-bold leading-[1.15] group-hover:underline">
                  {product.name}
                </h3>
                <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#6e6e6e]">
                  {product.description}
                </p>
                <div className="mt-2 text-xs font-semibold tracking-tight">
                  {formatMoney(product.price, product.currency)}
                </div>
                <div className="mt-3 flex gap-1">
                  {["#233b30", "#121212", "#d9c7a8"].map((color) => (
                    <span
                      key={color}
                      className="h-3 w-3 rounded-full border border-black/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid bg-[#eef2ef] lg:grid-cols-2">
          <div className="relative min-h-[440px] overflow-hidden bg-[#a7aaa5] lg:min-h-[620px]">
            <img
              src={fashionTemplateImages.about}
              alt={`${store.business_name} brand story`}
              className="absolute inset-0 h-full w-full object-cover object-center"
            />
          </div>
          <div className="flex min-h-[460px] flex-col justify-between px-6 py-12 sm:px-12 lg:px-16">
            <div className="flex items-center justify-between text-[11px]">
              <span>About</span>
              <span>Since 2026</span>
            </div>
            <div>
              <h2 className="max-w-xl [font-family:var(--font-editorial)] text-3xl font-bold leading-[1.08] tracking-[-0.04em] sm:text-5xl">
                {store.business_name} designs modern essentials that blend comfort, simplicity, and
                timeless style.
              </h2>
              <p className="mt-5 max-w-lg text-sm leading-7 text-[#525252]">
                {storefront.about.body}
              </p>
              <Link
                href="/about"
                className="mt-8 inline-flex bg-[#111111] px-7 py-3 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white transition hover:bg-white hover:text-[#111111]"
              >
                Learn more
              </Link>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#525252]">
              <span>Made with love</span>
              <span>For every body</span>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
      <section
        className={`px-4 py-16 sm:px-6 sm:py-24 ${isEditorial ? "text-center" : ""}`}
        style={{
          background: isBoldGrid
            ? `linear-gradient(135deg, ${store.brand_color}24 0%, ${store.brand_color}08 52%, transparent 52%)`
            : `linear-gradient(135deg, ${store.brand_color}18, ${store.brand_color}05)`,
        }}
      >
        <div className={`w-full ${isEditorial ? "grid place-items-center" : ""}`}>
          <span
            className="inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide"
            style={{ backgroundColor: `${store.brand_color}22`, color: store.brand_color }}
          >
            {store.business_name} · {templateId.replace("_", " ")}
          </span>
          <h1
            className={`mt-4 w-full font-display text-4xl font-bold tracking-tight sm:text-5xl ${
              isBoldGrid ? "sm:text-6xl" : ""
            }`}
          >
            {storefront.hero.headline}
          </h1>
          <p className="mt-4 w-full text-lg text-muted-foreground">{storefront.hero.subheadline}</p>
          <Link
            href="/products"
            className="mt-8 inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold text-white shadow-elevated"
            style={{ backgroundColor: store.brand_color }}
          >
            {storefront.hero.cta_label} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="w-full px-4 py-16 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-bold">
              {isEditorial ? "The collection" : "Featured products"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {isBoldGrid
                ? "A quick look at what customers are buying now."
                : "Browse the catalog and add items to your cart."}
            </p>
          </div>
          <Link
            href="/products"
            className="text-sm font-semibold"
            style={{ color: store.brand_color }}
          >
            View all
          </Link>
        </div>
        <div
          className={`grid gap-6 sm:grid-cols-2 ${isBoldGrid ? "lg:grid-cols-3" : "lg:grid-cols-3"}`}
        >
          {products.slice(0, 3).map((product) => (
            <ProductCard key={product.id} product={product} brandColor={store.brand_color} />
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-card">
        <div
          className={`grid w-full gap-8 px-4 py-16 sm:grid-cols-3 sm:px-6 ${
            isEditorial ? "text-center" : ""
          }`}
        >
          {storefront.value_props.map((item, index) => (
            <div key={item.title}>
              <div
                className={`grid h-9 w-9 place-items-center text-sm font-bold text-white ${
                  isEditorial ? "mx-auto rounded-full" : "rounded-lg"
                }`}
                style={{ backgroundColor: store.brand_color }}
              >
                {index + 1}
              </div>
              <h3 className="mt-3 font-display text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
