"use client";

import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import {
  merchantCache,
  merchantInvalidators,
  useMarketingPosts,
  useMarketingStatus,
} from "@/hooks/use-merchant-queries";
import type { SocialPost } from "@/lib/api/types";
import { PostComposer } from "@/components/marketing/post-composer";
import { SocialPostCard } from "@/components/marketing/social-post-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Everything that happens to a post between "the agent wrote it" and "it went
 * out". Self-contained so it can render both as a tab inside the marketing
 * page and as its own route in the sidebar.
 */
export function ContentPanel() {
  const queryClient = useQueryClient();
  const statusQuery = useMarketingStatus();

  // Each list is queried on its own status. Slicing one capped "recent posts"
  // array client-side meant a merchant with a pile of drafts saw an empty
  // Published section even with plenty of published posts.
  const draftsQuery = useMarketingPosts("draft");
  const failedQuery = useMarketingPosts("failed");
  const scheduledQuery = useMarketingPosts("scheduled");
  const publishedQuery = useMarketingPosts("published");

  const publishPost = useMutation({
    mutationFn: (postId: string) => api.publishMarketingPost(postId),
    onSuccess: (data) => {
      toast.success(data.message);
      merchantCache.setMarketingStatus(queryClient, data);
      void merchantInvalidators.marketing(queryClient);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const schedulePost = useMutation({
    mutationFn: ({ postId, scheduledFor }: { postId: string; scheduledFor: string }) =>
      api.scheduleMarketingPost(postId, scheduledFor),
    onSuccess: (data) => {
      toast.success(data.message);
      void merchantInvalidators.marketing(queryClient);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const unschedulePost = useMutation({
    mutationFn: (postId: string) => api.unscheduleMarketingPost(postId),
    onSuccess: (data) => {
      toast.success(data.message);
      void merchantInvalidators.marketing(queryClient);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const savePost = useMutation({
    mutationFn: ({
      postId,
      values,
    }: {
      postId: string;
      values: { message: string; link_url: string; image_url: string; video_url: string };
    }) =>
      api.updateMarketingPost(postId, {
        message: values.message,
        link_url: values.link_url || null,
        image_url: values.image_url || null,
        video_url: values.video_url || null,
      }),
    onSuccess: (data) => {
      toast.success(data.message);
      void merchantInvalidators.marketing(queryClient);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deletePost = useMutation({
    mutationFn: (postId: string) => api.deleteMarketingPost(postId),
    onSuccess: (data) => {
      toast.success(data.message);
      void merchantInvalidators.marketing(queryClient);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const drafts = useMemo(
    () => [...(draftsQuery.data?.posts ?? []), ...(failedQuery.data?.posts ?? [])],
    [draftsQuery.data?.posts, failedQuery.data?.posts],
  );
  const scheduled = scheduledQuery.data?.posts ?? [];
  const published = publishedQuery.data?.posts ?? [];

  const busy =
    publishPost.isPending || schedulePost.isPending || savePost.isPending || deletePost.isPending;

  const handlers = {
    onPublish: (postId: string) => publishPost.mutate(postId),
    onSchedule: (postId: string, scheduledFor: string) => schedulePost.mutate({ postId, scheduledFor }),
    onUnschedule: (postId: string) => unschedulePost.mutate(postId),
    onSave: (
      postId: string,
      values: { message: string; link_url: string; image_url: string; video_url: string },
    ) => savePost.mutate({ postId, values }),
    onDelete: (postId: string) => deletePost.mutate(postId),
    busy,
  };

  const loadingLists = draftsQuery.isLoading || publishedQuery.isLoading;

  return (
    <div className="space-y-4">
      {statusQuery.data ? <PostComposer status={statusQuery.data} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Waiting for review</CardTitle>
          <CardDescription>
            Drafts the assistant wrote for you. Nothing is posted until you publish or schedule it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingLists ? (
            <div className="flex items-center gap-2 text-sm text-ink-soft">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading drafts…
            </div>
          ) : drafts.length === 0 ? (
            <p className="text-sm text-ink-soft">
              No drafts right now. Ask the assistant for a post and it will show up here.
            </p>
          ) : (
            drafts.map((post: SocialPost) => (
              <SocialPostCard key={post.id} post={post} {...handlers} />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Scheduled
          </CardTitle>
          <CardDescription>Posts queued to go out automatically.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {scheduled.length === 0 ? (
            <p className="text-sm text-ink-soft">Nothing scheduled yet.</p>
          ) : (
            scheduled.map((post: SocialPost) => (
              <SocialPostCard key={post.id} post={post} {...handlers} />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Published</CardTitle>
          <CardDescription>How your recent posts performed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {published.length === 0 ? (
            <p className="text-sm text-ink-soft">Nothing published yet.</p>
          ) : (
            published.map((post: SocialPost) => (
              <SocialPostCard key={post.id} post={post} {...handlers} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
