"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCcw, Send, Wallet } from "lucide-react";
import { merchantInvalidators, useMarketingPerformance } from "@/hooks/use-merchant-queries";
import { AudiencePanels } from "@/components/marketing/audience-panels";
import { BestTimePanel } from "@/components/marketing/best-time-panel";
import { PostsPerformanceStrip } from "@/components/marketing/posts-performance-strip";
import { StatTile, VizTokens, formatCompact } from "@/components/marketing/viz-primitives";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Windows the merchant can scope every panel to. */
const PERIODS = [
  { label: "Weekly", days: 7 },
  { label: "Monthly", days: 30 },
  { label: "Quarterly", days: 90 },
  { label: "Yearly", days: 365 },
] as const;

const CHANNEL_LABEL: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok_creator: "TikTok",
};

export function MarketingDashboard() {
  const queryClient = useQueryClient();
  const [windowDays, setWindowDays] = useState<number>(30);

  const performanceQuery = useMarketingPerformance(windowDays);
  const performance = performanceQuery.data;

  const totals = performance?.totals;
  const deltas = performance?.deltas;
  const ads = performance?.ads;

  const periodLabel =
    PERIODS.find((p) => p.days === windowDays)?.label.toLowerCase() ?? "period";

  return (
    <div className="viz-scope space-y-5">
      <VizTokens />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="font-display text-xl font-bold text-ink">Key performance indicator</h2>
          <p className="text-sm text-ink-soft">Key metrics that define your overall performance.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full border border-border bg-canvas-raised p-0.5">
            {PERIODS.map((period) => (
              <button
                key={period.days}
                type="button"
                onClick={() => setWindowDays(period.days)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  windowDays === period.days
                    ? "bg-primary text-primary-foreground"
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

      {performanceQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="flex h-24 items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-ink-soft" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Posts published"
              value={String(totals?.posts ?? 0)}
              delta={deltas?.posts}
              hint={`vs previous ${periodLabel}`}
            />
            <StatTile
              label="People reached"
              value={formatCompact(totals?.reach ?? 0)}
              delta={deltas?.reach}
              hint={`vs previous ${periodLabel}`}
            />
            <StatTile
              label="Engagement"
              value={formatCompact(totals?.engagement ?? 0)}
              delta={deltas?.engagement}
              hint="Reactions, comments, shares"
            />
            <StatTile
              label="Link clicks"
              value={formatCompact(totals?.clicks ?? 0)}
              delta={deltas?.clicks}
              hint={`vs previous ${periodLabel}`}
            />
          </div>

          {performance?.awaiting_first_sync ? (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-ink">
              Engagement numbers arrive within the hour — Meta is still collecting them for your
              most recent posts.
            </p>
          ) : null}

          {!performance?.has_comparison && (totals?.posts ?? 0) > 0 ? (
            <p className="text-xs text-ink-soft">
              No earlier {periodLabel} to compare against yet, so change is shown as “—”.
            </p>
          ) : null}
        </>
      )}

      <AudiencePanels />

      {performance && performance.by_channel.length > 0 ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-ink">By channel</h3>
              <span className="text-xs text-ink-soft">Reach this {periodLabel}</span>
            </div>
            <div className="space-y-2.5">
              {performance.by_channel.map((channel) => {
                const peak = Math.max(...performance.by_channel.map((c) => c.reach), 1);

                return (
                  <div key={channel.provider} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="text-ink">
                        {CHANNEL_LABEL[channel.provider] ?? channel.provider}
                      </span>
                      <span className="tabular-nums text-ink-soft">
                        {formatCompact(channel.reach)} reached
                        <span className="ml-2 text-xs">{channel.posts} posts</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max((channel.reach / peak) * 100, 2)}%`,
                          background: "var(--viz-magnitude)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <PostsPerformanceStrip />

      <div className="grid gap-4 lg:grid-cols-2">
        <BestTimePanel />

        {ads && (ads.impressions > 0 || ads.spend > 0) ? (
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
                    <Wallet className="h-4 w-4" />
                    Paid ads
                  </h3>
                  <p className="text-sm text-ink-soft">
                    {ads.active_campaigns} campaign{ads.active_campaigns === 1 ? "" : "s"} running.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <StatTile
                  label="Spent"
                  value={new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: ads.currency || "NGN",
                    maximumFractionDigits: 0,
                  }).format(ads.spend)}
                />
                <StatTile label="Impressions" value={formatCompact(ads.impressions)} />
                <StatTile
                  label="Clicks"
                  value={formatCompact(ads.clicks)}
                  hint={
                    ads.clicks > 0 && ads.spend > 0
                      ? `${new Intl.NumberFormat(undefined, {
                          style: "currency",
                          currency: ads.currency || "NGN",
                          maximumFractionDigits: 2,
                        }).format(ads.spend / ads.clicks)} per click`
                      : undefined
                  }
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex h-full flex-col justify-center gap-3 p-5 text-center">
              <Wallet className="mx-auto h-5 w-5 text-ink-soft" />
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-ink">No paid ads running</h3>
                <p className="text-sm text-ink-soft">
                  Boost a post with a paid campaign to reach beyond your followers.
                </p>
              </div>
              <Button size="sm" variant="outline" className="mx-auto" asChild>
                <a href="/admin/marketing/ads">
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Set up ads
                </a>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
