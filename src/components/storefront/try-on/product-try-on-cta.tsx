"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { StoreProduct } from "@/lib/api/types";
import { useCustomerAuthOptional } from "@/lib/storefront/customer-auth";
import { useStorefront } from "@/lib/storefront/store-context";
import { isTryOnEligible } from "@/lib/storefront/try-on";
import { FittingSheet } from "@/components/storefront/try-on/fitting-sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ProductTryOnCtaProps = {
  product: StoreProduct;
  onAddToCart: () => void;
  onBuyNow: () => void;
  className?: string;
  buttonClassName?: string;
  buttonStyle?: CSSProperties;
  label?: string;
};

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function TryOnSignInDialog({
  open,
  onOpenChange,
  onContinue,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContinue: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sign in to try it on</DialogTitle>
          <DialogDescription>
            Use Google to save your look and try items on across stores.
          </DialogDescription>
        </DialogHeader>
        <button
          type="button"
          onClick={onContinue}
          className="flex w-full items-center justify-center rounded-xl border border-border bg-background px-4 py-3 text-sm font-medium transition hover:bg-muted"
        >
          <GoogleIcon />
          Continue with Google
        </button>
      </DialogContent>
    </Dialog>
  );
}

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
  const customerAuth = useCustomerAuthOptional();
  const customer = customerAuth?.customer ?? null;
  const loading = customerAuth?.loading ?? false;
  const requireCustomerAuth = customerAuth !== null;
  const [open, setOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !requireCustomerAuth || loading || !customer) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("try_on") !== "1") return;
    setOpen(true);
    const url = new URL(window.location.href);
    url.searchParams.delete("try_on");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  }, [customer, loading, requireCustomerAuth]);

  if (!isTryOnEligible(store, product)) return null;

  const handleClick = () => {
    if (loading) return;
    if (requireCustomerAuth && !customer) {
      setSignInOpen(true);
      return;
    }
    setOpen(true);
  };

  return (
    <div className={className}>
      <button
        type="button"
        className={buttonClassName}
        style={buttonStyle}
        onClick={handleClick}
        disabled={loading}
      >
        {label}
      </button>

      <TryOnSignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        onContinue={() => {
          if (typeof window === "undefined") {
            customerAuth?.signInWithGoogle();
            return;
          }
          const ret = new URL(window.location.href);
          ret.searchParams.set("try_on", "1");
          customerAuth?.signInWithGoogle(ret.toString());
        }}
      />

      {!requireCustomerAuth || customer ? (
        <FittingSheet
          open={open}
          onOpenChange={setOpen}
          product={product}
          onAddToCart={onAddToCart}
          onBuyNow={onBuyNow}
        />
      ) : null}
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
