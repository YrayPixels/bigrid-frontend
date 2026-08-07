"use client";

import { Eye, Heart, Loader2, MousePointerClick, TrendingUp, Wallet } from "lucide-react";
import { useMarketingPerformance } from "@/hooks/use-merchant-queries";
import type { SocialPost } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PROVIDER_LABEL: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok_creator: "TikTok",
};

function compact(value: number) {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function StatTile({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-1.5 text-xs text-ink-soft">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
      {hint ? <div className="text-xs text-ink-soft">{hint}</div> : null}
    </div>
  );
}

function engagementOf(post: SocialPost) {
  const insights = post.insights ?? {};
  return (
    (insights.reactions ?? 0) +
    (insights.comments ?? 0) +
    (insights.shares ?? 0) +
    (insights.saved ?? 0)
  );
}

export function PerformancePanel() {
  const performanceQuery = useMarketingPerformance();
  const data = performanceQuery.data;

  if (performanceQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-ink-soft">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading performance…
      </div>
    );
  }

  if (!data) {
    return (
      <p className="py-8 text-sm text-ink-soft">
        {(performanceQuery.error as Error | null)?.message ?? "Performance is unavailable right now."}
      </p>
    );
  }

  const { totals, ads } = data;

  if (totals.posts === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Performance</CardTitle>
          <CardDescription>
            Once you publish a post, its reach and engagement show up here.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Last {data.window_days} days
          </CardTitle>
          <CardDescription>
            {data.awaiting_first_sync
              ? "Numbers arrive within the hour — engagement is still being collected from Meta."
              : data.last_synced_at
                ? `Updated ${new Date(data.last_synced_at).toLocaleString()}`
                : "Across your published posts."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Posts published"
            value={String(totals.posts)}
            icon={<TrendingUp className="h-3 w-3" />}
          />
          <StatTile label="People reached" value={compact(totals.reach)} icon={<Eye className="h-3 w-3" />} />
          <StatTile
            label="Engagement"
            value={compact(totals.engagement)}
            icon={<Heart className="h-3 w-3" />}
            hint="Reactions, comments, shares"
          />
          <StatTile
            label="Link clicks"
            value={compact(totals.clicks)}
            icon={<MousePointerClick className="h-3 w-3" />}
          />
        </CardContent>
      </Card>

      {data.by_channel.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>By channel</CardTitle>
            <CardDescription>Where your audience is actually responding.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.by_channel.map((channel) => (
              <div
                key={channel.provider}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {PROVIDER_LABEL[channel.provider] ?? channel.provider}
                  </Badge>
                  <span className="text-xs text-ink-soft">{channel.posts} posts</span>
                </div>
                <div className="flex gap-4 text-xs text-ink-soft">
                  <span>{compact(channel.reach)} reached</span>
                  <span>{compact(channel.engagement)} engagement</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {data.top_posts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Best performing</CardTitle>
            <CardDescription>Make more like these.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.top_posts.map((post) => (
              <div key={post.id} className="flex gap-3 rounded-lg border border-border p-3">
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt=""
                    className="h-16 w-16 shrink-0 rounded-md object-cover"
                    loading="lazy"
                  />
                ) : null}
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{PROVIDER_LABEL[post.provider] ?? post.provider}</Badge>
                    <span className="text-xs text-ink-soft">
                      {post.published_at ? new Date(post.published_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm text-ink">{post.message}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-ink-soft">
                    {typeof post.insights?.reach === "number" ? (
                      <span>{compact(post.insights.reach)} reached</span>
                    ) : null}
                    <span>{compact(engagementOf(post))} engagement</span>
                    {typeof post.insights?.clicks === "number" ? (
                      <span>{compact(post.insights.clicks)} clicks</span>
                    ) : null}
                  </div>
                </div>
                {post.external_url ? (
                  <a
                    href={post.external_url}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 self-start text-xs font-medium text-primary hover:underline"
                  >
                    View
                  </a>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {ads.impressions > 0 || ads.spend > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Paid ads
            </CardTitle>
            <CardDescription>
              {ads.active_campaigns} campaign{ads.active_campaigns === 1 ? "" : "s"} currently running.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            <StatTile
              label="Spent"
              value={new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: ads.currency || "NGN",
                maximumFractionDigits: 0,
              }).format(ads.spend)}
              icon={<Wallet className="h-3 w-3" />}
            />
            <StatTile
              label="Impressions"
              value={compact(ads.impressions)}
              icon={<Eye className="h-3 w-3" />}
            />
            <StatTile
              label="Clicks"
              value={compact(ads.clicks)}
              icon={<MousePointerClick className="h-3 w-3" />}
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
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
