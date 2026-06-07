"use client";

import Link from "next/link";
import type { StoreProduct } from "@/lib/api/types";
import { formatMoney } from "@/lib/storefront/format";

export function ProductCard({
  product,
  brandColor,
}: {
  product: StoreProduct;
  brandColor: string;
}) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition hover:-translate-y-0.5 hover:shadow-elevated"
    >
      <div
        className="flex aspect-[4/3] items-center justify-center text-4xl font-bold text-white/90"
        style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}88)` }}
      >
        {product.name.slice(0, 1)}
      </div>
      <div className="p-5">
        <h3 className="font-display text-lg font-semibold group-hover:text-foreground">
          {product.name}
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        <div className="mt-4 text-base font-semibold" style={{ color: brandColor }}>
          {formatMoney(product.price, product.currency)}
        </div>
      </div>
    </Link>
  );
}
