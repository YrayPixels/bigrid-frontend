"use client";

import Link from "next/link";
import type { StoreProduct } from "@/lib/api/types";
import { formatMoney } from "@/lib/storefront/format";
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
  const isFashion = theme.id === "fashion_lookbook";

  const card = (
    <div
      className={cn(
        "group overflow-hidden transition",
        isFashion
          ? "text-left"
          : "rounded-2xl border border-border bg-card shadow-soft hover:-translate-y-0.5 hover:shadow-elevated",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center text-white",
          isFashion ? "aspect-[4/5] bg-[#eef0ef]" : "aspect-[4/3] text-4xl font-bold",
        )}
        style={
          isFashion
            ? undefined
            : { background: `linear-gradient(135deg, ${theme.brandColor}, ${theme.brandColor}88)` }
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
          style={isFashion ? undefined : { fontFamily: theme.displayFont }}
        >
          {product.name}
        </h3>
        <p className={cn("mt-2 line-clamp-2 text-sm", theme.mutedText)}>{product.description}</p>
        <div
          className={cn("mt-4 font-semibold", isFashion ? "text-xs" : "text-base")}
          style={{ color: theme.brandColor }}
        >
          {formatMoney(product.price, product.currency)}
        </div>
      </div>
    </div>
  );

  if (mode === "edit") return card;

  return <Link href={`/products/${product.slug}`}>{card}</Link>;
}
