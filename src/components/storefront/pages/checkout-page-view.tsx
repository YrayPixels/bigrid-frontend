"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/storefront/cart-context";
import { storefrontApi } from "@/lib/api/storefront";
import { formatMoney } from "@/lib/storefront/format";
import { useStorefront } from "@/lib/storefront/store-context";
import { PageContainer } from "@/components/storefront/theme/page-container";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { minimalisticTemplateImages } from "@/lib/storefront/minimalistic-defaults";

export function CheckoutPageView() {
  const router = useRouter();
  const { store } = useStorefront();
  const { lines, subtotal, clear } = useCart();
  const { theme, mode } = useStorefrontTheme();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMinimalistic = theme.id === "minimalistic";

  if (lines.length === 0) {
    if (isMinimalistic) {
      return (
        <div className="bg-[#fbfbdc] px-4 py-16 text-center text-[#073e3f] sm:px-6">
          <div className="mx-auto max-w-4xl rounded-[2rem] bg-white/80 px-6 py-14 shadow-[0_24px_80px_rgba(7,62,63,0.08)]">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-[#fbfbdc] px-3 py-1.5 text-[11px] font-semibold">
              <span className="h-2 w-5 rounded-full bg-[#073e3f]" />
              Checkout
              <span className="h-2 w-5 rounded-full bg-[#073e3f]" />
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.04em]">Nothing to checkout</h1>
            {mode !== "edit" ? (
              <Link
                href="/products"
                className="mt-8 inline-flex rounded-full bg-[#073e3f] px-8 py-3 text-sm font-semibold text-[#fbfbdc] transition hover:bg-[#0a5253]"
              >
                Browse products
              </Link>
            ) : null}
          </div>
        </div>
      );
    }

    return (
      <PageContainer className="text-center">
        <h1 className="text-4xl font-bold" style={{ fontFamily: theme.displayFont }}>
          Nothing to checkout
        </h1>
        {mode !== "edit" ? (
          <Link
            href="/products"
            className="mt-4 inline-block text-sm font-semibold"
            style={{ color: theme.brandColor }}
          >
            Browse products
          </Link>
        ) : null}
      </PageContainer>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "edit") return;
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);

    try {
      const order = await storefrontApi.placeOrder(store.slug, {
        customer: {
          first_name: String(form.get("first_name") ?? ""),
          last_name: String(form.get("last_name") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""),
        },
        delivery_address: String(form.get("delivery_address") ?? ""),
        notes: String(form.get("notes") ?? ""),
        items: lines.map((line) => ({
          product_id: line.product.id,
          quantity: line.quantity,
        })),
      });
      window.sessionStorage.setItem("storehaus_last_order", order.order_number);
      clear();
      router.push(`/checkout/success?order=${encodeURIComponent(order.order_number)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order. Please try again.");
      setSubmitting(false);
    }
  }

  if (isMinimalistic) {
    const inputClass =
      "w-full rounded-2xl border border-[#073e3f]/10 bg-white/80 px-4 py-3 text-sm text-[#073e3f] outline-none transition placeholder:text-[#073e3f]/35 focus:border-[#073e3f]/35 focus:ring-4 focus:ring-[#073e3f]/10 disabled:opacity-60";
    const currency = lines[0]?.product.currency;

    return (
      <div className="bg-[#fbfbdc] px-4 py-10 text-[#073e3f] sm:px-6 lg:py-14">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_390px]">
          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] bg-white/80 p-5 shadow-[0_24px_90px_rgba(7,62,63,0.08)] ring-1 ring-[#073e3f]/5 sm:p-8 lg:p-10"
          >
            <div className="inline-flex items-center gap-2 rounded-full bg-[#fbfbdc] px-3 py-1.5 text-[11px] font-semibold">
              <span className="h-2 w-5 rounded-full bg-[#073e3f]" />
              Checkout
              <span className="h-2 w-5 rounded-full bg-[#073e3f]" />
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              Complete your wellness order
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#073e3f]/65">
              Add your delivery details and we will prepare your daily essentials for dispatch.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-semibold">First name</span>
                <input name="first_name" required disabled={mode === "edit"} className={inputClass} />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-semibold">Last name</span>
                <input name="last_name" required disabled={mode === "edit"} className={inputClass} />
              </label>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-semibold">Email</span>
                <input
                  name="email"
                  type="email"
                  required
                  disabled={mode === "edit"}
                  className={inputClass}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-semibold">Phone</span>
                <input name="phone" required disabled={mode === "edit"} className={inputClass} />
              </label>
            </div>

            <label className="mt-4 block space-y-2 text-sm">
              <span className="font-semibold">Delivery address</span>
              <textarea
                name="delivery_address"
                required
                rows={4}
                disabled={mode === "edit"}
                className={inputClass}
              />
            </label>
            <label className="mt-4 block space-y-2 text-sm">
              <span className="font-semibold">Order notes</span>
              <textarea
                name="notes"
                rows={3}
                disabled={mode === "edit"}
                placeholder="Optional delivery instructions"
                className={inputClass}
              />
            </label>

            {error ? (
              <div className="mt-5 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting || mode === "edit"}
              className="mt-6 rounded-full bg-[#073e3f] px-8 py-3 text-sm font-semibold text-[#fbfbdc] transition hover:bg-[#0a5253] disabled:opacity-60"
            >
              {submitting ? "Placing order..." : "Place order"}
            </button>
          </form>

          <aside className="h-fit rounded-[2rem] bg-white/80 p-5 shadow-[0_24px_90px_rgba(7,62,63,0.08)] ring-1 ring-[#073e3f]/5 sm:p-6">
            <div className="rounded-[1.5rem] bg-[#fbfbdc] p-5">
              <h2 className="text-xl font-bold">Order summary</h2>
              <p className="mt-1 text-sm text-[#073e3f]/60">Your wellness essentials</p>
            </div>

            <div className="mt-5 space-y-4">
              {lines.map((line, index) => {
                const image =
                  line.product.image_url ??
                  minimalisticTemplateImages.products[
                    index % minimalisticTemplateImages.products.length
                  ];

                return (
                  <div
                    key={line.product.id}
                    className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-[#f7f7f3] p-3 text-sm"
                  >
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white p-2">
                      <img
                        src={image}
                        alt={line.product.name}
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="line-clamp-1 font-bold">{line.product.name}</div>
                      <div className="mt-1 text-xs text-[#073e3f]/55">Qty {line.quantity}</div>
                    </div>
                    <span className="font-semibold">
                      {formatMoney(line.product.price * line.quantity, line.product.currency)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 space-y-3 border-t border-[#073e3f]/10 pt-5 text-sm">
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <strong>{formatMoney(subtotal, currency)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Shipping</span>
                <strong>Free</strong>
              </div>
              <div className="flex items-center justify-between text-base">
                <span>Total</span>
                <strong>{formatMoney(subtotal, currency)}</strong>
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <PageContainer>
      <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={handleSubmit} className="space-y-5">
          <h1
            className="text-4xl font-bold tracking-tight"
            style={{ fontFamily: theme.displayFont }}
          >
            Checkout
          </h1>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium">First name</span>
              <input
                name="first_name"
                required
                disabled={mode === "edit"}
                className="w-full rounded-md border border-border bg-background px-3 py-2"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Last name</span>
              <input
                name="last_name"
                required
                disabled={mode === "edit"}
                className="w-full rounded-md border border-border bg-background px-3 py-2"
              />
            </label>
          </div>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Email</span>
            <input
              name="email"
              type="email"
              required
              disabled={mode === "edit"}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Phone</span>
            <input
              name="phone"
              required
              disabled={mode === "edit"}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Delivery address</span>
            <textarea
              name="delivery_address"
              required
              rows={4}
              disabled={mode === "edit"}
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Order notes</span>
            <textarea
              name="notes"
              rows={3}
              disabled={mode === "edit"}
              placeholder="Optional delivery instructions"
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
          </label>
          {error ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={submitting || mode === "edit"}
            className="rounded-md px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: theme.brandColor }}
          >
            {submitting ? "Placing order..." : "Place order"}
          </button>
        </form>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-semibold" style={{ fontFamily: theme.displayFont }}>
            Order summary
          </h2>
          <div className="mt-4 space-y-3">
            {lines.map((line) => (
              <div key={line.product.id} className="flex items-start justify-between gap-4 text-sm">
                <span>
                  {line.product.name} x {line.quantity}
                </span>
                <span>
                  {formatMoney(line.product.price * line.quantity, line.product.currency)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-border pt-4 font-semibold">
            <span>Total</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}
