"use client";

import { usePathname } from "next/navigation";
import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const defaultToastClassNames = {
  toast:
    "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
  description: "group-[.toast]:text-muted-foreground",
  actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
  cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
};

const storefrontToastClassNames = {
  toast:
    "group toast group-[.toaster]:rounded-[var(--store-toast-radius)] group-[.toaster]:border-[var(--store-border)] group-[.toaster]:bg-[var(--store-surface)] group-[.toaster]:text-[var(--store-text)] group-[.toaster]:shadow-lg",
  description: "group-[.toast]:text-[var(--store-muted)]",
  actionButton:
    "group-[.toast]:rounded-[var(--store-toast-radius)] group-[.toast]:bg-[var(--store-brand)] group-[.toast]:text-white",
  cancelButton:
    "group-[.toast]:rounded-[var(--store-toast-radius)] group-[.toast]:border group-[.toast]:border-[var(--store-border)] group-[.toast]:bg-transparent group-[.toast]:text-[var(--store-text)]",
};

const Toaster = ({ toastOptions, position, richColors, ...props }: ToasterProps) => {
  const pathname = usePathname();
  const isStorefront = pathname?.startsWith("/s/");
  const classNames = isStorefront ? storefrontToastClassNames : defaultToastClassNames;

  return (
    <Sonner
      className="toaster group"
      position={isStorefront ? "bottom-right" : position}
      richColors={isStorefront ? false : richColors}
      toastOptions={{
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
