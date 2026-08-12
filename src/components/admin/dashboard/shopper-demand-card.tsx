"use client";

import { MessageCircle, Sparkles } from "lucide-react";
import type { ShopperDemandSummary } from "@/lib/api/types";

function formatRelativeTime(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatBudget(value?: number | null) {
  if (value == null || value <= 0) return null;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ShopperDemandCard({
  summary,
  loading,
}: {
  summary?: ShopperDemandSummary | null;
  loading?: boolean;
}) {
  const recent = summary?.recent_requests?.slice(0, 5) ?? [];
  const topQueries = summary?.top_queries?.slice(0, 4) ?? [];
  const newCount = summary?.new_since_last_visit ?? 0;

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5 lg:p-6">
      <div className="mb-4 flex items-start justify-between gap-3 sm:mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-semibold tracking-tight sm:text-lg">
              AI shopper demand
            </h2>
            {newCount > 0 ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                {newCount} new
              </span>
            ) : null}
          </div>
          <p className="text-sm text-ink-soft">What customers asked your AI shopper for</p>
        </div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
      </div>

      {loading ? (
        <div className="h-48 animate-pulse rounded-xl bg-secondary" />
      ) : !summary?.has_activity ? (
        <div className="grid min-h-[160px] flex-1 place-items-center px-2 text-center text-sm text-ink-soft">
          When shoppers use your AI assistant, their requests will show up here so you know what to stock or promote.
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4">
          {topQueries.length > 0 ? (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
                Top searches
              </p>
              <div className="flex flex-wrap gap-2">
                {topQueries.map((item) => (
                  <span
                    key={item.query}
                    className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-xs font-medium text-ink"
                  >
                    {item.query}
                    <span className="ml-1 text-ink-soft">×{item.count}</span>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="min-h-0 flex-1">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
              Recent requests
            </p>
            <ul className="space-y-2">
              {recent.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-border bg-secondary/20 px-3 py-2.5"
                >
                  <div className="flex items-start gap-2">
                    <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-soft" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{item.message}</p>
                      <p className="mt-1 text-xs text-ink-soft">
                        {formatRelativeTime(item.logged_at)}
                        {item.budget_max ? ` · budget ${formatBudget(item.budget_max)}` : ""}
                        {item.had_recommendation ? " · matched" : " · no match"}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {(summary?.unmatched_requests?.length ?? 0) > 0 ? (
            <p className="text-xs text-amber-700">
              {summary?.unmatched_requests?.length} recent request
              {(summary?.unmatched_requests?.length ?? 0) === 1 ? "" : "s"} had no catalog match — worth checking gaps in your inventory.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
