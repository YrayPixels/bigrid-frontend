"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MerchantDashboardTrafficSource } from "@/lib/api/types";

const COLORS = [
  "var(--primary)",
  "oklch(0.55 0.1 230)",
  "oklch(0.7 0.12 70)",
  "oklch(0.6 0.12 20)",
];

export function TrafficCard({
  sources,
  loading,
}: {
  sources: MerchantDashboardTrafficSource[];
  loading?: boolean;
}) {
  const [range, setRange] = useState<"week" | "month">("month");
  const items = [...sources].sort((a, b) => b.count - a.count).slice(0, 3);
  const max = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5 lg:p-6">
      <div className="mb-4 flex items-start justify-between gap-3 sm:mb-5">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold tracking-tight sm:text-lg">Traffic</h2>
          <p className="text-sm text-ink-soft">Where store visitors come from</p>
        </div>
        <button
          type="button"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-secondary"
          aria-label="Traffic options"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-5 inline-flex self-start rounded-full border border-border bg-secondary/40 p-1 sm:mb-6">
        {(["week", "month"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRange(value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors sm:px-3.5",
              range === value
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-ink-soft hover:text-ink",
            )}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col justify-end">
        {loading ? (
          <div className="h-40 animate-pulse rounded-xl bg-secondary" />
        ) : items.length === 0 ? (
          <div className="grid min-h-[140px] flex-1 place-items-center px-2 text-center text-sm text-ink-soft">
            Traffic sources will appear as visitors arrive.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {items.map((item, index) => {
              const height = Math.max(24, Math.round((item.count / max) * 96));
              const color = COLORS[index % COLORS.length];
              return (
                <div key={`${range}-${item.source}`} className="flex min-w-0 flex-col items-center">
                  <div
                    className="mb-2 grid h-7 w-7 place-items-center rounded-full text-[10px] font-semibold text-white shadow-soft sm:h-8 sm:w-8 sm:text-[11px]"
                    style={{ backgroundColor: color }}
                  >
                    {item.percentage}%
                  </div>
                  <div
                    className="mb-2 w-px border-l border-dashed border-border sm:mb-3"
                    style={{ height: `${Math.max(16, 100 - height)}px` }}
                  />
                  <div
                    className="w-full max-w-[3.25rem] rounded-full sm:max-w-[4.5rem]"
                    style={{ height: `${height}px`, backgroundColor: color }}
                  />
                  <p className="mt-2 w-full truncate text-center text-[11px] font-medium text-ink sm:mt-3 sm:text-xs">
                    {item.source}
                  </p>
                  <p className="text-[10px] text-ink-soft sm:text-[11px]">
                    {item.count.toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
