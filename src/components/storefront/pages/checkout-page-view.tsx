"use client";

import Link from "next/link";
import { FormEvent, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { cartLineKey, useCart } from "@/lib/storefront/cart-context";
import { cartLineUnitPrice, formatSelectedOptions } from "@/lib/storefront/cart-line";
import { cartThresholdDiscount } from "@/lib/storefront/pricing";
import { quoteDeliveryFee } from "@/lib/storefront/shipping-quote";
import { storefrontApi } from "@/lib/api/storefront";
import { openPaystackCheckout } from "@/lib/paystack";
import { formatMoney } from "@/lib/storefront/format";
import { useStorefront } from "@/lib/storefront/store-context";
import { useAbandonedCartTracking } from "@/lib/storefront/use-abandoned-cart-tracking";
import { PlacesAutocompleteInput } from "@/components/places/places-autocomplete-input";
import { isGooglePlacesEnabled, type ParsedPlace } from "@/lib/places/parse-place";
import { PageContainer } from "@/components/storefront/theme/page-container";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import {
  getOrCreateVisitSessionId,
  readMarketingAttribution,
} from "@/lib/storefront/marketing-attribution";
import { beautyTemplateImages } from "@/lib/storefront/beauty-defaults";
import { cosmeticsTemplateImages } from "@/lib/storefront/cosmetics-defaults";
import { minimalisticTemplateImages } from "@/lib/storefront/minimalistic-defaults";
import { OutfitLookBanner } from "@/components/storefront/outfit-look-banner";
import { clearOutfitPreview } from "@/lib/storefront/outfit-look";

export function CheckoutPageView() {
  const router = useRouter();
  const { store, checkout, discounts } = useStorefront();
  const paymentsEnabled = checkout?.payments_enabled ?? false;
  const paymentHint = paymentsEnabled
    ? "Pay securely by card or bank transfer via Paystack after you submit."
    : "Online payment is not active yet. The store will contact you to arrange payment.";
  const { lines, subtotal, clear } = useCart();
  const { theme, mode } = useStorefrontTheme();
  const cartDiscount = cartThresholdDiscount(subtotal, discounts ?? []);
  const merchandiseSubtotal = Math.max(0, subtotal - cartDiscount.amount);
  const allowDelivery = checkout?.allow_local_delivery ?? true;
  const allowPickup = checkout?.allow_pickup ?? false;
  const placesEnabled = isGooglePlacesEnabled();
  const [deliveryMethod, setDeliveryMethod] = useState<"delivery" | "pickup">(
    allowDelivery ? "delivery" : "pickup",
  );
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryState, setDeliveryState] = useState("");

  function applyCheckoutPlace(place: ParsedPlace) {
    setDeliveryAddress(place.formattedAddress || place.streetAddress);
    setDeliveryCity(place.city);
    setDeliveryState(place.state);
  }
  const shippingQuote = useMemo(
    () =>
      quoteDeliveryFee({
        deliveryMethod,
        deliveryAddress,
        city: deliveryCity,
        state: deliveryState,
        subtotal: merchandiseSubtotal,
        defaultDeliveryFee: Number(checkout?.default_delivery_fee ?? 0),
        locations: checkout?.shipping_locations,
      }),
    [
      deliveryMethod,
      deliveryAddress,
      deliveryCity,
      deliveryState,
      merchandiseSubtotal,
      checkout?.default_delivery_fee,
      checkout?.shipping_locations,
    ],
  );
  const deliveryFee = shippingQuote.deliveryFee;
  // Platform service fee charged on online orders for every plan.
  // Mirrors the server calculation in PlatformFeeService; the server total wins.
  const serviceFeePercent = Number(checkout?.service_fee_percent ?? 0);
  const serviceFeeBase = merchandiseSubtotal + deliveryFee;
  const serviceFee =
    serviceFeePercent > 0 ? Math.round(serviceFeeBase * serviceFeePercent) / 100 : 0;
  const payableTotal = serviceFeeBase + serviceFee;
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
  const isStyledCheckout =
    isMinimalistic ||
    isBeauty ||
    isCosmetics ||
    theme.id === "furniture-hardware" ||
    theme.id === "hair-and-fashion";

  function shippingAmountLabel(currency?: string) {
    if (deliveryMethod === "pickup") return "Pickup";
    return deliveryFee > 0 ? formatMoney(deliveryFee, currency) : "Free";
  }

  const showShippingLocationNote =
    deliveryMethod === "delivery" &&
    shippingQuote.locationName &&
    (shippingQuote.freeShippingApplied || shippingQuote.locationId);

  if (lines.length === 0) {
    if (isStyledCheckout) {
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
      const attribution = readMarketingAttribution();
      const result = await storefrontApi.placeOrder(store.slug, {
        customer: {
          first_name: String(form.get("first_name") ?? ""),
          last_name: String(form.get("last_name") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""),
        },
        delivery_address: deliveryAddress,
        delivery_city: deliveryCity,
        delivery_state: deliveryState,
        delivery_method: deliveryMethod,
        notes: String(form.get("notes") ?? ""),
        session_token: sessionToken || undefined,
        visit_session_id: getOrCreateVisitSessionId() || undefined,
        ...attribution,
        items: lines.map((line) => ({
          product_id: line.product.id,
          quantity: line.quantity,
          selected_options: line.selectedOptions,
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
            try {
              await storefrontApi.verifyPayment(store.slug, reference);
              window.sessionStorage.setItem("storehaus_last_order", result.order.order_number);
              clear();
              clearOutfitPreview(store.id);
              router.push(
                `/checkout/success?order=${encodeURIComponent(result.order.order_number)}&email=${encodeURIComponent(result.order.customer_email)}&paid=1`,
              );
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Payment received but verification failed. Contact the store with your reference.",
              );
              setSubmitting(false);
            }
          },
          onClose: () => setSubmitting(false),
        });
        return;
      }

      window.sessionStorage.setItem("storehaus_last_order", result.order.order_number);
      clear();
      clearOutfitPreview(store.id);
      router.push(
        `/checkout/success?order=${encodeURIComponent(result.order.order_number)}&email=${encodeURIComponent(result.order.customer_email)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place order. Please try again.");
      setSubmitting(false);
    }
  }

  if (isStyledCheckout) {
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

            {(allowDelivery || allowPickup) && (allowDelivery && allowPickup) ? (
              <fieldset className="mt-4 space-y-2 text-sm">
                <legend className="font-semibold">Fulfilment</legend>
                <div className="flex flex-wrap gap-3">
                  {allowDelivery ? (
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="delivery_method_ui"
                        checked={deliveryMethod === "delivery"}
                        onChange={() => setDeliveryMethod("delivery")}
                        disabled={mode === "edit"}
                      />
                      Delivery
                      {deliveryFee > 0 ? ` (+${formatMoney(deliveryFee, currency)})` : ""}
                    </label>
                  ) : null}
                  {allowPickup ? (
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="delivery_method_ui"
                        checked={deliveryMethod === "pickup"}
                        onChange={() => setDeliveryMethod("pickup")}
                        disabled={mode === "edit"}
                      />
                      Pickup
                    </label>
                  ) : null}
                </div>
              </fieldset>
            ) : null}

            <div className="mt-4 space-y-4">
              <PlacesAutocompleteInput
                useUiInput={false}
                name="delivery_address"
                required
                disabled={mode === "edit"}
                label={deliveryMethod === "pickup" ? "Contact address" : "Delivery address"}
                placeholder={
                  placesEnabled
                    ? "Search your address…"
                    : "Street, area, landmark…"
                }
                hint={
                  placesEnabled
                    ? "Select a suggestion so we can match local delivery and free shipping."
                    : undefined
                }
                value={deliveryAddress}
                onChange={setDeliveryAddress}
                onPlaceSelect={applyCheckoutPlace}
                inputClassName={inputClass}
                style={{
                  backgroundColor: `${theme.palette.surface}cc`,
                  borderColor: theme.palette.border,
                  color: theme.palette.text,
                }}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm">
                  <span className="font-semibold">City</span>
                  <input
                    name="delivery_city"
                    value={deliveryCity}
                    onChange={(event) => setDeliveryCity(event.target.value)}
                    disabled={mode === "edit"}
                    readOnly={placesEnabled && Boolean(deliveryCity)}
                    className={inputClass}
                    style={{
                      backgroundColor: `${theme.palette.surface}cc`,
                      borderColor: theme.palette.border,
                      color: theme.palette.text,
                    }}
                  />
                </label>
                <label className="space-y-2 text-sm">
                  <span className="font-semibold">State</span>
                  <input
                    name="delivery_state"
                    value={deliveryState}
                    onChange={(event) => setDeliveryState(event.target.value)}
                    disabled={mode === "edit"}
                    readOnly={placesEnabled && Boolean(deliveryState)}
                    className={inputClass}
                    style={{
                      backgroundColor: `${theme.palette.surface}cc`,
                      borderColor: theme.palette.border,
                      color: theme.palette.text,
                    }}
                  />
                </label>
              </div>
            </div>
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
              <OutfitLookBanner lines={lines} compact />
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
                    key={cartLineKey(line.product.id, line.selectedOptions)}
                    className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl p-3 text-sm"
                    style={{ backgroundColor: theme.palette.background }}
                  >
                    <div className="h-16 w-16 overflow-hidden rounded-xl bg-white">
                      <img
                        src={image}
                        alt={line.product.name}
                        className="h-full w-full object-cover object-center"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="line-clamp-1 font-bold">{line.product.name}</div>
                      <div className="mt-1 text-xs" style={{ color: theme.palette.muted }}>
                        Qty {line.quantity}
                        {formatSelectedOptions(line.selectedOptions)
                          ? ` · ${formatSelectedOptions(line.selectedOptions)}`
                          : ""}
                      </div>
                    </div>
                    <span className="font-semibold">
                      {formatMoney(
                        cartLineUnitPrice(line.product, line.selectedOptions) * line.quantity,
                        line.product.currency,
                      )}
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
              {cartDiscount.amount > 0 ? (
                <div className="flex items-center justify-between">
                  <span>{cartDiscount.label ?? "Discount"}</span>
                  <strong>-{formatMoney(cartDiscount.amount, currency)}</strong>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span>Shipping</span>
                <div className="text-right">
                  <strong>{shippingAmountLabel(currency)}</strong>
                  {showShippingLocationNote ? (
                    <div className="mt-0.5 text-xs" style={{ color: theme.palette.muted }}>
                      {shippingQuote.freeShippingApplied ? "Free shipping" : "Shipping"} ·{" "}
                      {shippingQuote.locationName}
                    </div>
                  ) : null}
                </div>
              </div>
              {serviceFee > 0 ? (
                <div className="flex items-center justify-between">
                  <span>Service fee ({serviceFeePercent}%)</span>
                  <strong>{formatMoney(serviceFee, currency)}</strong>
                </div>
              ) : null}
              <div className="flex items-center justify-between text-base">
                <span>Total</span>
                <strong>{formatMoney(payableTotal, currency)}</strong>
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
          {(allowDelivery || allowPickup) && (allowDelivery && allowPickup) ? (
            <fieldset className="space-y-2 text-sm">
              <legend className="font-medium">Fulfilment</legend>
              <div className="flex flex-wrap gap-4">
                {allowDelivery ? (
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      checked={deliveryMethod === "delivery"}
                      onChange={() => setDeliveryMethod("delivery")}
                      disabled={mode === "edit"}
                    />
                    Delivery
                    {deliveryFee > 0 ? ` (+${formatMoney(deliveryFee)})` : ""}
                  </label>
                ) : null}
                {allowPickup ? (
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      checked={deliveryMethod === "pickup"}
                      onChange={() => setDeliveryMethod("pickup")}
                      disabled={mode === "edit"}
                    />
                    Pickup
                  </label>
                ) : null}
              </div>
            </fieldset>
          ) : null}
          <div className="space-y-4">
            <PlacesAutocompleteInput
              useUiInput={false}
              name="delivery_address"
              required
              disabled={mode === "edit"}
              label={deliveryMethod === "pickup" ? "Contact address" : "Delivery address"}
              placeholder={
                placesEnabled ? "Search your address…" : "Street, area, landmark…"
              }
              hint={
                placesEnabled
                  ? "Select a suggestion so we can match local delivery and free shipping."
                  : undefined
              }
              value={deliveryAddress}
              onChange={setDeliveryAddress}
              onPlaceSelect={applyCheckoutPlace}
              inputClassName={`w-full rounded-md border ${theme.borderColor} ${theme.pageBg} px-3 py-2`}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium">City</span>
                <input
                  name="delivery_city"
                  value={deliveryCity}
                  onChange={(event) => setDeliveryCity(event.target.value)}
                  disabled={mode === "edit"}
                  readOnly={placesEnabled && Boolean(deliveryCity)}
                  className={`w-full rounded-md border ${theme.borderColor} ${theme.pageBg} px-3 py-2`}
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">State</span>
                <input
                  name="delivery_state"
                  value={deliveryState}
                  onChange={(event) => setDeliveryState(event.target.value)}
                  disabled={mode === "edit"}
                  readOnly={placesEnabled && Boolean(deliveryState)}
                  className={`w-full rounded-md border ${theme.borderColor} ${theme.pageBg} px-3 py-2`}
                />
              </label>
            </div>
          </div>
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
            <OutfitLookBanner lines={lines} compact />
            {lines.map((line) => (
              <div key={cartLineKey(line.product.id, line.selectedOptions)} className="flex items-start justify-between gap-4 text-sm">
                <span>
                  {line.product.name} x {line.quantity}
                  {formatSelectedOptions(line.selectedOptions)
                    ? ` (${formatSelectedOptions(line.selectedOptions)})`
                    : ""}
                </span>
                <span>
                  {formatMoney(
                    cartLineUnitPrice(line.product, line.selectedOptions) * line.quantity,
                    line.product.currency,
                  )}
                </span>
              </div>
            ))}
          </div>
          {cartDiscount.amount > 0 ? (
            <div className="mt-4 flex items-center justify-between gap-4 text-sm">
              <span>{cartDiscount.label ?? "Discount"}</span>
              <span>-{formatMoney(cartDiscount.amount)}</span>
            </div>
          ) : null}
          <div className="mt-3 flex items-center justify-between gap-4 text-sm">
            <span>Shipping</span>
            <div className="text-right">
              <span>{shippingAmountLabel()}</span>
              {showShippingLocationNote ? (
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {shippingQuote.freeShippingApplied ? "Free shipping" : "Shipping"} ·{" "}
                  {shippingQuote.locationName}
                </div>
              ) : null}
            </div>
          </div>
          {serviceFee > 0 ? (
            <div className="mt-3 flex items-center justify-between gap-4 text-sm">
              <span>Service fee ({serviceFeePercent}%)</span>
              <span>{formatMoney(serviceFee)}</span>
            </div>
          ) : null}
          <div
            className={`mt-6 flex items-center justify-between border-t ${theme.borderColor} pt-4 font-semibold`}
          >
            <span>Total</span>
            <span>{formatMoney(payableTotal)}</span>
          </div>
        </aside>
      </div>
    </PageContainer>
  );
}
