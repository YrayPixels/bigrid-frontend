"use client";

import type { MerchantDashboardStatusCount } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const TONES = ["bg-primary/35", "bg-primary/65", "bg-primary"] as const;

export function ProductSalesCard({
  rows,
  loading,
}: {
  rows: MerchantDashboardStatusCount[];
  loading?: boolean;
}) {
  const max = Math.max(...rows.map((row) => row.count), 1);

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5 lg:p-6">
      <div className="mb-5 flex items-start justify-between gap-3 sm:mb-6">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold tracking-tight sm:text-lg">
            Product sales
          </h2>
          <p className="text-sm text-ink-soft">Orders by fulfillment stage</p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs text-ink-soft sm:px-3">
          All time
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-center gap-5 sm:gap-7">
        {loading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse rounded-lg bg-secondary" />
          ))
        ) : rows.every((row) => row.count === 0) ? (
          <p className="text-sm text-ink-soft">Order stages will populate as checkouts come in.</p>
        ) : (
          rows.map((row, index) => {
            const pct = Math.round((row.count / max) * 100);
            return (
              <div key={row.status} className="space-y-2.5">
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-ink">{row.label}</p>
                  <div className="flex shrink-0 items-center gap-2 text-sm">
                    <span className="font-semibold tabular-nums">{row.count.toLocaleString()}</span>
                    <span className="text-xs font-medium text-emerald-600">{pct}%</span>
                  </div>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700",
                      TONES[index % TONES.length],
                    )}
                    style={{ width: `${Math.min(100, Math.max(row.count > 0 ? 8 : 0, pct))}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
