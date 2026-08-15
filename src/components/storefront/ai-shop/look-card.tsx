"use client";

import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import type { ShoppingLook, ShopperContext } from "@/lib/api/types";
import { formatMoney } from "@/lib/storefront/format";
import { lookItemUnitPrice, lookItemsTotal, selectedLookItems } from "@/lib/storefront/outfit-look";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { PrimaryButton } from "@/components/storefront/theme/primary-button";
import { cn } from "@/lib/utils";

type RecommendationCardProps = {
  look: ShoppingLook;
  shopper: ShopperContext;
  selectedIds: string[];
  onToggleItem: (productId: string) => void;
  onTryOn: () => void;
  onOpenLook: () => void;
  tryOnAvailable?: boolean;
  busy?: boolean;
};

const FASHION_ROLE_LABEL: Record<string, string> = {
  primary: "Hero piece",
  bag: "Bag",
  shoe: "Shoes",
  accessory: "Accessory",
  beauty: "Beauty",
};

const PRODUCT_ROLE_LABEL: Record<string, string> = {
  top_pick: "Top pick",
  option_2: "Option 2",
  option_3: "Option 3",
  pick: "Recommended",
};

function roleLabel(role: string, isLook: boolean, index: number): string {
  if (isLook) {
    return FASHION_ROLE_LABEL[role] ?? role.replace(/_/g, " ");
  }
  if (index === 0) return "Top pick";
  return PRODUCT_ROLE_LABEL[role] ?? `Option ${index + 1}`;
}

export function RecommendationCard({
  look,
  shopper,
  selectedIds,
  onToggleItem,
  onTryOn,
  onOpenLook,
  tryOnAvailable,
  busy,
}: RecommendationCardProps) {
  const { theme } = useStorefrontTheme();
  const isLook = look.type === "look";
  const heading = isLook ? "Your look" : "Recommended for you";
  const selectedItems = selectedLookItems(look, selectedIds);
  const selectedCount = selectedItems.length;
  const selectedTotal = lookItemsTotal(selectedItems);
  const countLabel = isLook
    ? `${selectedCount} piece${selectedCount === 1 ? "" : "s"}`
    : `${selectedCount} product${selectedCount === 1 ? "" : "s"}`;
  const tryLabel =
    selectedCount > 1 ? "Try this look" : shopper.supports_looks ? "See it on you" : "Try it on";
  const openLabel = selectedCount > 1 ? "Review look" : isLook ? "Add look to cart" : "Add all to cart";

  return (
    <div
      className={cn("overflow-hidden border", theme.borderColor)}
      style={{ backgroundColor: theme.palette.surface }}
    >
      <div className="border-b px-4 py-3 sm:px-5" style={{ borderColor: theme.palette.border }}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.palette.muted }}>
          {heading}
        </p>
        <h3 className="mt-1 text-lg font-semibold tracking-tight" style={{ fontFamily: theme.displayFont }}>
          {look.name}
        </h3>
        <p className="mt-1 text-sm" style={{ color: theme.palette.muted }}>
          {countLabel} · {formatMoney(selectedTotal, look.currency)}
          {look.within_budget === false ? " · slightly over budget" : ""}
        </p>
        {look.items.length > 1 ? (
          <p className="mt-2 text-[11px]" style={{ color: theme.palette.muted }}>
            Tap pieces to include them in the look.
          </p>
        ) : null}
      </div>

      <ul className="divide-y" style={{ borderColor: theme.palette.border }}>
        {look.items.map((item, index) => {
          const product = item.product;
          const image = product.image_url || product.images?.[0] || null;
          const selected = selectedIds.includes(item.product_id);
          return (
            <li key={`${item.role}-${item.product_id}`} className="flex gap-3 px-4 py-3 sm:px-5">
              {look.items.length > 1 ? (
                <button
                  type="button"
                  onClick={() => onToggleItem(item.product_id)}
                  disabled={busy}
                  className="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded border"
                  style={{
                    borderColor: selected ? theme.palette.primary : theme.palette.border,
                    backgroundColor: selected ? theme.palette.primary : "transparent",
                    color: selected ? theme.palette.background : theme.palette.muted,
                  }}
                  aria-pressed={selected}
                  aria-label={selected ? `Remove ${product.name} from look` : `Add ${product.name} to look`}
                >
                  {selected ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                </button>
              ) : null}
              <div
                className="relative h-16 w-14 shrink-0 overflow-hidden"
                style={{ backgroundColor: `${theme.palette.muted}22` }}
              >
                {image ? (
                  <Image src={image} alt={product.name} fill className="object-cover" sizes="56px" unoptimized />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.palette.muted }}>
                  {roleLabel(item.role, isLook, index)}
                </p>
                <Link
                  href={`/products/${product.slug}`}
                  className="mt-0.5 block truncate text-sm font-medium hover:underline"
                >
                  {product.name}
                </Link>
                <p className="mt-0.5 text-xs" style={{ color: theme.palette.muted }}>
                  {formatMoney(lookItemUnitPrice(product), product.currency || look.currency)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2 border-t px-4 py-4 sm:flex-row sm:px-5" style={{ borderColor: theme.palette.border }}>
        {tryOnAvailable && shopper.supports_try_on ? (
          <PrimaryButton type="button" onClick={onTryOn} disabled={busy || selectedCount === 0} className="flex-1">
            {tryLabel}
          </PrimaryButton>
        ) : null}
        <button
          type="button"
          onClick={onOpenLook}
          disabled={busy || selectedCount === 0}
          className={cn(
            "flex-1 border px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition disabled:opacity-50",
            theme.borderColor,
          )}
          style={{ color: theme.palette.text }}
        >
          {openLabel}
        </button>
      </div>
    </div>
  );
}

/** @deprecated Use RecommendationCard */
export const LookCard = RecommendationCard;
