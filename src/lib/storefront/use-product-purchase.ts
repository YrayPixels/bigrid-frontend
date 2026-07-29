"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { StoreDiscount, StoreProduct } from "@/lib/api/types";
import {
  defaultSelectedOptions,
  requireVariantSelection,
  resolveVariantSelection,
  type SelectedOptions,
} from "@/lib/storefront/cart-line";
import { useCart } from "@/lib/storefront/cart-context";
import {
  maxPurchaseQuantity,
  productAvailabilityError,
} from "@/lib/storefront/product-availability";
import { productUnitPrice } from "@/lib/storefront/pricing";
import { useStorefront } from "@/lib/storefront/store-context";

export function useProductPurchase(product: StoreProduct, discountsOverride?: StoreDiscount[]) {
  const { addItem } = useCart();
  const router = useRouter();
  const { discounts: storeDiscounts } = useStorefront();
  const discounts = discountsOverride ?? storeDiscounts ?? [];
  const stockCap = maxPurchaseQuantity(product);
  const [quantity, setQuantityState] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>(() =>
    defaultSelectedOptions(product.variants),
  );
  const availabilityError = productAvailabilityError(product);

  const selection = useMemo(
    () => resolveVariantSelection(product, selectedOptions),
    [product, selectedOptions],
  );
  const priced = useMemo(
    () => productUnitPrice(product, discounts, selectedOptions),
    [product, discounts, selectedOptions],
  );

  function setQuantity(next: number | ((current: number) => number)) {
    setQuantityState((current) => {
      const value = typeof next === "function" ? next(current) : next;
      const capped = stockCap != null ? Math.min(value, stockCap) : value;
      return Math.max(1, capped);
    });
  }

  function addToCart(label = "Added to cart"): boolean {
    if (availabilityError) {
      toast.error(availabilityError);
      return false;
    }
    const error = requireVariantSelection(product, selectedOptions);
    if (error) {
      toast.error(error);
      return false;
    }
    addItem(product, quantity, selectedOptions);
    toast.success(label);
    return true;
  }

  function buyNow() {
    if (!addToCart("Ready for checkout")) return;
    router.push("/checkout");
  }

  return {
    quantity,
    setQuantity,
    selectedOptions,
    setSelectedOptions,
    addToCart,
    buyNow,
    availabilityError,
    stockCap,
    outOfStock: Boolean(availabilityError),
    priced,
    displayImageUrl: selection.imageUrl,
  };
}
