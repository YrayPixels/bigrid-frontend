"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useStorefront } from "@/lib/storefront/store-context";

function CheckoutSuccessContent() {
  const { store } = useStorefront();
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order") ?? "your order";

  return (
    <div className="w-full px-4 py-16 text-center sm:px-6">
      <div
        className="mx-auto grid h-16 w-16 place-items-center rounded-full text-2xl font-bold text-white"
        style={{ backgroundColor: store.brand_color }}
      >
        OK
      </div>
      <h1 className="mt-6 font-display text-4xl font-bold tracking-tight">Order placed</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Thank you for shopping with {store.business_name}. Your order reference is{" "}
        <span className="font-semibold text-foreground">{orderNumber}</span>.
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

export default function CheckoutSuccessPage() {
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
