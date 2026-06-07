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

export function CheckoutPageView() {
  const router = useRouter();
  const { store } = useStorefront();
  const { lines, subtotal, clear } = useCart();
  const { theme, mode } = useStorefrontTheme();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (lines.length === 0) {
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
