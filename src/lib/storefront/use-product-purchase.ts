"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { StoreProduct } from "@/lib/api/types";
import { requireVariantSelection } from "@/lib/storefront/cart-line";
import { useCart } from "@/lib/storefront/cart-context";
import {
  maxPurchaseQuantity,
  productAvailabilityError,
} from "@/lib/storefront/product-availability";
import { defaultSelectedOptions, type SelectedOptions } from "@/lib/storefront/cart-line";

export function useProductPurchase(product: StoreProduct) {
  const { addItem } = useCart();
  const router = useRouter();
  const stockCap = maxPurchaseQuantity(product);
  const [quantity, setQuantityState] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>(() =>
    defaultSelectedOptions(product.variants),
  );
  const availabilityError = productAvailabilityError(product);

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
  };
}
