"use client";

import Link from "next/link";
import type { StoreProduct } from "@/lib/api/types";
import { formatMoney } from "@/lib/storefront/format";
import { productUnitPrice } from "@/lib/storefront/pricing";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { cn } from "@/lib/utils";
import { EditableImage } from "./editable-image";

export function ProductCardThemed({
  product,
  imagePath,
}: {
  product: StoreProduct;
  imagePath?: string;
}) {
  const { theme, mode } = useStorefrontTheme();
  const { discounts } = useStorefront();
  const priced = productUnitPrice(product, discounts ?? []);
  const isFashion = theme.id === "fashion_lookbook";

  const card = (
    <div
      className={cn(
        "group overflow-hidden transition",
        isFashion
          ? "text-left"
          : `rounded-2xl border ${theme.borderColor} ${theme.cardBg} shadow-soft hover:-translate-y-0.5 hover:shadow-elevated`,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center text-white",
          isFashion ? "aspect-[4/5]" : "aspect-[4/3] text-4xl font-bold",
        )}
        style={
          isFashion
            ? { backgroundColor: theme.palette.surface }
            : {
                background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.primary}88)`,
              }
        }
      >
        {product.image_url || (mode === "edit" && imagePath) ? (
          <EditableImage
            path={imagePath}
            src={product.image_url}
            alt={product.name}
            className="h-full w-full"
            imgClassName="object-center"
          />
        ) : (
          <span className={isFashion ? "text-2xl font-bold text-[#111]" : ""}>
            {product.name.slice(0, 1)}
          </span>
        )}
      </div>
      <div className={isFashion ? "mt-4" : "p-5"}>
        <h3
          className={cn(
            "font-semibold group-hover:underline",
            isFashion ? "text-xs font-bold" : "font-display text-lg",
          )}
          style={{
            color: theme.palette.text,
            ...(isFashion ? {} : { fontFamily: theme.displayFont }),
          }}
        >
          {product.name}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm" style={{ color: theme.palette.muted }}>
          {product.description}
        </p>
        <div
          className={cn(
            "mt-4 flex items-center gap-2 font-semibold",
            isFashion ? "text-xs" : "text-base",
          )}
          style={{ color: theme.palette.primary }}
        >
          <span>{formatMoney(priced.unitPrice, product.currency)}</span>
          {priced.compareAtPrice != null ? (
            <span className="font-medium line-through" style={{ color: theme.palette.muted }}>
              {formatMoney(priced.compareAtPrice, product.currency)}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (mode === "edit") return card;

  return <Link href={`/products/${product.slug}`}>{card}</Link>;
}
