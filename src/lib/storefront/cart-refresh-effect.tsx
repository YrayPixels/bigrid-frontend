"use client";

import { useEffect } from "react";
import { useCart } from "./cart-context";
import { useStorefront } from "./store-context";

export function CartRefreshEffect() {
  const { refreshLines } = useCart();
  const { products } = useStorefront();

  useEffect(() => {
    if (products && products.length > 0) {
      refreshLines(products);
    }
  }, [products, refreshLines]);

  return null;
}
