"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Toaster as Sonner } from "sonner";
import { isStorefrontContext } from "@/lib/storefront/is-storefront-context";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const PLATFORM_TOAST_DURATION_MS = 3000;
const STOREFRONT_TOAST_DURATION_MS = 2500;

const defaultToastClassNames = {
  toast:
    "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
  description: "group-[.toast]:text-muted-foreground",
  actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
  cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
};

const storefrontToastClassNames = {
  toast:
    "group toast group-[.toaster]:rounded-[var(--store-toast-radius)] group-[.toaster]:border group-[.toaster]:border-[var(--store-border)] group-[.toaster]:bg-[var(--store-surface)] group-[.toaster]:text-[var(--store-text)] group-[.toaster]:shadow-lg group-[.toaster]:[font-family:var(--store-body-font,var(--font-clean-sans))]",
  description: "group-[.toast]:text-[var(--store-muted)]",
  success: "group-[.toast]:!text-[var(--store-brand)]",
  error: "group-[.toast]:!text-red-600",
  actionButton:
    "group-[.toast]:rounded-[var(--store-toast-radius)] group-[.toast]:bg-[var(--store-brand)] group-[.toast]:text-white",
  cancelButton:
    "group-[.toast]:rounded-[var(--store-toast-radius)] group-[.toast]:border group-[.toast]:border-[var(--store-border)] group-[.toast]:bg-transparent group-[.toast]:text-[var(--store-text)]",
};

const Toaster = ({ toastOptions, position, richColors, duration, ...props }: ToasterProps) => {
  const pathname = usePathname();
  const pathStorefront = Boolean(pathname?.startsWith("/s/"));
  const [hostStorefront, setHostStorefront] = useState(false);

  useEffect(() => {
    setHostStorefront(isStorefrontContext(pathname));
  }, [pathname]);

  const isStorefront = pathStorefront || hostStorefront;
  const classNames = isStorefront ? storefrontToastClassNames : defaultToastClassNames;
  const resolvedDuration =
    duration ?? (isStorefront ? STOREFRONT_TOAST_DURATION_MS : PLATFORM_TOAST_DURATION_MS);

  return (
    <Sonner
      className="toaster group"
      duration={resolvedDuration}
      position={isStorefront ? "bottom-right" : position}
      richColors={isStorefront ? false : richColors}
      toastOptions={{
        duration: resolvedDuration,
        ...toastOptions,
        classNames: {
          ...classNames,
          ...toastOptions?.classNames,
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
