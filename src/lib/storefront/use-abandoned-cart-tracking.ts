"use client";

import { useEffect, useMemo, useRef } from "react";
import { storefrontApi } from "@/lib/api/storefront";
import type { CartLine } from "@/lib/storefront/cart-context";
import { getCheckoutSessionToken } from "@/lib/storefront/checkout-session";

type UseAbandonedCartTrackingOptions = {
  formRef: React.RefObject<HTMLFormElement | null>;
  storeId: string;
  storeSlug: string;
  lines: CartLine[];
  subtotal: number;
  enabled: boolean;
};

export function useAbandonedCartTracking({
  formRef,
  storeId,
  storeSlug,
  lines,
  subtotal,
  enabled,
}: UseAbandonedCartTrackingOptions) {
  const sessionToken = useMemo(() => getCheckoutSessionToken(storeId), [storeId]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!enabled || !form || lines.length === 0) return;

    const persist = () => {
      const formData = new FormData(form);
      const email = String(formData.get("email") ?? "").trim();
      const phone = String(formData.get("phone") ?? "").trim();
      if (!email && !phone) return;

      const firstName = String(formData.get("first_name") ?? "").trim();
      const lastName = String(formData.get("last_name") ?? "").trim();
      const customerName = [firstName, lastName].filter(Boolean).join(" ") || undefined;
      const currency = lines[0]?.product.currency ?? "NGN";

      void storefrontApi
        .recordAbandonedCart(storeSlug, {
          session_token: sessionToken,
          customer_name: customerName,
          customer_email: email || undefined,
          customer_phone: phone || undefined,
          delivery_address: String(formData.get("delivery_address") ?? "").trim() || undefined,
          subtotal,
          currency,
          items: lines.map((line) => ({
            product_id: line.product.id,
            name: line.product.name,
            quantity: line.quantity,
            unit_price: line.product.price,
            total: line.product.price * line.quantity,
            currency: line.product.currency,
            image_url: line.product.image_url ?? undefined,
          })),
        })
        .catch(() => undefined);
    };

    const schedulePersist = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(persist, 1200);
    };

    form.addEventListener("change", schedulePersist);
    form.addEventListener("blur", schedulePersist, true);

    return () => {
      form.removeEventListener("change", schedulePersist);
      form.removeEventListener("blur", schedulePersist, true);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [enabled, formRef, lines, sessionToken, storeSlug, subtotal]);

  return sessionToken;
}
