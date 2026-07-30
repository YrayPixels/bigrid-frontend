"use client";

import { useEffect } from "react";
import { useCart } from "./cart-context";
import { useStorefront } from "./store-context";

export function CartRefreshEffect() {
  const { refreshLines } = useCart();
  const { storefront } = useStorefront();

  useEffect(() => {
    const products = storefront.products ?? [];
    if (products.length > 0) {
      refreshLines(products);
    }
  }, [storefront.products, refreshLines]);

  return null;
}
