"use client";

import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import type { CartLine } from "@/lib/storefront/cart-context";
import { formatMoney } from "@/lib/storefront/format";
import { lookItemUnitPrice, resolveCartOutfit } from "@/lib/storefront/outfit-look";

type OutfitLookBannerProps = {
  lines: CartLine[];
  compact?: boolean;
};

export function OutfitLookBanner({ lines, compact }: OutfitLookBannerProps) {
  const { store } = useStorefront();
  const { theme } = useStorefrontTheme();
  const outfit = resolveCartOutfit(store.id, lines);
  if (!outfit || outfit.product_ids.length < 2) return null;

  const lookLines = lines.filter((line) => outfit.product_ids.includes(line.product.id));
  const total = lookLines.reduce(
    (sum, line) => sum + lookItemUnitPrice(line.product) * line.quantity,
    0,
  );
  const currency = lookLines[0]?.product.currency;

  return (
    <div
      className={compact ? "mb-4 overflow-hidden rounded-2xl border" : "mb-6 overflow-hidden rounded-[1.5rem] border"}
      style={{ borderColor: theme.palette.border, backgroundColor: theme.palette.background }}
    >
      <div className={compact ? "flex gap-3 p-3" : "flex gap-4 p-4"}>
        {outfit.result_url ? (
          <img
            src={outfit.result_url}
            alt=""
            className="shrink-0 rounded-xl object-cover"
            style={{ width: compact ? 48 : 72, height: compact ? 64 : 96 }}
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.palette.muted }}>
            Your look
          </p>
          <p className="mt-1 text-sm font-semibold tracking-tight">{outfit.name}</p>
          <p className="mt-0.5 text-xs" style={{ color: theme.palette.muted }}>
            {lookLines.length} piece{lookLines.length === 1 ? "" : "s"}
            {currency ? ` · ${formatMoney(total, currency)}` : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
