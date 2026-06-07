"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useCart } from "@/lib/storefront/cart-context";
import { formatMoney } from "@/lib/storefront/format";
import { useStorefront } from "@/lib/storefront/store-context";

export default function CheckoutPage() {
  const router = useRouter();
  const { store } = useStorefront();
  const { lines, subtotal, clear } = useCart();
  const [submitting, setSubmitting] = useState(false);

  if (lines.length === 0) {
    return (
      <div className="w-full px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-4xl font-bold">Nothing to checkout</h1>
        <Link
          href="/products"
          className="mt-4 inline-block text-sm font-semibold"
          style={{ color: store.brand_color }}
        >
          Browse products
        </Link>
      </div>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    const orderNumber = `SH-${Date.now().toString().slice(-8)}`;
    window.sessionStorage.setItem("storehaus_last_order", orderNumber);
    clear();
    router.push(`/checkout/success?order=${orderNumber}`);
  }

  return (
    <div className="grid w-full gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_0.8fr]">
      <form onSubmit={handleSubmit} className="space-y-5">
        <h1 className="font-display text-4xl font-bold tracking-tight">Checkout</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium">First name</span>
            <input
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Last name</span>
            <input
              required
              className="w-full rounded-md border border-border bg-background px-3 py-2"
            />
          </label>
        </div>
        <label className="block space-y-2 text-sm">
          <span className="font-medium">Email</span>
          <input
            type="email"
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2"
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="font-medium">Phone</span>
          <input
            required
            className="w-full rounded-md border border-border bg-background px-3 py-2"
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="font-medium">Delivery address</span>
          <textarea
            required
            rows={4}
            className="w-full rounded-md border border-border bg-background px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
          style={{ backgroundColor: store.brand_color }}
        >
          {submitting ? "Placing order..." : "Place order"}
        </button>
      </form>

      <aside className="h-fit rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl font-semibold">Order summary</h2>
        <div className="mt-4 space-y-3">
          {lines.map((line) => (
            <div key={line.product.id} className="flex items-start justify-between gap-4 text-sm">
              <span>
                {line.product.name} x {line.quantity}
              </span>
              <span>{formatMoney(line.product.price * line.quantity, line.product.currency)}</span>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4 font-semibold">
          <span>Total</span>
          <span>{formatMoney(subtotal)}</span>
        </div>
      </aside>
    </div>
  );
}
