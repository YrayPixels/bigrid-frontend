"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/storefront/cart-context";
import { formatMoney } from "@/lib/storefront/format";
import { PageContainer } from "@/components/storefront/theme/page-container";
import { PrimaryButton } from "@/components/storefront/theme/primary-button";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

export function CartPageView() {
  const { lines, subtotal, setQuantity, removeItem } = useCart();
  const { theme, mode } = useStorefrontTheme();

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
