"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { storefrontApi } from "@/lib/api/storefront";
import type { StoreOrder } from "@/lib/api/types";
import { formatMoney } from "@/lib/storefront/format";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

function TrackOrderContent() {
  const { store } = useStorefront();
  const { theme } = useStorefrontTheme();
  const searchParams = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get("order") ?? "");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    setOrder(null);
    try {
      const result = await storefrontApi.lookupOrder(store.slug, {
        order: orderNumber.trim(),
        email: email.trim(),
      });
      setOrder(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order not found.");
    } finally {
      setLoading(false);
    }
  }

  const invoiceHref =
    order && email
      ? `${(process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "")}/storehause/public/storefronts/${store.slug}/orders/invoice?order=${encodeURIComponent(order.order_number)}&email=${encodeURIComponent(email.trim())}`
      : null;

  return (
    <div
      className="mx-auto max-w-xl px-4 py-12 sm:px-6"
      style={{ backgroundColor: theme.palette.background, color: theme.palette.text }}
    >
      <h1 className="text-3xl font-semibold tracking-tight" style={{ fontFamily: theme.displayFont }}>
        Track your order
      </h1>
      <p className="mt-2 text-sm" style={{ color: theme.palette.muted }}>
        Enter your order number and the email used at checkout.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <label className="block space-y-2 text-sm">
          <span className="font-medium">Order number</span>
          <input
            value={orderNumber}
            onChange={(event) => setOrderNumber(event.target.value)}
            required
            className="w-full rounded-md border px-3 py-2"
            style={{ borderColor: theme.palette.border, backgroundColor: theme.palette.surface }}
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="font-medium">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full rounded-md border px-3 py-2"
            style={{ borderColor: theme.palette.border, backgroundColor: theme.palette.surface }}
          />
        </label>
        {error ? (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={loading}
          className="rounded-md px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
          style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
        >
          {loading ? "Looking up…" : "Track order"}
        </button>
      </form>

      {order ? (
        <div
          className="mt-8 rounded-2xl border p-5"
          style={{ borderColor: theme.palette.border, backgroundColor: theme.palette.surface }}
        >
          <div className="font-mono text-lg font-semibold">{order.order_number}</div>
          <div className="mt-2 text-sm capitalize" style={{ color: theme.palette.muted }}>
            Status: {order.status} · Payment: {order.payment_status.replaceAll("_", " ")}
          </div>
          {order.tracking_number ? (
            <div className="mt-2 text-sm">Tracking: {order.tracking_number}</div>
          ) : null}
          <div className="mt-4 text-sm font-semibold">
            {formatMoney(order.total_amount, order.currency)}
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            {(order.items ?? []).map((item) => (
              <li key={`${item.product_id}-${item.name}`}>
                {item.name} × {item.quantity}
              </li>
            ))}
          </ul>
          {invoiceHref ? (
            <a
              href={invoiceHref}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex text-sm font-semibold underline"
              style={{ color: theme.palette.primary }}
            >
              View invoice / receipt
            </a>
          ) : null}
        </div>
      ) : null}

      <Link href="/products" className="mt-8 inline-block text-sm font-semibold underline">
        Continue shopping
      </Link>
    </div>
  );
}

export default function TrackOrderPageClient() {
  return (
    <Suspense fallback={<div className="px-4 py-16 text-center text-sm">Loading…</div>}>
      <TrackOrderContent />
    </Suspense>
  );
}
