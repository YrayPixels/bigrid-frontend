"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { toast } from "sonner";
import type { Store, StorefrontContent, StoreProduct } from "@/lib/api/types";
import { EditableImage } from "@/components/storefront/theme/editable-image";
import { EditableText } from "@/components/storefront/theme/editable-text";
import { StorefrontLink } from "@/components/storefront/theme/storefront-link";
import { StorefrontFaqSection } from "@/components/storefront/pages/storefront-faq-section";
import { CategoryShowcaseBlock } from "@/components/storefront/blocks/category-showcase-block";
import { beautyTemplateImages } from "@/lib/storefront/beauty-defaults";
import { formatMoney } from "@/lib/storefront/format";
import { getHomepageProducts } from "@/lib/storefront/product-plugs";
import { useCart } from "@/lib/storefront/cart-context";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

const beautyDifference = [
  ["01", "Undetectable closures", "Seamless finishes made to blend naturally with your hairline."],
  ["02", "Virgin textures", "Soft, full bundles selected for movement, body, and longevity."],
  ["03", "No-shed finishing", "Reinforced wefts and gentle care routines for longer wear."],
  ["04", "Ready-to-style", "Curated textures, ponytails, and kits for salon-level looks."],
];

function BeautyProductCard({
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
  const imageUrl = product.image_url ?? beautyTemplateImages.products[index % beautyTemplateImages.products.length];

  function addToCart() {
    addItem(product, 1);
    toast.success("Added to cart");
  }

  return (
    <article className="group text-center">
      <Link
        href={editable ? "#" : `/products/${product.slug}`}
        className={editable ? "pointer-events-none block" : "block"}
        aria-disabled={editable}
      >
        <div
          className="mx-auto aspect-[3/4] max-w-[150px] overflow-hidden"
          style={{ backgroundColor: theme.palette.surface }}
        >
          <EditableImage
            path={imagePath}
            src={imageUrl}
            alt={product.name}
            className="h-full w-full"
            imgClassName="object-cover object-center transition duration-500 group-hover:scale-105"
          />
        </div>
      </Link>
      <div className="mt-3">
        <div className="mb-1 flex justify-center gap-0.5" style={{ color: theme.palette.text }}>
          {Array.from({ length: 5 }).map((_, starIndex) => (
            <Star key={starIndex} className="h-2.5 w-2.5 fill-current" />
          ))}
        </div>
        <h3 className="line-clamp-1 text-[11px] font-medium">{product.name}</h3>
        <p className="mt-1 text-[10px]" style={{ color: theme.palette.muted }}>
          {formatMoney(product.price, product.currency)}
        </p>
        <button
          type="button"
          onClick={addToCart}
          disabled={editable}
          className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] underline underline-offset-4 transition disabled:cursor-default disabled:opacity-70"
        >
          Add to bag
        </button>
      </div>
    </article>
  );
}

export function BeautyHome({
  store,
  storefront,
}: {
  store: Store;
  storefront: StorefrontContent;
}) {
  const { theme, mode } = useStorefrontTheme();
  const { categories } = useStorefront();
  const products = storefront.products ?? [];
  const { products: featuredProducts, source: productSource } = getHomepageProducts(
    storefront,
    "beauty",
    8,
  );
  const heroImageUrl = storefront.media?.hero_image_url ?? beautyTemplateImages.hero;
  const aboutImageUrl = storefront.media?.about_image_url ?? beautyTemplateImages.about;

  return (
    <div style={{ backgroundColor: theme.palette.background, color: theme.palette.text }}>
      <section
        className="relative overflow-hidden px-4 pb-0 pt-10 sm:px-6 lg:pt-16"
        style={{ backgroundColor: theme.palette.accent }}
      >
        <div className="mx-auto grid max-w-7xl items-end gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative z-10 pb-12 lg:pb-24">
            <EditableText
              path="hero.headline"
              value={storefront.hero.headline}
              as="h1"
              className="max-w-xl text-5xl font-semibold leading-[0.9] tracking-[-0.06em] sm:text-6xl lg:text-7xl"
              style={{ color: theme.palette.text, fontFamily: "var(--font-editorial)" }}
            />
            <div
              className="-mt-2 ml-28 rotate-[-8deg] text-6xl leading-none sm:text-7xl"
              style={{ color: theme.palette.surface, fontFamily: "var(--font-script)" }}
            >
              truly
            </div>
            <EditableText
              path="hero.subheadline"
              value={storefront.hero.subheadline}
              as="p"
              className="mt-5 max-w-[260px] text-[11px] leading-5"
              style={{ color: theme.palette.text }}
              multiline
            />
            <StorefrontLink
              href="/products"
              className="mt-5 inline-flex px-5 py-2 text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
            >
                {storefront.hero.cta_label}
            </StorefrontLink>
          </div>

          <div className="relative min-h-[520px]">
            <EditableImage
              path="media.hero_image_url"
              src={heroImageUrl}
              alt={`${store.business_name} hair campaign`}
              className="absolute bottom-0 left-1/2 h-[560px] w-[82%] -translate-x-1/2 overflow-hidden"
              imgClassName="object-cover object-top"
            />
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-2">
        <div
          className="flex min-h-[360px] flex-col items-center justify-between px-6 pb-0 pt-9 text-center"
          style={{ backgroundColor: theme.palette.surface }}
        >
          <div>
            <h2 className="text-3xl font-bold tracking-[-0.04em]" style={{ fontFamily: "var(--font-editorial)" }}>
              The perfect match.
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-[10px] leading-4" style={{ color: theme.palette.muted }}>
              Our signature textures are created to blend flawlessly with natural curls, coils, and blowouts.
            </p>
            <StorefrontLink
              href="/products"
              className="mt-4 inline-flex px-5 py-2 text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
            >
              Shop extensions
            </StorefrontLink>
          </div>
          <EditableImage
            path="media.about_image_url"
            src={aboutImageUrl}
            alt={`${store.business_name} perfect texture match`}
            className="mt-7 h-56 w-full max-w-sm overflow-hidden"
            imgClassName="object-cover object-top"
          />
        </div>

        <div
          className="flex min-h-[360px] flex-col items-center justify-between px-6 pb-0 pt-9 text-center"
          style={{ backgroundColor: theme.palette.background }}
        >
          <div>
            <h2 className="text-3xl font-bold tracking-[-0.04em]" style={{ fontFamily: "var(--font-editorial)" }}>
              Perfect extensions kit.
            </h2>
            <p className="mx-auto mt-2 max-w-xs text-[10px] leading-4" style={{ color: theme.palette.muted }}>
              Care and styling essentials that keep every install soft, glossy, and ready to wear.
            </p>
            <StorefrontLink
              href="/products"
              className="mt-4 inline-flex px-5 py-2 text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
            >
              Shop extensions care
            </StorefrontLink>
          </div>
          <EditableImage
            src={beautyTemplateImages.careKit}
            alt={`${store.business_name} extensions care kit`}
            className="mt-7 h-56 w-full max-w-sm overflow-hidden"
            imgClassName="object-contain"
          />
        </div>
      </section>

      <section
        className="relative overflow-hidden px-4 py-16 sm:px-6 lg:py-20"
        style={{ backgroundColor: theme.palette.text, color: theme.palette.background }}
      >
        <EditableImage
          src={beautyTemplateImages.texture}
          alt=""
          className="absolute inset-0 opacity-35"
          imgClassName="object-cover"
        />
        <div className="relative mx-auto max-w-5xl">
          <h2
            className="text-center text-5xl leading-none sm:text-6xl"
            style={{ fontFamily: "var(--font-script)" }}
          >
            the heatfree hair difference
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2">
            {beautyDifference.map(([number, title, body]) => (
              <div key={number} className="grid grid-cols-[44px_1fr] gap-4">
                <div
                  className="grid h-11 w-11 place-items-center rounded-full border text-xs"
                  style={{ borderColor: `${theme.palette.background}66` }}
                >
                  {number}
                </div>
                <div>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.18em]">{title}</h3>
                  <p className="mt-2 text-[10px] leading-5 opacity-70">{body}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-12 text-center text-[10px] font-bold uppercase tracking-[0.22em]">
            Feel good wearing your own hair. Shop women believe in and trust.
          </p>
        </div>
      </section>

      <CategoryShowcaseBlock storefront={storefront} categories={categories} blockId="category-showcase" />

      <section
        className="px-4 pb-16 text-center sm:px-6"
        style={{ backgroundColor: theme.palette.background }}
      >
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-[-0.04em]" style={{ fontFamily: "var(--font-editorial)" }}>
            Best sellers
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product, index) => (
              <BeautyProductCard
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

      <StorefrontFaqSection faqPage={storefront.pages?.faq} />
    </div>
  );
}
