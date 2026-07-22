"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { storefrontApi } from "@/lib/api/storefront";
import type { StoreOrder } from "@/lib/api/types";
import { formatMoney } from "@/lib/storefront/format";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

function CheckoutSuccessContent() {
  const { store } = useStorefront();
  const { theme } = useStorefrontTheme();
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") ?? "your order";
  const paid = searchParams.get("paid") === "1";
  const [order, setOrder] = useState<StoreOrder | null>(null);

  useEffect(() => {
    if (!orderNumber || orderNumber === "your order") return;
    let cancelled = false;
    void storefrontApi
      .lookupOrder(store.slug, { order: orderNumber })
      .then((result) => {
        if (!cancelled) setOrder(result);
      })
      .catch(() => {
        if (!cancelled) setOrder(null);
      });
    return () => {
      cancelled = true;
    };
  }, [orderNumber, store.slug]);

  const paymentLabel = order?.payment_status
    ? order.payment_status.replaceAll("_", " ")
    : paid
      ? "paid"
      : "pending";
  const statusLabel = order?.status ?? (paid ? "processing" : "pending");

  if (theme.id === "minimalistic" || theme.id === "beauty" || theme.id === "cosmetics") {
    const isBeauty = theme.id === "beauty";
    const isCosmetics = theme.id === "cosmetics";
    return (
      <div
        className="px-4 py-16 text-center sm:px-6"
        style={{ backgroundColor: theme.palette.background, color: theme.palette.text }}
      >
        <div
          className="mx-auto max-w-4xl rounded-[2rem] px-6 py-14 shadow-[0_24px_80px_rgba(7,62,63,0.08)]"
          style={{ backgroundColor: `${theme.palette.surface}cc` }}
        >
          <div
            className="mx-auto grid h-16 w-16 place-items-center rounded-full text-sm font-bold"
            style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
          >
            OK
          </div>
          <div
            className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold"
            style={{ backgroundColor: theme.palette.background }}
          >
            <span className="h-2 w-5 rounded-full" style={{ backgroundColor: theme.palette.primary }} />
            {isCosmetics ? "Skincare order placed" : isBeauty ? "Beauty order placed" : "Order placed"}
            <span className="h-2 w-5 rounded-full" style={{ backgroundColor: theme.palette.primary }} />
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-0.04em]">
            {paid || order?.payment_status === "paid" ? "Payment confirmed" : "Your order is confirmed"}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6" style={{ color: theme.palette.muted }}>
            Thank you for shopping with {store.business_name}. Your order reference is{" "}
            <span className="font-bold" style={{ color: theme.palette.text }}>{orderNumber}</span>.
            {" "}Status: <span className="capitalize">{statusLabel}</span>
            {" · "}Payment: <span className="capitalize">{paymentLabel}</span>
            {order ? ` · ${formatMoney(order.total_amount, order.currency)}` : ""}.
          </p>
          <Link
            href="/products"
            className="mt-8 inline-flex rounded-full px-8 py-3 text-sm font-semibold transition"
            style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
          >
            Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-16 text-center sm:px-6">
      <div
        className="mx-auto grid h-16 w-16 place-items-center rounded-full text-2xl font-bold text-white"
        style={{ backgroundColor: store.brand_color }}
      >
        OK
      </div>
      <h1 className="mt-6 font-display text-4xl font-bold tracking-tight">
        {paid || order?.payment_status === "paid" ? "Payment confirmed" : "Order placed"}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Thank you for shopping with {store.business_name}. Your order reference is{" "}
        <span className="font-semibold text-foreground">{orderNumber}</span>.
        {" "}Status: <span className="capitalize">{statusLabel}</span>
        {" · "}Payment: <span className="capitalize">{paymentLabel}</span>
        {order ? ` · ${formatMoney(order.total_amount, order.currency)}` : ""}.
      </p>
      <Link
        href="/products"
        className="mt-8 inline-flex rounded-md px-6 py-3 text-sm font-semibold text-white"
        style={{ backgroundColor: store.brand_color }}
      >
        Continue shopping
      </Link>
    </div>
  );
}

export default function CheckoutSuccessPageClient() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-16 text-center text-sm text-muted-foreground">Loading...</div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
