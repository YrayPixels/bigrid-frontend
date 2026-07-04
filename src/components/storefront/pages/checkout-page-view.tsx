"use client";

import Link from "next/link";
import { FormEvent, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/storefront/cart-context";
import { storefrontApi } from "@/lib/api/storefront";
import { openPaystackCheckout } from "@/lib/paystack";
import { formatMoney } from "@/lib/storefront/format";
import { useStorefront } from "@/lib/storefront/store-context";
import { useAbandonedCartTracking } from "@/lib/storefront/use-abandoned-cart-tracking";
import { PageContainer } from "@/components/storefront/theme/page-container";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { beautyTemplateImages } from "@/lib/storefront/beauty-defaults";
import { cosmeticsTemplateImages } from "@/lib/storefront/cosmetics-defaults";
import { minimalisticTemplateImages } from "@/lib/storefront/minimalistic-defaults";

export function CheckoutPageView() {
  const router = useRouter();
  const { store, checkout } = useStorefront();
  const paymentsEnabled = checkout?.payments_enabled ?? false;
  const paymentHint = paymentsEnabled
    ? "Pay securely by card or bank transfer via Paystack after you submit."
    : "Online payment is not active yet. The store will contact you to arrange payment.";
  const { lines, subtotal, clear } = useCart();
  const { theme, mode } = useStorefrontTheme();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitLabel = paymentsEnabled
    ? submitting
      ? "Opening payment..."
      : "Continue to payment"
    : submitting
      ? "Placing order..."
      : "Place order";
  const formRef = useRef<HTMLFormElement>(null);
  const sessionToken = useAbandonedCartTracking({
    formRef,
    storeId: store.id,
    storeSlug: store.slug,
    lines,
    subtotal,
    enabled: mode !== "edit",
  });
  const isMinimalistic = theme.id === "minimalistic";
  const isBeauty = theme.id === "beauty";
  const isCosmetics = theme.id === "cosmetics";

  if (lines.length === 0) {
    if (isMinimalistic || isBeauty || isCosmetics) {
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
              className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold"
              style={{ backgroundColor: theme.palette.background }}
            >
              <span
                className="h-2 w-5 rounded-full"
                style={{ backgroundColor: theme.palette.primary }}
              />
              {isCosmetics ? "Skincare checkout" : isBeauty ? "Beauty checkout" : "Checkout"}
              <span
                className="h-2 w-5 rounded-full"
                style={{ backgroundColor: theme.palette.primary }}
              />
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.04em]">Nothing to checkout</h1>
            {mode !== "edit" ? (
              <Link
                href="/products"
                className="mt-8 inline-flex rounded-full px-8 py-3 text-sm font-semibold transition"
                style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
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
            style={{ color: theme.palette.primary }}
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
      const result = await storefrontApi.placeOrder(store.slug, {
        customer: {
          first_name: String(form.get("first_name") ?? ""),
          last_name: String(form.get("last_name") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""),
        },
        delivery_address: String(form.get("delivery_address") ?? ""),
        notes: String(form.get("notes") ?? ""),
        session_token: sessionToken || undefined,
        items: lines.map((line) => ({
          product_id: line.product.id,
          quantity: line.quantity,
        })),
      });

      if (result.payment?.provider === "paystack") {
        await openPaystackCheckout({
          publicKey: result.payment.public_key,
          email: result.order.customer_email,
          amount: result.payment.amount,
          reference: result.payment.reference,
          currency: result.payment.currency,
          onSuccess: async (reference) => {
            await storefrontApi.verifyPayment(store.slug, reference);
            window.sessionStorage.setItem("storehaus_last_order", result.order.order_number);
            clear();
            router.push(
              `/checkout/success?order=${encodeURIComponent(result.order.order_number)}&paid=1`,
            );
          },
          onClose: () => setSubmitting(false),
        });
        return;
      }

      window.sessionStorage.setItem("storehaus_last_order", result.order.order_number);
      clear();
      router.push(`/checkout/success?order=${encodeURIComponent(result.order.order_number)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order. Please try again.");
      setSubmitting(false);
    }
  }

  if (isMinimalistic || isBeauty || isCosmetics) {
    const inputClass =
      "w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-4 disabled:opacity-60";
    const currency = lines[0]?.product.currency;

    return (
      <div
        className="px-4 py-10 sm:px-6 lg:py-14"
        style={{ backgroundColor: theme.palette.background, color: theme.palette.text }}
      >
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_390px]">
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="rounded-[2rem] p-5 shadow-[0_24px_90px_rgba(7,62,63,0.08)] ring-1 sm:p-8 lg:p-10"
            style={
              {
                backgroundColor: `${theme.palette.surface}cc`,
                "--tw-ring-color": theme.palette.border,
              } as CSSProperties
            }
          >
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold"
              style={{ backgroundColor: theme.palette.background }}
            >
              <span
                className="h-2 w-5 rounded-full"
                style={{ backgroundColor: theme.palette.primary }}
              />
              {isCosmetics ? "Skincare checkout" : isBeauty ? "Beauty checkout" : "Checkout"}
              <span
                className="h-2 w-5 rounded-full"
                style={{ backgroundColor: theme.palette.primary }}
              />
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
              {isCosmetics
                ? "Complete your skincare order"
                : isBeauty
                  ? "Complete your beauty order"
                  : "Complete your wellness order"}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6" style={{ color: theme.palette.muted }}>
              {isCosmetics
                ? "Add your delivery details and we will prepare your skincare essentials for dispatch."
                : isBeauty
                ? "Add your delivery details and we will prepare your beauty essentials for dispatch."
                : "Add your delivery details and we will prepare your daily essentials for dispatch."}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-semibold">First name</span>
                <input
                  name="first_name"
                  required
                  disabled={mode === "edit"}
                  className={inputClass}
                  style={{
                    backgroundColor: `${theme.palette.surface}cc`,
                    borderColor: theme.palette.border,
                    color: theme.palette.text,
                  }}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-semibold">Last name</span>
                <input
                  name="last_name"
                  required
                  disabled={mode === "edit"}
                  className={inputClass}
                  style={{
                    backgroundColor: `${theme.palette.surface}cc`,
                    borderColor: theme.palette.border,
                    color: theme.palette.text,
                  }}
                />
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
                  style={{
                    backgroundColor: `${theme.palette.surface}cc`,
                    borderColor: theme.palette.border,
                    color: theme.palette.text,
                  }}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-semibold">Phone</span>
                <input
                  name="phone"
                  required
                  disabled={mode === "edit"}
                  className={inputClass}
                  style={{
                    backgroundColor: `${theme.palette.surface}cc`,
                    borderColor: theme.palette.border,
                    color: theme.palette.text,
                  }}
                />
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
                style={{
                  backgroundColor: `${theme.palette.surface}cc`,
                  borderColor: theme.palette.border,
                  color: theme.palette.text,
                }}
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
                style={{
                  backgroundColor: `${theme.palette.surface}cc`,
                  borderColor: theme.palette.border,
                  color: theme.palette.text,
                }}
              />
            </label>

            {error ? (
              <div className="mt-5 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <p className="mt-5 text-sm" style={{ color: theme.palette.muted }}>
              {paymentHint}
            </p>

            <button
              type="submit"
              disabled={submitting || mode === "edit"}
              className="mt-4 rounded-full px-8 py-3 text-sm font-semibold transition disabled:opacity-60"
              style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
            >
              {submitLabel}
            </button>
          </form>

          <aside
            className="h-fit rounded-[2rem] p-5 shadow-[0_24px_90px_rgba(7,62,63,0.08)] ring-1 sm:p-6"
            style={
              {
                backgroundColor: `${theme.palette.surface}cc`,
                "--tw-ring-color": theme.palette.border,
              } as CSSProperties
            }
          >
            <div
              className="rounded-[1.5rem] p-5"
              style={{ backgroundColor: theme.palette.background }}
            >
              <h2 className="text-xl font-bold">Order summary</h2>
              <p className="mt-1 text-sm" style={{ color: theme.palette.muted }}>
                {isCosmetics
                  ? "Your skincare essentials"
                  : isBeauty
                    ? "Your beauty essentials"
                    : "Your wellness essentials"}
              </p>
            </div>

            <div className="mt-5 space-y-4">
              {lines.map((line, index) => {
                const image =
                  line.product.image_url ??
                  (isCosmetics
                    ? cosmeticsTemplateImages.products[
                        index % cosmeticsTemplateImages.products.length
                      ]
                    : isBeauty
                    ? beautyTemplateImages.products[index % beautyTemplateImages.products.length]
                    : minimalisticTemplateImages.products[
                        index % minimalisticTemplateImages.products.length
                      ]);

                return (
                  <div
                    key={line.product.id}
                    className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl p-3 text-sm"
                    style={{ backgroundColor: theme.palette.background }}
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
                      <div className="mt-1 text-xs" style={{ color: theme.palette.muted }}>
                        Qty {line.quantity}
                      </div>
                    </div>
                    <span className="font-semibold">
                      {formatMoney(line.product.price * line.quantity, line.product.currency)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div
              className="mt-6 space-y-3 border-t pt-5 text-sm"
              style={{ borderColor: theme.palette.border }}
            >
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
        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
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
                className={`w-full rounded-md border ${theme.borderColor} ${theme.pageBg} px-3 py-2`}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Last name</span>
              <input
                name="last_name"
                required
                disabled={mode === "edit"}
                className={`w-full rounded-md border ${theme.borderColor} ${theme.pageBg} px-3 py-2`}
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
              className={`w-full rounded-md border ${theme.borderColor} ${theme.pageBg} px-3 py-2`}
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Phone</span>
            <input
              name="phone"
              required
              disabled={mode === "edit"}
              className={`w-full rounded-md border ${theme.borderColor} ${theme.pageBg} px-3 py-2`}
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Delivery address</span>
            <textarea
              name="delivery_address"
              required
              rows={4}
              disabled={mode === "edit"}
              className={`w-full rounded-md border ${theme.borderColor} ${theme.pageBg} px-3 py-2`}
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span className="font-medium">Order notes</span>
            <textarea
              name="notes"
              rows={3}
              disabled={mode === "edit"}
              placeholder="Optional delivery instructions"
              className={`w-full rounded-md border ${theme.borderColor} ${theme.pageBg} px-3 py-2`}
            />
          </label>
          {error ? (
            <div className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">{paymentHint}</p>
          <button
            type="submit"
            disabled={submitting || mode === "edit"}
            className="rounded-md px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
          >
            {submitLabel}
          </button>
        </form>

        <aside className={`h-fit rounded-2xl border ${theme.borderColor} ${theme.cardBg} p-6`}>
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
          <div
            className={`mt-6 flex items-center justify-between border-t ${theme.borderColor} pt-4 font-semibold`}
          >
            <span>Total</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}
