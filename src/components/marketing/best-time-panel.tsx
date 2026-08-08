"use client";

import { useState } from "react";
import { Clock, Loader2 } from "lucide-react";
import { useBestTimeToPost } from "@/hooks/use-merchant-queries";
import type { PostingWindow } from "@/lib/api/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EmptyPanelNote,
  formatCompact,
  kpiSurfaceClassName,
} from "@/components/marketing/viz-primitives";

function formatHour(hour: number): string {
  const suffix = hour < 12 ? "AM" : "PM";
  const display = hour % 12 === 0 ? 12 : hour % 12;

  return `${display}:00 ${suffix}`;
}

function SessionColumn({
  window: postingWindow,
  index,
}: {
  window: PostingWindow;
  index: number;
}) {
  const label =
    postingWindow.intent === "high"
      ? "High intentions"
      : postingWindow.intent === "medium"
        ? "Medium intentions"
        : "Low intentions";

  const tone =
    postingWindow.intent === "high"
      ? "text-emerald-600 dark:text-emerald-400"
      : postingWindow.intent === "medium"
        ? "text-amber-600 dark:text-amber-400"
        : "text-ink-soft";

  return (
    <div className="min-w-0 space-y-1.5 border-border/60 sm:border-l sm:pl-5 sm:first:border-l-0 sm:first:pl-0">
      <p className="text-xs text-ink-soft">Session {index + 1}</p>
      <p className={`text-sm font-semibold ${tone}`}>{label}</p>
      <p className="font-display text-2xl font-bold tabular-nums tracking-tight text-ink">
        {formatCompact(postingWindow.avg_engagement)}
      </p>
      <p className="text-xs text-ink-soft">
        avg engagement · peaks {formatHour(postingWindow.peak_hour)}
      </p>
      <p className="text-xs tabular-nums text-ink-soft">
        {postingWindow.posts} post{postingWindow.posts === 1 ? "" : "s"} ·{" "}
        {formatCompact(postingWindow.avg_reach)} reach
      </p>
    </div>
  );
}

export function BestTimePanel() {
  const [provider, setProvider] = useState<string>("all");
  const query = useBestTimeToPost(provider === "all" ? undefined : provider);
  const data = query.data;

  const sessions = (data?.windows ?? [])
    .slice()
    .sort((a, b) => {
      const rank = { high: 0, medium: 1, low: 2 } as const;
      return rank[a.intent] - rank[b.intent];
    })
    .slice(0, 3);

  const peakLabel =
    data?.confident && data.best_window
      ? formatHour(data.best_window.peak_hour)
      : null;

  return (
    <div className={kpiSurfaceClassName("relative overflow-hidden p-5 sm:p-6")}>
      {peakLabel ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-4 hidden items-center text-[4.5rem] font-bold tracking-tight text-ink/[0.04] sm:flex lg:text-[6rem]"
        >
          {peakLabel}
        </div>
      ) : null}

      <div className="relative space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-ink">Best time to post suggestion</h3>
            <p className="text-sm text-ink-soft">
              {data?.confident && data.best_window
                ? `Lead with ${data.best_window.label.toLowerCase()} — when your audience engages most.`
                : "When your audience actually shows up."}
            </p>
          </div>

          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger className="h-9 w-[160px] rounded-full bg-muted/40">
              <SelectValue placeholder="Select social media" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              <SelectItem value="facebook">Facebook</SelectItem>
              <SelectItem value="instagram">Instagram</SelectItem>
              <SelectItem value="tiktok_creator">TikTok</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {query.isLoading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" /> Working out your best windows…
          </div>
        ) : !data?.confident ? (
          <EmptyPanelNote>
            <div className="space-y-1">
              <Clock className="mx-auto h-5 w-5 text-ink-soft" />
              <p>{data?.reason ?? "Not enough history yet."}</p>
              <p className="text-xs">
                {data?.sample_size ?? 0} of {data?.min_sample ?? 8} posts with engagement so far.
              </p>
            </div>
          </EmptyPanelNote>
        ) : (
          <div className="grid gap-5 sm:grid-cols-3">
            {sessions.map((window, index) => (
              <SessionColumn key={window.label} window={window} index={index} />
            ))}
          </div>
        )}

        {data?.confident ? (
          <p className="text-xs text-ink-soft">
            Based on {data.sample_size} published posts. Averaged per post, so a window does not win
            just because you post in it more often.
          </p>
        ) : null}
      </div>
    </div>
  );
}
