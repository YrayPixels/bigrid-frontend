"use client";

import { useState } from "react";
import { Clock, Loader2 } from "lucide-react";
import { useBestTimeToPost } from "@/hooks/use-merchant-queries";
import type { PostingWindow } from "@/lib/api/types";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyPanelNote, PanelHeading, formatCompact } from "@/components/marketing/viz-primitives";

function formatHour(hour: number): string {
  const suffix = hour < 12 ? "am" : "pm";
  const display = hour % 12 === 0 ? 12 : hour % 12;

  return `${display}${suffix}`;
}

/**
 * Intent is a state, not a series, so it uses reserved status colours and
 * always ships with its written label beside the bar.
 */
function WindowRow({ window: postingWindow }: { window: PostingWindow }) {
  const tone =
    postingWindow.intent === "high"
      ? "bg-emerald-500"
      : postingWindow.intent === "medium"
        ? "bg-amber-500"
        : "bg-slate-400";

  const label =
    postingWindow.intent === "high"
      ? "High intent"
      : postingWindow.intent === "medium"
        ? "Medium intent"
        : "Low intent";

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-ink">{postingWindow.label}</span>
          <span className="text-xs text-ink-soft">peaks {formatHour(postingWindow.peak_hour)}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-soft">
          <span>{label}</span>
          <span className="tabular-nums">
            {formatCompact(postingWindow.avg_engagement)} avg
          </span>
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${Math.max(postingWindow.intensity, 2)}%` }}
        />
      </div>
      <div className="text-[11px] text-ink-soft">
        {postingWindow.posts} post{postingWindow.posts === 1 ? "" : "s"} ·{" "}
        {formatCompact(postingWindow.avg_reach)} avg reach
      </div>
    </div>
  );
}

export function BestTimePanel() {
  const [provider, setProvider] = useState<string>("all");
  const query = useBestTimeToPost(provider === "all" ? undefined : provider);
  const data = query.data;

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <PanelHeading
          title="Best time to post"
          hero={
            data?.confident && data.best_window
              ? `${data.best_window.label}, ${formatHour(data.best_window.peak_hour)}`
              : undefined
          }
          caption={data?.confident ? "When your audience engages most" : undefined}
          action={
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok_creator">TikTok</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        {query.isLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-ink-soft">
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
          <div className="space-y-4">
            {data.windows.map((window) => (
              <WindowRow key={window.label} window={window} />
            ))}
            <p className="text-xs text-ink-soft">
              Based on {data.sample_size} published posts. Averaged per post, so a window does not
              win just because you post in it more often.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
