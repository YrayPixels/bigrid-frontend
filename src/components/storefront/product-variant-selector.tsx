"use client";

import type { CSSProperties } from "react";
import type { ProductVariantGroup, SelectedOptions } from "@/lib/storefront/cart-line";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { cn } from "@/lib/utils";

export {
  defaultSelectedOptions,
  formatSelectedOptions,
  type ProductVariantGroup,
  type SelectedOptions,
} from "@/lib/storefront/cart-line";

type ProductVariantSelectorProps = {
  variants: ProductVariantGroup[];
  selectedOptions: SelectedOptions;
  onChange: (next: SelectedOptions) => void;
  /** Visual chrome to match template buy boxes */
  appearance?: "square" | "pill" | "soft";
  className?: string;
};

export function ProductVariantSelector({
  variants,
  selectedOptions,
  onChange,
  appearance = "soft",
  className,
}: ProductVariantSelectorProps) {
  const { theme } = useStorefrontTheme();

  if (!variants.length) return null;

  return (
    <div className={cn("space-y-5", className)}>
      {variants.map((variant) => {
        const selected = selectedOptions[variant.name] ?? variant.options[0];
        return (
          <div key={variant.name}>
            <div className="flex items-center justify-between gap-3 text-sm font-semibold">
              <span>
                {variant.name}
                {selected ? (
                  <span className="ml-2 font-normal" style={{ color: theme.palette.muted }}>
                    {selected}
                  </span>
                ) : null}
              </span>
            </div>
            <div
              className={cn(
                "mt-3 flex flex-wrap gap-2",
                appearance === "square" && "grid grid-cols-3 gap-2 sm:grid-cols-6",
              )}
            >
              {variant.options.map((option) => {
                const isSelected = selected === option;
                const baseStyle: CSSProperties = {
                  borderColor: isSelected ? theme.palette.primary : theme.palette.border,
                  backgroundColor: isSelected
                    ? appearance === "square"
                      ? theme.palette.primary
                      : theme.palette.surface
                    : appearance === "soft"
                      ? theme.palette.background
                      : theme.palette.surface,
                  color:
                    isSelected && appearance === "square"
                      ? theme.palette.background
                      : isSelected
                        ? theme.palette.primary
                        : theme.palette.text,
                };

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onChange({ ...selectedOptions, [variant.name]: option })}
                    className={cn(
                      "border text-xs font-semibold transition hover:opacity-90",
                      appearance === "square" && "px-3 py-3",
                      appearance === "pill" && "rounded-full px-4 py-2 text-sm",
                      appearance === "soft" && "rounded-full px-4 py-2",
                    )}
                    style={baseStyle}
                    aria-pressed={isSelected}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
