"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpDown } from "lucide-react";
import type { MerchantDashboardTopProduct } from "@/lib/api/types";

function ProductAvatar({
  product,
}: {
  product: MerchantDashboardTopProduct;
}) {
  return (
    <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-secondary">
      {product.image_url ? (
        <Image
          src={product.image_url}
          alt={product.name}
          fill
          className="object-cover"
          sizes="36px"
          unoptimized
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-[10px] font-semibold text-primary">
          {product.name.slice(0, 2).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ inStock }: { inStock: boolean }) {
  return (
    <span
      className={
        inStock
          ? "inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700"
          : "inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700"
      }
    >
      {inStock ? "In Stock" : "Low Stock"}
    </span>
  );
}

export function TopSellingCard({
  products,
  loading,
  formatMoney,
}: {
  products: MerchantDashboardTopProduct[];
  loading?: boolean;
  formatMoney: (value: number, currency?: string) => string;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5 lg:p-6">
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold tracking-tight sm:text-lg">
            Top selling
          </h2>
          <p className="text-sm text-ink-soft">Best performers by total earnings</p>
        </div>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 self-start rounded-full border border-border px-3 py-1.5 text-xs font-medium text-ink hover:bg-secondary"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          View catalog
        </Link>
      </div>

      {/* Mobile stacked list */}
      <div className="space-y-3 md:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-xl bg-secondary" />
          ))
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-ink-soft">
            Top products will appear once you start selling.
          </div>
        ) : (
          products.map((product) => {
            const inStock = product.quantity_sold > 0;
            return (
              <div
                key={product.product_id || product.name}
                className="rounded-xl border border-border/70 bg-background/60 p-3"
              >
                <div className="flex items-start gap-3">
                  <ProductAvatar product={product} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-medium text-ink">{product.name}</p>
                      <StatusBadge inStock={inStock} />
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">
                      {formatMoney(product.unit_price, product.currency)}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                      <span className="text-ink-soft">
                        {product.quantity_sold.toLocaleString()} sold
                      </span>
                      <span className="font-semibold tabular-nums text-ink">
                        {formatMoney(product.total_earning, product.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <div className="-mx-1 hidden overflow-x-auto px-1 md:block">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-ink-soft">
              <th className="pb-3 font-medium">Product</th>
              <th className="pb-3 font-medium">Price</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 text-right font-medium">Sold</th>
              <th className="pb-3 text-right font-medium">Total earning</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <tr key={index}>
                  <td colSpan={5} className="py-3">
                    <div className="h-10 animate-pulse rounded-lg bg-secondary" />
                  </td>
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-ink-soft">
                  Top products will appear once you start selling.
                </td>
              </tr>
            ) : (
              products.map((product) => {
                const inStock = product.quantity_sold > 0;
                return (
                  <tr
                    key={product.product_id || product.name}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="py-3.5 pr-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <ProductAvatar product={product} />
                        <span className="truncate font-medium text-ink">{product.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 whitespace-nowrap tabular-nums text-ink-soft">
                      {formatMoney(product.unit_price, product.currency)}
                    </td>
                    <td className="py-3.5">
                      <StatusBadge inStock={inStock} />
                    </td>
                    <td className="py-3.5 whitespace-nowrap text-right tabular-nums text-ink">
                      {product.quantity_sold.toLocaleString()} Pcs
                    </td>
                    <td className="py-3.5 whitespace-nowrap text-right font-medium tabular-nums text-ink">
                      {formatMoney(product.total_earning, product.currency)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
