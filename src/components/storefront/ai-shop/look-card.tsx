"use client";

import Image from "next/image";
import Link from "next/link";
import type { ShoppingLook, ShopperContext } from "@/lib/api/types";
import { formatMoney } from "@/lib/storefront/format";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { PrimaryButton } from "@/components/storefront/theme/primary-button";
import { cn } from "@/lib/utils";

type RecommendationCardProps = {
  look: ShoppingLook;
  shopper: ShopperContext;
  onTryOn: () => void;
  onAddLook: () => void;
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
  onTryOn,
  onAddLook,
  tryOnAvailable,
  busy,
}: RecommendationCardProps) {
  const { theme } = useStorefrontTheme();
  const isLook = look.type === "look";
  const heading = isLook ? "Your look" : "Recommended for you";
  const addLabel = isLook ? "Add look to cart" : "Add all to cart";
  const countLabel = isLook
    ? `${look.items.length} pieces`
    : `${look.items.length} product${look.items.length === 1 ? "" : "s"}`;
  const priceLabel =
    !isLook && look.items.length > 1
      ? `from ${formatMoney(look.total_price, look.currency)}`
      : formatMoney(look.total_price, look.currency);

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
          {countLabel} · {priceLabel}
          {look.within_budget === false ? " · slightly over budget" : ""}
        </p>
      </div>

      <ul className="divide-y" style={{ borderColor: theme.palette.border }}>
        {look.items.map((item, index) => {
          const product = item.product;
          const image = product.image_url || product.images?.[0] || null;
          return (
            <li key={`${item.role}-${item.product_id}`} className="flex gap-3 px-4 py-3 sm:px-5">
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
                  {formatMoney(
                    product.effective_price ?? product.sale_price ?? product.price,
                    product.currency || look.currency,
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2 border-t px-4 py-4 sm:flex-row sm:px-5" style={{ borderColor: theme.palette.border }}>
        {tryOnAvailable && shopper.supports_try_on ? (
          <PrimaryButton type="button" onClick={onTryOn} disabled={busy} className="flex-1">
            See it on you
          </PrimaryButton>
        ) : null}
        <button
          type="button"
          onClick={onAddLook}
          disabled={busy}
          className={cn(
            "flex-1 border px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] transition disabled:opacity-50",
            theme.borderColor,
          )}
          style={{ color: theme.palette.foreground }}
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}

/** @deprecated Use RecommendationCard */
export const LookCard = RecommendationCard;
