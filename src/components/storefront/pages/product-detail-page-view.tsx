"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronDown, Minus, Plane, Plus, Star } from "lucide-react";
import { toast } from "sonner";
import type { StoreProduct } from "@/lib/api/types";
import { useCart } from "@/lib/storefront/cart-context";
import { useStorefront } from "@/lib/storefront/store-context";
import { fashionTemplateImages } from "@/lib/storefront/fashion-defaults";
import { minimalisticTemplateImages } from "@/lib/storefront/minimalistic-defaults";
import { formatMoney } from "@/lib/storefront/format";
import { PageContainer } from "@/components/storefront/theme/page-container";
import { PrimaryButton } from "@/components/storefront/theme/primary-button";
import { StorefrontFaqSection } from "@/components/storefront/pages/storefront-faq-section";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { cn } from "@/lib/utils";

const fashionSizeFallbacks = [
  "38",
  "39",
  "40",
  "40.5",
  "41",
  "41.5",
  "42",
  "42.5",
  "43",
  "43.5",
  "44",
  "45",
];
const fashionPaymentMethods = ["VISA", "MC", "Pay", "G Pay", "PayPal", "AmEx"];
const fashionReviewImages = [
  "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=240&q=80",
  "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=240&q=80",
];
function FashionProductDetail({ product }: { product: StoreProduct }) {
  const { addItem } = useCart();
  const { storefront } = useStorefront();
  const [quantity, setQuantity] = useState(1);
  const sizeVariant = product.variants?.find((variant) => /size/i.test(variant.name));
  const displayVariant = sizeVariant ?? product.variants?.[0];
  const sizeOptions = displayVariant?.options?.length
    ? displayVariant.options
    : fashionSizeFallbacks;
  const [selectedSize, setSelectedSize] = useState(sizeOptions[0]);
  const faqPage = storefront.pages?.faq;
  const galleryImages = useMemo(
    () => [
      product.image_url ?? fashionTemplateImages.products[0],
      ...(product.image_url
        ? [product.image_url, product.image_url, product.image_url]
        : fashionTemplateImages.products.slice(1)),
    ],
    [product.image_url],
  );

  function addToCart(label = "Added to cart") {
    addItem(product, quantity);
    toast.success(label);
  }

  return (
    <div className="bg-white text-[#111111]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] lg:gap-12 lg:py-12">
        <div className="grid gap-2 sm:grid-cols-[112px_minmax(0,1fr)]">
          <div className="order-2 grid grid-cols-4 gap-2 sm:order-1 sm:grid-cols-1">
            {galleryImages.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                className="aspect-square overflow-hidden bg-[#f0f0ef]"
                aria-label={`View ${product.name} image ${index + 1}`}
              >
                <img src={image} alt="" className="h-full w-full object-cover object-center" />
              </button>
            ))}
          </div>
          <div className="order-1 flex min-h-[430px] items-center justify-center bg-[#f1f1f0] sm:order-2 lg:min-h-[610px]">
            <img
              src={galleryImages[0]}
              alt={product.name}
              className="h-full w-full object-contain object-center p-8 sm:p-12"
            />
          </div>
        </div>

        <section className="lg:pt-1">
          <h1 className="max-w-xl text-xl font-bold leading-tight sm:text-2xl">{product.name}</h1>
          {product.category ? (
            <span className="mt-3 inline-flex bg-[#26f3e6] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#111111]">
              {product.category}
            </span>
          ) : null}

          <div className="mt-5 flex items-baseline gap-2">
            <span className="text-sm font-bold">
              {formatMoney(product.price, product.currency)}
            </span>
            <span className="text-[11px] text-[#9a9a9a]">Vat included</span>
          </div>

          <div className="mt-7">
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span>Select {displayVariant?.name?.toLowerCase() ?? "size"} (USA)</span>
              <button type="button" className="border-b border-[#111111] font-bold">
                Size guide
              </button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {sizeOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSelectedSize(option)}
                  className={cn(
                    "border px-3 py-3 text-xs font-medium transition",
                    selectedSize === option
                      ? "border-[#111111] bg-[#111111] text-white"
                      : "border-black/15 bg-white text-[#333333] hover:border-[#111111]",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 bg-[#fff8f2] px-4 py-4 text-center text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#111111]">
            1 day delivery in USA · same day delivery in the UAE · free shipping and returns
          </div>

          <div className="mt-6 flex w-fit items-center border border-[#111111]">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center"
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              aria-label="Decrease quantity"
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
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => addToCart("Ready for checkout")}
              className="bg-[#050505] px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#333333]"
            >
              Buy now
            </button>
            <button
              type="button"
              onClick={() => addToCart()}
              className="border border-[#111111] bg-white px-6 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#111111] transition hover:bg-[#111111] hover:text-white"
            >
              Add to cart
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {fashionPaymentMethods.map((method) => (
              <span
                key={method}
                className="rounded-[3px] border border-black/10 bg-white px-2 py-1 text-[9px] font-bold text-[#35527d] shadow-sm"
              >
                {method}
              </span>
            ))}
          </div>

          <div className="mt-6 flex gap-3 border-b border-black/10 pb-5">
            <Plane className="mt-0.5 h-5 w-5" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-bold">Free Shipping</p>
              <p className="mt-1 text-[11px] text-[#555555]">Estimated Delivery: Thu, May 9</p>
            </div>
          </div>

          <div className="divide-y divide-black/10 border-b border-black/10">
            {[
              ["What's it do?", product.description],
              ["Shipping & returns", "Free standard shipping, easy returns, and secure checkout."],
              [
                "Product DNA",
                product.perks?.join(" ") ||
                  "Designed for everyday comfort with a refined fashion fit.",
              ],
            ].map(([title, body]) => (
              <details key={title} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold">
                  {title}
                  <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-6 text-[#555555]">{body}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div>
          <h2 className="border-b border-[#111111] pb-3 text-sm font-bold">Reviews (3)</h2>
          <div className="mt-6 flex items-end gap-1">
            <span className="text-6xl font-light leading-none text-[#236c42]">4.9</span>
            <span className="pb-2 text-xl text-[#777777]">/5</span>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[#f5d24c]">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} className="h-4 w-4 fill-current" />
            ))}
            <span className="ml-2 text-xs font-bold text-[#111111]">3 Review</span>
          </div>
        </div>

        <div className="space-y-4">
          {[
            {
              name: "Jhon Mitchel",
              date: "27/04/2024",
              text: "I love the style and comfort of the shoe. I wish it was just a tad easier to slip on but once it's in it fits like a glove.",
            },
            {
              name: "Amelia Rose",
              date: "18/04/2024",
              text: "Clean fit, premium feel, and easy to pair with my everyday outfits.",
            },
          ].map((review, index) => (
            <article
              key={review.name}
              className="grid gap-4 bg-[#fafafa] p-5 sm:grid-cols-[1fr_96px]"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      src={fashionReviewImages[index]}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="text-sm font-bold">{review.name}</h3>
                      <div className="mt-1 flex text-[#f5d24c]">
                        {Array.from({ length: 5 }).map((_, starIndex) => (
                          <Star key={starIndex} className="h-3.5 w-3.5 fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-[#999999]">{review.date}</span>
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-[#444444]">{review.text}</p>
              </div>
              <img
                src={galleryImages[index % galleryImages.length]}
                alt=""
                className="hidden h-24 w-24 object-cover sm:block"
              />
            </article>
          ))}
        </div>
      </section>

      <StorefrontFaqSection faqPage={faqPage} />
    </div>
  );
}

function MinimalisticProductDetail({ product }: { product: StoreProduct }) {
  const { addItem } = useCart();
  const { storefront } = useStorefront();
  const [quantity, setQuantity] = useState(1);
  const faqPage = storefront.pages?.faq;
  const galleryImages = useMemo(
    () => [
      product.image_url ?? minimalisticTemplateImages.products[0],
      ...(product.image_url
        ? [product.image_url, product.image_url, product.image_url]
        : minimalisticTemplateImages.products.slice(1, 4)),
    ],
    [product.image_url],
  );

  function addToCart(label = "Added to cart") {
    addItem(product, quantity);
    toast.success(label);
  }

  return (
    <div className="bg-[#fbfbdc] text-[#073e3f]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:py-14">
        <div className="grid gap-3 sm:grid-cols-[96px_minmax(0,1fr)]">
          <div className="order-2 grid grid-cols-4 gap-3 sm:order-1 sm:grid-cols-1">
            {galleryImages.map((image, index) => (
              <button
                key={`${image}-${index}`}
                type="button"
                className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-white/80 p-3 shadow-sm"
                aria-label={`View ${product.name} image ${index + 1}`}
              >
                <img src={image} alt="" className="h-full w-full object-contain object-center" />
              </button>
            ))}
          </div>
          <div className="order-1 flex min-h-[430px] items-center justify-center overflow-hidden rounded-[2rem] bg-white/80 p-10 shadow-[0_24px_80px_rgba(7,62,63,0.08)] sm:order-2 lg:min-h-[610px]">
            <img
              src={galleryImages[0]}
              alt={product.name}
              className="h-full w-full object-contain object-center"
            />
          </div>
        </div>

        <section className="rounded-[2rem] bg-white/80 p-6 shadow-[0_24px_80px_rgba(7,62,63,0.08)] ring-1 ring-[#073e3f]/5 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#fbfbdc] px-3 py-1.5 text-[11px] font-semibold">
            <span className="h-2 w-5 rounded-full bg-[#073e3f]" />
            Daily Essential
            <span className="h-2 w-5 rounded-full bg-[#073e3f]" />
          </div>
          <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight tracking-[-0.045em]">
            {product.name}
          </h1>
          {product.category ? (
            <span className="mt-4 inline-flex rounded-full bg-[#eff5c4] px-3 py-1.5 text-[11px] font-semibold text-[#073e3f]">
              {product.category}
            </span>
          ) : null}

          <div className="mt-5 flex items-center gap-3">
            <div className="flex text-[#efc64b]">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <span className="text-xs font-semibold text-[#073e3f]/60">4.9 customer rating</span>
          </div>

          <p className="mt-5 max-w-xl text-sm leading-7 text-[#073e3f]/65">
            {product.description}
          </p>

          <div className="mt-6 text-3xl font-semibold tracking-[-0.04em]">
            {formatMoney(product.price, product.currency)}
          </div>

          {product.variants?.length ? (
            <div className="mt-7 space-y-4">
              {product.variants.map((variant) => (
                <div key={variant.name}>
                  <div className="text-sm font-bold">{variant.name}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {variant.options.map((option) => (
                      <span
                        key={option}
                        className="rounded-full border border-[#073e3f]/10 bg-[#fbfbdc] px-4 py-2 text-xs font-semibold text-[#073e3f]/70"
                      >
                        {option}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="mt-7 flex w-fit items-center gap-3 rounded-full bg-[#fbfbdc] p-1">
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#073e3f]"
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              aria-label="Decrease quantity"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-5 text-center text-sm font-semibold">{quantity}</span>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#073e3f]"
              onClick={() => setQuantity((current) => current + 1)}
              aria-label="Increase quantity"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => addToCart("Ready for checkout")}
              className="rounded-full bg-[#073e3f] px-6 py-3 text-sm font-semibold text-[#fbfbdc] transition hover:bg-[#0a5253]"
            >
              Buy now
            </button>
            <button
              type="button"
              onClick={() => addToCart()}
              className="rounded-full border border-[#073e3f]/15 bg-white px-6 py-3 text-sm font-semibold text-[#073e3f] transition hover:bg-[#fbfbdc]"
            >
              Add to cart
            </button>
          </div>

          <div className="mt-6 flex gap-3 rounded-2xl bg-[#fbfbdc] p-4">
            <Plane className="mt-0.5 h-5 w-5" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-bold">Free Shipping</p>
              <p className="mt-1 text-xs text-[#073e3f]/60">
                Estimated delivery in 2-4 business days.
              </p>
            </div>
          </div>

          <div className="mt-6 divide-y divide-[#073e3f]/10 border-y border-[#073e3f]/10">
            {[
              ["What's it do?", product.description],
              ["Clean formula", "Made for a simple daily wellness routine with trusted ingredients."],
              [
                "Product benefits",
                product.perks?.join(" ") ||
                  "Supports daily balance, consistency, and feel-good routines.",
              ],
            ].map(([title, body]) => (
              <details key={title} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                  {title}
                  <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm leading-6 text-[#073e3f]/65">{body}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      <section className="px-4 pb-14 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-3">
          {["Science backed", "Clean ingredients", "Trusted quality"].map((label) => (
            <div key={label} className="rounded-[1.5rem] bg-white/80 p-6 text-center shadow-sm">
              <div className="mx-auto mb-4 h-2 w-10 rounded-full bg-[#073e3f]" />
              <h2 className="font-bold">{label}</h2>
              <p className="mt-2 text-sm leading-6 text-[#073e3f]/60">
                Designed to make daily wellness feel simple, calm, and consistent.
              </p>
            </div>
          ))}
        </div>
      </section>

      <StorefrontFaqSection faqPage={faqPage} />
    </div>
  );
}

export function ProductDetailPageView({ product }: { product: StoreProduct | null }) {
  const { theme, mode } = useStorefrontTheme();
  const { addItem } = useCart();

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
            style={{ color: theme.brandColor }}
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

  const fallbackImage =
    theme.id === "minimalistic" ? minimalisticTemplateImages.products[0] : product.image_url;
  const productImageUrl = product.image_url ?? fallbackImage;

  return (
    <PageContainer>
      <div className="grid gap-10 lg:grid-cols-2">
        <div
          className="flex aspect-square items-center justify-center rounded-3xl text-6xl font-bold text-white"
          style={{
            background: `linear-gradient(135deg, ${theme.brandColor}, ${theme.brandColor}88)`,
          }}
        >
          {productImageUrl ? (
            <img
              src={productImageUrl}
              alt={product.name}
              className="h-full w-full rounded-3xl object-cover"
            />
          ) : (
            product.name.slice(0, 1)
          )}
        </div>
        <div>
          {mode !== "edit" ? (
            <Link href="/products" className="text-sm text-muted-foreground hover:text-foreground">
              Back to products
            </Link>
          ) : null}
          <h1
            className="mt-4 text-4xl font-bold tracking-tight"
            style={{ fontFamily: theme.displayFont }}
          >
            {product.name}
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">{product.description}</p>
          <div className="mt-6 text-2xl font-semibold" style={{ color: theme.brandColor }}>
            {formatMoney(product.price, product.currency)}
          </div>
          {product.variants?.length ? (
            <div className="mt-6 space-y-4">
              {product.variants.map((variant) => (
                <div key={variant.name}>
                  <div className="text-sm font-semibold">{variant.name}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {variant.options.map((option) => (
                      <span
                        key={option}
                        className="rounded-full border px-3 py-1 text-sm text-muted-foreground"
                      >
                        {option}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {product.perks?.length ? (
            <div className="mt-6 rounded-2xl border bg-card p-4">
              <h2 className="text-sm font-semibold">Why customers like it</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {product.perks.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <PrimaryButton
            className="mt-8"
            onClick={() => {
              addItem(product);
              toast.success("Added to cart");
            }}
          >
            Add to cart
          </PrimaryButton>
        </div>
      </div>
    </PageContainer>
  );
}
