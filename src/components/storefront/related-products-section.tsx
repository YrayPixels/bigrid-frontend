"use client";

import Link from "next/link";
import type { StoreProduct } from "@/lib/api/types";
import { formatMoney } from "@/lib/storefront/format";
import { productUnitPrice } from "@/lib/storefront/pricing";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { relatedProductsFor } from "@/lib/storefront/related-products";

export function RelatedProductsSection({
  product,
  appearance = "soft",
}: {
  product: StoreProduct;
  appearance?: "fashion" | "soft" | "minimal";
}) {
  const { storefront, categories, discounts } = useStorefront();
  const { theme, mode } = useStorefrontTheme();

  if (mode === "edit") return null;

  const related = relatedProductsFor(
    product,
    storefront.products ?? [],
    categories ?? [],
    4,
  );

  if (!related.length) return null;

  const isFashion = appearance === "fashion";
  const isMinimal = appearance === "minimal";

  return (
    <section
      className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16"
      style={{ color: theme.palette.text }}
    >
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color: theme.palette.muted }}
          >
            You may also like
          </p>
          <h2
            className={
              isFashion
                ? "mt-2 text-2xl font-bold tracking-tight"
                : isMinimal
                  ? "mt-2 text-2xl font-semibold tracking-[-0.03em]"
                  : "mt-2 font-display text-3xl font-semibold tracking-tight"
            }
          >
            Related products
          </h2>
        </div>
        <Link
          href="/products"
          className="text-xs font-semibold underline underline-offset-4"
          style={{ color: theme.palette.primary }}
        >
          View all
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {related.map((item) => {
          const priced = productUnitPrice(item, discounts ?? []);
          return (
            <Link key={item.id} href={`/products/${item.slug}`} className="group block">
              <div
                className={
                  isMinimal
                    ? "aspect-square overflow-hidden rounded-xl"
                    : isFashion
                      ? "aspect-[4/5] overflow-hidden"
                      : "aspect-[4/5] overflow-hidden rounded-[1.5rem]"
                }
                style={{ backgroundColor: theme.palette.surface }}
              >
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div
                    className="grid h-full place-items-center text-3xl font-bold text-white"
                    style={{
                      background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.primary}88)`,
                    }}
                  >
                    {item.name.slice(0, 1)}
                  </div>
                )}
              </div>
              <p
                className="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: theme.palette.muted }}
              >
                {item.category ?? "Shop"}
              </p>
              <h3 className="mt-1 line-clamp-1 text-sm font-semibold">{item.name}</h3>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                <span>{formatMoney(priced.unitPrice, item.currency)}</span>
                {priced.compareAtPrice != null ? (
                  <span className="text-xs font-medium line-through" style={{ color: theme.palette.muted }}>
                    {formatMoney(priced.compareAtPrice, item.currency)}
                  </span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
