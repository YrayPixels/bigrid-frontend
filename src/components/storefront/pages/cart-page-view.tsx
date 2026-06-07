"use client";

import Link from "next/link";
import { Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/storefront/cart-context";
import { fashionTemplateImages } from "@/lib/storefront/fashion-defaults";
import { minimalisticTemplateImages } from "@/lib/storefront/minimalistic-defaults";
import { formatMoney } from "@/lib/storefront/format";
import { PageContainer } from "@/components/storefront/theme/page-container";
import { PrimaryButton } from "@/components/storefront/theme/primary-button";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

function FashionCartPageView() {
  const { lines, subtotal, setQuantity, removeItem } = useCart();
  const { theme, mode } = useStorefrontTheme();

  if (lines.length === 0) {
    return (
      <div className="bg-[#fffaf4] px-4 py-16 text-[#242424] sm:px-6">
        <div className="mx-auto max-w-4xl rounded-[2rem] bg-white/75 px-6 py-14 text-center shadow-[0_24px_80px_rgba(36,26,18,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c7775d]">
            Shopping bag
          </p>
          <h1
            className="mt-4 text-4xl font-bold tracking-[-0.04em] sm:text-5xl"
            style={{ fontFamily: theme.displayFont }}
          >
            Your cart is empty
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#766f68]">
            Add your favorite pieces before moving into checkout.
          </p>
          {mode === "edit" ? (
            <span className="mt-8 inline-flex rounded-full bg-[#242424] px-8 py-3 text-sm font-semibold text-white">
              Browse products
            </span>
          ) : (
            <Link
              href="/products"
              className="mt-8 inline-flex rounded-full bg-[#242424] px-8 py-3 text-sm font-semibold text-white transition hover:bg-[#3a3a3a]"
            >
              Browse products
            </Link>
          )}
        </div>
      </div>
    );
  }

  const currency = lines[0]?.product.currency;
  const shipping = 0;
  const tax = 0;
  const total = subtotal + shipping + tax;

  return (
    <div className="overflow-hidden bg-[#fffaf4] px-4 py-10 text-[#242424] sm:px-6 lg:py-14">
      <div className="relative mx-auto max-w-7xl rounded-[2rem] bg-white/70 px-5 py-8 shadow-[0_24px_90px_rgba(118,57,31,0.12)] ring-1 ring-black/[0.03] sm:px-8 lg:px-14">
        <div className="pointer-events-none absolute -right-20 bottom-4 hidden h-40 w-40 rounded-full border border-[#e8cfc1] lg:block" />
        <div className="pointer-events-none absolute -right-28 bottom-16 hidden h-52 w-52 rounded-full border border-[#e8cfc1] lg:block" />

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_350px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <section>
            <h1
              className="text-4xl font-bold tracking-[-0.04em] sm:text-5xl"
              style={{ fontFamily: theme.displayFont }}
            >
              Cart
            </h1>

            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-[#5c5751]">
              {["Cart", "Checkout", "Payment"].map((step, index) => (
                <div key={step} className="flex items-center gap-3">
                  <span className={index === 0 ? "font-bold text-[#242424]" : ""}>
                    {index + 1}. {step}
                  </span>
                  {index < 2 ? <span className="h-px w-12 bg-[#d7c9bd] sm:w-16" /> : null}
                </div>
              ))}
            </div>

            <div className="mt-8 divide-y divide-[#eadfd5]">
              {lines.map((line, index) => {
                const image =
                  line.product.image_url ??
                  fashionTemplateImages.products[index % fashionTemplateImages.products.length];
                const variantSummary = line.product.variants?.slice(0, 2) ?? [];

                return (
                  <article key={line.product.id} className="py-6 first:pt-0">
                    <div className="grid gap-5 sm:grid-cols-[128px_minmax(0,1fr)]">
                      <div className="aspect-square overflow-hidden rounded-2xl bg-[#f0ebe4]">
                        <img
                          src={image}
                          alt={line.product.name}
                          className="h-full w-full object-cover object-center"
                        />
                      </div>

                      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
                        <div>
                          <h2 className="text-lg font-bold sm:text-xl">{line.product.name}</h2>
                          <p className="mt-2 line-clamp-1 max-w-sm text-sm text-[#5f5a54]">
                            {line.product.description}
                          </p>

                          {variantSummary.length ? (
                            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#766f68]">
                              {variantSummary.map((variant) => (
                                <span key={variant.name}>
                                  {variant.name}{" "}
                                  <strong className="text-[#242424]">
                                    {variant.options[0] ?? "Default"}
                                  </strong>
                                </span>
                              ))}
                            </div>
                          ) : null}

                          <div className="mt-5 flex items-baseline gap-2">
                            <span className="text-xl font-bold">
                              {formatMoney(line.product.price, line.product.currency)}
                            </span>
                            <span className="text-sm text-[#8f8780]">
                              {formatMoney(line.product.price * line.quantity, line.product.currency)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-end justify-between gap-4 md:flex-col md:items-end">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              className="grid h-8 w-8 place-items-center rounded-md border border-[#e7ddd4] bg-white text-[#242424] disabled:opacity-50"
                              onClick={() => setQuantity(line.product.id, line.quantity - 1)}
                              disabled={mode === "edit"}
                              aria-label={`Decrease ${line.product.name} quantity`}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-5 text-center text-sm font-semibold">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              className="grid h-8 w-8 place-items-center rounded-md border border-[#e7ddd4] bg-white text-[#242424] disabled:opacity-50"
                              onClick={() => setQuantity(line.product.id, line.quantity + 1)}
                              disabled={mode === "edit"}
                              aria-label={`Increase ${line.product.name} quantity`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              className="grid h-8 w-8 place-items-center rounded-md border border-[#e7ddd4] bg-white text-[#242424] transition hover:text-destructive disabled:opacity-50"
                              onClick={() => removeItem(line.product.id)}
                              disabled={mode === "edit"}
                              aria-label={`Remove ${line.product.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            {mode === "edit" ? (
                              <span className="grid h-8 w-8 place-items-center rounded-md border border-[#e7ddd4] bg-white text-[#242424] opacity-50">
                                <Pencil className="h-4 w-4" />
                              </span>
                            ) : (
                              <Link
                                href={`/products/${line.product.slug}`}
                                className="grid h-8 w-8 place-items-center rounded-md border border-[#e7ddd4] bg-white text-[#242424] transition hover:bg-[#fff6ef]"
                                aria-label={`Edit ${line.product.name}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-[1.75rem] bg-[#fff6ef] p-5 shadow-[0_20px_60px_rgba(118,57,31,0.08)] sm:p-6">
              <h2 className="text-xl font-bold">Order Summary</h2>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span>Sub Total</span>
                  <strong>{formatMoney(subtotal, currency)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Discount</span>
                  <strong>{formatMoney(0, currency)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tax</span>
                  <strong>{formatMoney(tax, currency)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Shipping</span>
                  <strong className="text-[#c7775d]">Free</strong>
                </div>
                <div className="flex items-center justify-between pt-1 text-base">
                  <span>Total</span>
                  <strong>{formatMoney(total, currency)}</strong>
                </div>
              </div>

              {mode === "edit" ? (
                <span className="mt-6 flex w-full justify-center rounded-full bg-[#242424] px-6 py-3 text-sm font-semibold text-white">
                  Proceed to Checkout
                </span>
              ) : (
                <Link
                  href="/checkout"
                  className="mt-6 flex w-full justify-center rounded-full bg-[#242424] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#3a3a3a]"
                >
                  Proceed to Checkout
                </Link>
              )}

              <div className="mt-6 border-t border-[#eadfd5] pt-5 text-sm text-[#6b625a]">
                Estimated delivery in <strong className="text-[#242424]">3-5 business days</strong>
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-[#fff6ef] p-5 shadow-[0_20px_60px_rgba(118,57,31,0.08)] sm:p-6">
              <h2 className="text-lg font-bold">Have a Coupon?</h2>
              <div className="mt-4 flex overflow-hidden rounded-md border border-[#e9dcd0] bg-white">
                <input
                  type="text"
                  placeholder="Coupon Code"
                  disabled={mode === "edit"}
                  className="min-w-0 flex-1 px-4 py-3 text-sm outline-none placeholder:text-[#b7aaa0] disabled:bg-white"
                />
                <button
                  type="button"
                  disabled={mode === "edit"}
                  className="px-4 text-sm font-bold text-[#c7775d] disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function MinimalisticCartPageView() {
  const { lines, subtotal, setQuantity, removeItem } = useCart();
  const { mode } = useStorefrontTheme();

  if (lines.length === 0) {
    return (
      <div className="bg-[#fbfbdc] px-4 py-16 text-[#073e3f] sm:px-6">
        <div className="mx-auto max-w-4xl rounded-[2rem] bg-white/80 px-6 py-14 text-center shadow-[0_24px_80px_rgba(7,62,63,0.08)]">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-[#fbfbdc] px-3 py-1.5 text-[11px] font-semibold">
            <span className="h-2 w-5 rounded-full bg-[#073e3f]" />
            Shopping bag
            <span className="h-2 w-5 rounded-full bg-[#073e3f]" />
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Your cart is empty
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-[#073e3f]/65">
            Add daily essentials to your cart before moving into checkout.
          </p>
          {mode === "edit" ? (
            <span className="mt-8 inline-flex rounded-full bg-[#073e3f] px-8 py-3 text-sm font-semibold text-[#fbfbdc]">
              Browse products
            </span>
          ) : (
            <Link
              href="/products"
              className="mt-8 inline-flex rounded-full bg-[#073e3f] px-8 py-3 text-sm font-semibold text-[#fbfbdc] transition hover:bg-[#0a5253]"
            >
              Browse products
            </Link>
          )}
        </div>
      </div>
    );
  }

  const currency = lines[0]?.product.currency;
  const shipping = 0;
  const tax = 0;
  const total = subtotal + shipping + tax;

  return (
    <div className="overflow-hidden bg-[#fbfbdc] px-4 py-10 text-[#073e3f] sm:px-6 lg:py-14">
      <div className="relative mx-auto max-w-7xl rounded-[2rem] bg-white/80 px-5 py-8 shadow-[0_24px_90px_rgba(7,62,63,0.1)] ring-1 ring-[#073e3f]/5 sm:px-8 lg:px-14">
        <span className="pointer-events-none absolute -right-12 top-10 hidden h-32 w-32 rounded-full bg-[#eff5c4] opacity-70 lg:block" />
        <span className="pointer-events-none absolute -bottom-16 left-8 hidden h-44 w-44 rounded-full border border-[#073e3f]/10 lg:block" />

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_350px] xl:grid-cols-[minmax(0,1fr)_390px]">
          <section>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#fbfbdc] px-3 py-1.5 text-[11px] font-semibold">
              <span className="h-2 w-5 rounded-full bg-[#073e3f]" />
              Cart
              <span className="h-2 w-5 rounded-full bg-[#073e3f]" />
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Wellness bag
            </h1>

            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm text-[#073e3f]/60">
              {["Cart", "Checkout", "Payment"].map((step, index) => (
                <div key={step} className="flex items-center gap-3">
                  <span className={index === 0 ? "font-bold text-[#073e3f]" : ""}>
                    {index + 1}. {step}
                  </span>
                  {index < 2 ? <span className="h-px w-12 bg-[#073e3f]/15 sm:w-16" /> : null}
                </div>
              ))}
            </div>

            <div className="mt-8 divide-y divide-[#073e3f]/10">
              {lines.map((line, index) => {
                const image =
                  line.product.image_url ??
                  minimalisticTemplateImages.products[
                    index % minimalisticTemplateImages.products.length
                  ];
                const variantSummary = line.product.variants?.slice(0, 2) ?? [];

                return (
                  <article key={line.product.id} className="py-6 first:pt-0">
                    <div className="grid gap-5 sm:grid-cols-[132px_minmax(0,1fr)]">
                      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-[#f0f0f0] p-5">
                        <img
                          src={image}
                          alt={line.product.name}
                          className="h-full w-full object-contain object-center"
                        />
                      </div>

                      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto]">
                        <div>
                          <h2 className="text-lg font-bold sm:text-xl">{line.product.name}</h2>
                          <p className="mt-2 line-clamp-1 max-w-sm text-sm text-[#073e3f]/60">
                            {line.product.description}
                          </p>

                          {variantSummary.length ? (
                            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-[#073e3f]/60">
                              {variantSummary.map((variant) => (
                                <span key={variant.name}>
                                  {variant.name}{" "}
                                  <strong className="text-[#073e3f]">
                                    {variant.options[0] ?? "Default"}
                                  </strong>
                                </span>
                              ))}
                            </div>
                          ) : null}

                          <div className="mt-5 flex items-baseline gap-2">
                            <span className="text-xl font-bold">
                              {formatMoney(line.product.price, line.product.currency)}
                            </span>
                            <span className="text-sm text-[#073e3f]/45">
                              {formatMoney(line.product.price * line.quantity, line.product.currency)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-end justify-between gap-4 md:flex-col md:items-end">
                          <div className="flex items-center gap-3 rounded-full bg-[#fbfbdc] p-1">
                            <button
                              type="button"
                              className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#073e3f] disabled:opacity-50"
                              onClick={() => setQuantity(line.product.id, line.quantity - 1)}
                              disabled={mode === "edit"}
                              aria-label={`Decrease ${line.product.name} quantity`}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-5 text-center text-sm font-semibold">
                              {line.quantity}
                            </span>
                            <button
                              type="button"
                              className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#073e3f] disabled:opacity-50"
                              onClick={() => setQuantity(line.product.id, line.quantity + 1)}
                              disabled={mode === "edit"}
                              aria-label={`Increase ${line.product.name} quantity`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              className="grid h-9 w-9 place-items-center rounded-full bg-[#fbfbdc] text-[#073e3f] transition hover:text-destructive disabled:opacity-50"
                              onClick={() => removeItem(line.product.id)}
                              disabled={mode === "edit"}
                              aria-label={`Remove ${line.product.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            {mode === "edit" ? (
                              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#fbfbdc] text-[#073e3f] opacity-50">
                                <Pencil className="h-4 w-4" />
                              </span>
                            ) : (
                              <Link
                                href={`/products/${line.product.slug}`}
                                className="grid h-9 w-9 place-items-center rounded-full bg-[#fbfbdc] text-[#073e3f] transition hover:bg-[#eff5c4]"
                                aria-label={`Edit ${line.product.name}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="space-y-5">
            <div className="rounded-[1.75rem] bg-[#fbfbdc] p-5 shadow-[0_20px_60px_rgba(7,62,63,0.08)] sm:p-6">
              <h2 className="text-xl font-bold">Order Summary</h2>
              <div className="mt-6 space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span>Sub Total</span>
                  <strong>{formatMoney(subtotal, currency)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Discount</span>
                  <strong>{formatMoney(0, currency)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Tax</span>
                  <strong>{formatMoney(tax, currency)}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Shipping</span>
                  <strong className="text-[#073e3f]">Free</strong>
                </div>
                <div className="flex items-center justify-between border-t border-[#073e3f]/10 pt-4 text-base">
                  <span>Total</span>
                  <strong>{formatMoney(total, currency)}</strong>
                </div>
              </div>

              {mode === "edit" ? (
                <span className="mt-6 flex w-full justify-center rounded-full bg-[#073e3f] px-6 py-3 text-sm font-semibold text-[#fbfbdc]">
                  Proceed to Checkout
                </span>
              ) : (
                <Link
                  href="/checkout"
                  className="mt-6 flex w-full justify-center rounded-full bg-[#073e3f] px-6 py-3 text-sm font-semibold text-[#fbfbdc] transition hover:bg-[#0a5253]"
                >
                  Proceed to Checkout
                </Link>
              )}

              <div className="mt-6 border-t border-[#073e3f]/10 pt-5 text-sm text-[#073e3f]/65">
                Daily wellness ships in <strong className="text-[#073e3f]">2-4 business days</strong>
              </div>
            </div>

            <div className="rounded-[1.5rem] bg-white p-5 shadow-[0_20px_60px_rgba(7,62,63,0.06)] ring-1 ring-[#073e3f]/5 sm:p-6">
              <h2 className="text-lg font-bold">Have a Coupon?</h2>
              <div className="mt-4 flex overflow-hidden rounded-full border border-[#073e3f]/10 bg-[#fbfbdc]">
                <input
                  type="text"
                  placeholder="Coupon Code"
                  disabled={mode === "edit"}
                  className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-[#073e3f]/40 disabled:bg-transparent"
                />
                <button
                  type="button"
                  disabled={mode === "edit"}
                  className="px-4 text-sm font-bold text-[#073e3f] disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export function CartPageView() {
  const { lines, subtotal, setQuantity, removeItem } = useCart();
  const { theme, mode } = useStorefrontTheme();

  if (theme.id === "fashion_lookbook") {
    return <FashionCartPageView />;
  }

  if (theme.id === "minimalistic") {
    return <MinimalisticCartPageView />;
  }

  if (lines.length === 0) {
    return (
      <PageContainer className="text-center">
        <h1 className="text-4xl font-bold" style={{ fontFamily: theme.displayFont }}>
          Your cart is empty
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">Add products before checking out.</p>
        <PrimaryButton href="/products" className="mt-6">
          Browse products
        </PrimaryButton>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: theme.displayFont }}>
        Cart
      </h1>
      <div className="mt-8 space-y-4">
        {lines.map((line) => (
          <div
            key={line.product.id}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <div className="font-semibold">{line.product.name}</div>
              <div className="text-sm text-muted-foreground">
                {formatMoney(line.product.price, line.product.currency)} each
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-md border border-border"
                onClick={() => setQuantity(line.product.id, line.quantity - 1)}
                disabled={mode === "edit"}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-8 text-center text-sm font-medium">{line.quantity}</span>
              <button
                type="button"
                className="grid h-8 w-8 place-items-center rounded-md border border-border"
                onClick={() => setQuantity(line.product.id, line.quantity + 1)}
                disabled={mode === "edit"}
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="ml-2 text-muted-foreground hover:text-destructive"
                onClick={() => removeItem(line.product.id)}
                disabled={mode === "edit"}
                aria-label="Remove item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm text-muted-foreground">Subtotal</div>
          <div className="text-2xl font-semibold">{formatMoney(subtotal)}</div>
        </div>
        {mode === "edit" ? (
          <span
            className="inline-flex justify-center rounded-md px-6 py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: theme.brandColor }}
          >
            Proceed to checkout
          </span>
        ) : (
          <Link
            href="/checkout"
            className="inline-flex justify-center rounded-md px-6 py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: theme.brandColor }}
          >
            Proceed to checkout
          </Link>
        )}
      </div>
    </PageContainer>
  );
}
