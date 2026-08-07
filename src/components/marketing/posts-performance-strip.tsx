"use client";

import Link from "next/link";
import { BarChart3, ExternalLink, Heart, Loader2, MessageSquare, TrendingUp } from "lucide-react";
import { useMarketingPosts } from "@/hooks/use-merchant-queries";
import type { SocialPost } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { EmptyPanelNote, formatCompact } from "@/components/marketing/viz-primitives";

const PROVIDER_LABEL: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok_creator: "TikTok",
};

/**
 * Sentiment is a status, not a series — reserved colours, and always shipped
 * with an icon and a written label so it never depends on colour alone.
 */
function SentimentPill({ post }: { post: SocialPost }) {
  const sentiment = post.sentiment;

  if (!sentiment?.label || sentiment.score === null) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-xs text-ink-soft">
        <BarChart3 className="h-3 w-3" />
        {sentiment?.summary ? "Too few comments" : "Not read yet"}
      </span>
    );
  }

  const tone =
    sentiment.label === "positive"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : sentiment.label === "negative"
        ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
        : "bg-amber-500/10 text-amber-700 dark:text-amber-400";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium capitalize ${tone}`}
      title={sentiment.summary || undefined}
    >
      <BarChart3 className="h-3 w-3" />
      {sentiment.score} · {sentiment.label}
    </span>
  );
}

function PostCard({ post }: { post: SocialPost }) {
  const insights = post.insights ?? {};
  const engagement =
    (insights.reactions ?? 0) + (insights.comments ?? 0) + (insights.shares ?? 0) + (insights.saved ?? 0);

  return (
    <div className="flex w-64 shrink-0 flex-col gap-2">
      <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
        {post.image_url ? (
          <img src={post.image_url} alt="" className="h-44 w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-44 w-full items-center justify-center px-4 text-center text-xs text-ink-soft">
            No image
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 space-y-1.5 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8">
          <p className="line-clamp-2 text-xs font-medium leading-snug text-white">{post.message}</p>
          <div className="flex items-center gap-3 text-[11px] text-white/90">
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3 w-3" />
              {formatCompact(insights.reactions ?? 0)}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {formatCompact(insights.comments ?? 0)}
            </span>
            <span className="inline-flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {formatCompact(insights.reach ?? 0)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <SentimentPill post={post} />
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">
            {PROVIDER_LABEL[post.provider] ?? post.provider}
          </Badge>
          {post.external_url ? (
            <a
              href={post.external_url}
              target="_blank"
              rel="noreferrer"
              className="text-ink-soft hover:text-primary"
              aria-label="Open post"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      </div>

      <div className="text-[11px] text-ink-soft">
        {formatCompact(engagement)} engagement
        {post.published_at ? ` · ${new Date(post.published_at).toLocaleDateString()}` : ""}
      </div>
    </div>
  );
}

export function PostsPerformanceStrip() {
  const postsQuery = useMarketingPosts("published");
  const posts = postsQuery.data?.posts ?? [];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">Posts performance</h2>
        <Link
          href="/admin/marketing/content"
          className="text-sm font-medium text-primary hover:underline"
        >
          All posts
        </Link>
      </div>

      {postsQuery.isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading posts…
        </div>
      ) : posts.length === 0 ? (
        <EmptyPanelNote>
          Nothing published yet. Once posts go out, how each one performed shows up here.
        </EmptyPanelNote>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {posts.slice(0, 12).map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}
