"use client";

import Link from "next/link";
import { BarChart3, ExternalLink, Heart, Loader2, MessageSquare } from "lucide-react";
import { useMarketingPosts } from "@/hooks/use-merchant-queries";
import type { SocialPost } from "@/lib/api/types";
import { EmptyPanelNote, formatCompact, kpiSurfaceClassName } from "@/components/marketing/viz-primitives";

const PROVIDER_LABEL: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok_creator: "TikTok",
};

function SentimentFooter({ post }: { post: SocialPost }) {
  const sentiment = post.sentiment;

  if (!sentiment?.label || sentiment.score === null) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-ink-soft">
        <BarChart3 className="h-3.5 w-3.5" />
        {sentiment?.summary ? "Too few comments" : "Not read yet"}
      </div>
    );
  }

  const tone =
    sentiment.label === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : sentiment.label === "negative"
        ? "text-rose-600 dark:text-rose-400"
        : "text-amber-600 dark:text-amber-400";

  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium capitalize ${tone}`}>
      <BarChart3 className="h-3.5 w-3.5" />
      <span className="tabular-nums">{Number(sentiment.score).toFixed(2)}</span>
      <span>~</span>
      <span>{sentiment.label}</span>
    </div>
  );
}

function PostCard({ post }: { post: SocialPost }) {
  const insights = post.insights ?? {};
  const title =
    post.message?.trim().split("\n")[0]?.slice(0, 48) ||
    `${PROVIDER_LABEL[post.provider] ?? post.provider} post`;

  return (
    <div className="flex w-[220px] shrink-0 flex-col gap-2.5 sm:w-[240px]">
      <div className={kpiSurfaceClassName("relative overflow-hidden")}>
        {post.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.image_url} alt="" className="h-52 w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-52 w-full items-center justify-center bg-muted px-4 text-center text-xs text-ink-soft">
            No image
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 space-y-2 bg-gradient-to-t from-white via-white/95 to-transparent px-3.5 pb-3.5 pt-16 dark:from-canvas-raised dark:via-canvas-raised/95">
          <div className="space-y-1">
            <p className="line-clamp-1 text-sm font-semibold text-ink">{title}</p>
            <p className="line-clamp-2 text-[11px] leading-relaxed text-ink-soft">
              {post.message?.trim() || "Published post"}
            </p>
          </div>
          <div className="flex items-center gap-4 text-ink">
            <span className="inline-flex items-center gap-1.5">
              <Heart className="h-3.5 w-3.5 text-ink-soft" />
              <span className="text-sm font-semibold tabular-nums">
                {formatCompact(insights.reactions ?? 0)}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-ink-soft" />
              <span className="text-sm font-semibold tabular-nums">
                {formatCompact(insights.comments ?? 0)}
              </span>
            </span>
            {post.external_url ? (
              <a
                href={post.external_url}
                target="_blank"
                rel="noreferrer"
                className="ml-auto text-ink-soft hover:text-primary"
                aria-label="Open post"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <SentimentFooter post={post} />
    </div>
  );
}

export function PostsPerformanceStrip({ provider }: { provider?: string }) {
  const postsQuery = useMarketingPosts("published");
  const posts = (postsQuery.data?.posts ?? []).filter((post) =>
    !provider || provider === "all" ? true : post.provider === provider,
  );

  return (
    <section className="space-y-4">
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
        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
          {posts.slice(0, 12).map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </section>
  );
}
