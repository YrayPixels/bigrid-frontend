"use client";

import { useEffect } from "react";
import { useCart } from "./cart-context";
import { useStorefront } from "./store-context";

export function CartRefreshEffect() {
  const { refreshLines } = useCart();
  const { storefront } = useStorefront();

  useEffect(() => {
    const products = storefront.products ?? [];
    if (products.length === 0) return;

    // If there's an active Dealie deal token, skip the refresh for that product
    // so the negotiated price is not overwritten by the catalog price.
    const dealieProductId =
      typeof window !== "undefined" ? window.sessionStorage.getItem("dealie_product_id") : null;
    const dealieAgreedPrice =
      typeof window !== "undefined" ? window.sessionStorage.getItem("dealie_agreed_price") : null;
    const dealieToken =
      typeof window !== "undefined" ? window.sessionStorage.getItem("dealie_token") : null;

    if (dealieToken && dealieProductId && dealieAgreedPrice) {
      // Refresh all products EXCEPT the Dealie-negotiated one
      const nonDealieProducts = products.filter(
        (p) =>
          String(p.id) !== dealieProductId &&
          p.slug !== dealieProductId &&
          p.sku !== dealieProductId,
      );
      refreshLines(nonDealieProducts.length > 0 ? nonDealieProducts : products);
    } else {
      refreshLines(products);
    }
  }, [storefront.products, refreshLines]);

  return null;
}
