"use client";

import type { CSSProperties } from "react";
import {
  normalizeVariantGroups,
  type ProductVariantGroup,
  type SelectedOptions,
} from "@/lib/storefront/cart-line";
import { formatMoney } from "@/lib/storefront/format";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { cn } from "@/lib/utils";

export {
  defaultSelectedOptions,
  formatSelectedOptions,
  normalizeVariantGroups,
  type ProductVariantGroup,
  type SelectedOptions,
} from "@/lib/storefront/cart-line";

type ProductVariantSelectorProps = {
  variants: ProductVariantGroup[] | StoreProductVariants;
  selectedOptions: SelectedOptions;
  onChange: (next: SelectedOptions) => void;
  /** Visual chrome to match template buy boxes */
  appearance?: "square" | "pill" | "soft";
  className?: string;
  currency?: string;
};

type StoreProductVariants = Array<{
  name: string;
  options: Array<string | { value: string; price?: number | null; image_url?: string | null }>;
}>;

export function ProductVariantSelector({
  variants,
  selectedOptions,
  onChange,
  appearance = "soft",
  className,
  currency = "NGN",
}: ProductVariantSelectorProps) {
  const { theme } = useStorefrontTheme();
  const groups = normalizeVariantGroups(variants);

  if (!groups.length) return null;

  return (
    <div className={cn("space-y-5", className)}>
      {groups.map((variant) => {
        const selected = selectedOptions[variant.name] ?? variant.options[0]?.value;
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
                const isSelected = selected === option.value;
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
                    key={option.value}
                    type="button"
                    onClick={() =>
                      onChange({ ...selectedOptions, [variant.name]: option.value })
                    }
                    className={cn(
                      "border text-xs font-semibold transition hover:opacity-90",
                      appearance === "square" && "px-3 py-3",
                      appearance === "pill" && "rounded-full px-4 py-2 text-sm",
                      appearance === "soft" && "rounded-full px-4 py-2",
                      option.image_url && "flex items-center gap-2",
                    )}
                    style={baseStyle}
                    aria-pressed={isSelected}
                  >
                    {option.image_url ? (
                      <img
                        src={option.image_url}
                        alt=""
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : null}
                    <span>
                      {option.value}
                      {option.price != null ? (
                        <span className="ml-1 font-normal opacity-80">
                          · {formatMoney(option.price, currency)}
                        </span>
                      ) : null}
                    </span>
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
