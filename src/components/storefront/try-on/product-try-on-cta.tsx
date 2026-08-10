"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import type { StoreProduct } from "@/lib/api/types";
import { useStorefront } from "@/lib/storefront/store-context";
import { isTryOnEligible } from "@/lib/storefront/try-on";
import { FittingSheet } from "@/components/storefront/try-on/fitting-sheet";

type ProductTryOnCtaProps = {
  product: StoreProduct;
  onAddToCart: () => void;
  onBuyNow: () => void;
  className?: string;
  buttonClassName?: string;
  buttonStyle?: CSSProperties;
  label?: string;
};

export function ProductTryOnCta({
  product,
  onAddToCart,
  onBuyNow,
  className,
  buttonClassName,
  buttonStyle,
  label = "Try it on",
}: ProductTryOnCtaProps) {
  const { store } = useStorefront();
  const [open, setOpen] = useState(false);

  if (!isTryOnEligible(store, product)) return null;

  return (
    <div className={className}>
      <button type="button" className={buttonClassName} style={buttonStyle} onClick={() => setOpen(true)}>
        {label}
      </button>
      <FittingSheet
        open={open}
        onOpenChange={setOpen}
        product={product}
        onAddToCart={onAddToCart}
        onBuyNow={onBuyNow}
      />
    </div>
  );
}

/** Renders children only when try-on is eligible (for layout wrappers). */
export function TryOnEligible({
  product,
  children,
}: {
  product: StoreProduct;
  children: ReactNode;
}) {
  const { store } = useStorefront();
  if (!isTryOnEligible(store, product)) return null;
  return <>{children}</>;
}
