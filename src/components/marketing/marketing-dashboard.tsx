"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCcw } from "lucide-react";
import { merchantInvalidators, useMarketingPerformance } from "@/hooks/use-merchant-queries";
import { AudiencePanels } from "@/components/marketing/audience-panels";
import { BestTimePanel } from "@/components/marketing/best-time-panel";
import { PostsPerformanceStrip } from "@/components/marketing/posts-performance-strip";
import {
  StatTile,
  VizTokens,
  formatCompact,
  kpiSurfaceClassName,
} from "@/components/marketing/viz-primitives";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PERIODS = [
  { label: "Weekly", days: 7 },
  { label: "Monthly", days: 30 },
  { label: "Quarterly", days: 90 },
  { label: "Yearly", days: 365 },
] as const;

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "NGN",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${formatCompact(amount)}`;
  }
}

export function MarketingDashboard() {
  const queryClient = useQueryClient();
  const [windowDays, setWindowDays] = useState<number>(30);
  const [channelFilter, setChannelFilter] = useState<string>("all");

  const performanceQuery = useMarketingPerformance(windowDays);
  const performance = performanceQuery.data;

  const totals = performance?.totals;
  const deltas = performance?.deltas;
  const ads = performance?.ads;
  const outcomes = performance?.outcomes;

  const periodLabel =
    PERIODS.find((p) => p.days === windowDays)?.label.toLowerCase() ?? "period";
  const currency = outcomes?.currency || ads?.currency || "NGN";

  const adRoasLabel =
    ads?.roas != null
      ? `${ads.roas.toFixed(1)}x`
      : ads && ads.purchases > 0
        ? formatCompact(ads.purchases)
        : "—";

  const adRoasHint =
    ads?.roas != null
      ? "Reported by Meta"
      : ads && ads.purchases > 0
        ? `${formatCompact(ads.purchases)} purchases · Meta`
        : "Reported by Meta";

  return (
    <div className="viz-scope space-y-5">
      <VizTokens />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-display text-xl font-bold text-ink">Key performance indicator</h2>
          <p className="text-sm text-ink-soft">
            Key metrics that define your overall performance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full border border-border bg-canvas-raised p-0.5 shadow-sm">
            {PERIODS.map((period) => (
              <button
                key={period.days}
                type="button"
                onClick={() => setWindowDays(period.days)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
                  windowDays === period.days
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-ink-soft hover:text-ink",
                )}
              >
                {period.label}
              </button>
            ))}
          </div>

          <Button
            size="sm"
            variant="outline"
            className="h-9 rounded-full"
            onClick={() => merchantInvalidators.marketing(queryClient)}
            disabled={performanceQuery.isFetching}
          >
            {performanceQuery.isFetching ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="h-9 w-[180px] rounded-full bg-canvas-raised shadow-sm">
            <SelectValue placeholder="Select social media" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="tiktok_creator">TikTok</SelectItem>
          </SelectContent>
        </Select>
        <span className="inline-flex h-9 items-center rounded-full border border-border bg-canvas-raised px-3 text-xs text-ink-soft shadow-sm">
          Audience filters sync from Meta
        </span>
      </div>

      {/* Revenue folded into the hero surface — same chrome as the age/country cards. */}
      <div className={kpiSurfaceClassName("p-5")}>
        {performanceQuery.isLoading ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-border/60">
              <StatTile
                label="Attributed revenue"
                value={formatMoney(outcomes?.attributed_revenue ?? 0, currency)}
                hint={
                  (outcomes?.attributed_orders ?? 0) === 1
                    ? "1 order · tracked in your store"
                    : `${outcomes?.attributed_orders ?? 0} orders · tracked in your store`
                }
              />
              <div className="lg:pl-4">
                <StatTile
                  label="Recovered revenue"
                  value={formatMoney(outcomes?.recovered_revenue ?? 0, currency)}
                  hint={
                    (outcomes?.recovered_orders ?? 0) > 0
                      ? `${outcomes?.recovered_orders} recovered · your store`
                      : "From abandoned cart outreach"
                  }
                />
              </div>
              <div className="lg:pl-4">
                <StatTile
                  label={ads?.roas != null ? "Ad ROAS" : "Ad purchases"}
                  value={adRoasLabel}
                  hint={adRoasHint}
                />
              </div>
              <div className="lg:pl-4">
                <StatTile
                  label="Link clicks"
                  value={formatCompact(totals?.clicks ?? 0)}
                  delta={deltas?.clicks}
                  hint={`vs previous ${periodLabel}`}
                />
              </div>
            </div>
            <p className="text-xs text-ink-soft">
              Attributed revenue is last-touch from marketing links. Ad purchases and ROAS are
              reported by Meta.{" "}
              <Link href="/admin/marketing/recovery" className="underline underline-offset-2">
                Review abandoned carts
              </Link>
            </p>
            {performance?.awaiting_first_sync ? (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-ink">
                Engagement numbers arrive within the hour — Meta is still collecting them for your
                most recent posts.
              </p>
            ) : null}
          </div>
        )}
      </div>

      <AudiencePanels />

      <PostsPerformanceStrip provider={channelFilter} />

      <BestTimePanel />
    </div>
  );
}
