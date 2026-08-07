"use client";

import { useEffect, useState } from "react";
import {
  CalendarClock,
  ExternalLink,
  Eye,
  Heart,
  Loader2,
  MessageSquare,
  MousePointerClick,
  Pencil,
  Send,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import type { SocialPost } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  post: SocialPost;
  onPublish: (postId: string) => void;
  onSchedule: (postId: string, scheduledFor: string) => void;
  onUnschedule: (postId: string) => void;
  onSave: (postId: string, values: { message: string; link_url: string; image_url: string; video_url: string }) => void;
  onDelete: (postId: string) => void;
  busy?: boolean;
};

const PROVIDER_LABEL: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok_creator: "TikTok",
};

function statusBadge(status: SocialPost["status"]) {
  if (status === "published") return <Badge className="bg-emerald-600">Published</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  if (status === "publishing") return <Badge variant="secondary">Publishing</Badge>;
  if (status === "scheduled") return <Badge className="bg-sky-600">Scheduled</Badge>;
  return <Badge variant="outline">Draft</Badge>;
}

/**
 * `datetime-local` inputs speak local wall-clock time with no zone, so both
 * directions have to go through the browser's offset rather than toISOString.
 */
function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString();
}

export function SocialPostCard({
  post,
  onPublish,
  onSchedule,
  onUnschedule,
  onSave,
  onDelete,
  busy = false,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(() => toLocalInputValue(post.scheduled_for));
  const [draft, setDraft] = useState({
    message: post.message ?? "",
    link_url: post.link_url ?? "",
    image_url: post.image_url ?? "",
    video_url: post.video_url ?? "",
  });

  // The agent can replace a post underneath an open card; keep the form honest.
  useEffect(() => {
    if (editing) return;
    setDraft({
      message: post.message ?? "",
      link_url: post.link_url ?? "",
      image_url: post.image_url ?? "",
      video_url: post.video_url ?? "",
    });
    setScheduleAt(toLocalInputValue(post.scheduled_for));
  }, [editing, post.message, post.link_url, post.image_url, post.video_url, post.scheduled_for]);

  const editable = post.editable ?? ["draft", "scheduled", "failed"].includes(post.status);
  const isTikTok = post.provider === "tiktok_creator";
  const needsImage = post.provider === "instagram" && !post.image_url;
  const insights = post.insights;

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {statusBadge(post.status)}
          <Badge variant="outline">{PROVIDER_LABEL[post.provider] ?? post.provider}</Badge>
          {post.post_type === "image" ? <Badge variant="outline">Image</Badge> : null}
          {post.post_type === "video" ? <Badge variant="outline">Video</Badge> : null}
        </div>
        <span className="text-xs text-ink-soft">
          {post.status === "scheduled" && post.scheduled_for
            ? `Goes out ${new Date(post.scheduled_for).toLocaleString()}`
            : post.published_at
              ? new Date(post.published_at).toLocaleString()
              : post.created_at
                ? new Date(post.created_at).toLocaleString()
                : ""}
        </span>
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`message-${post.id}`}>Post copy</Label>
            <Textarea
              id={`message-${post.id}`}
              value={draft.message}
              onChange={(event) => setDraft((prev) => ({ ...prev, message: event.target.value }))}
              rows={5}
            />
          </div>
          {isTikTok ? (
            <div className="space-y-2">
              <Label htmlFor={`video-${post.id}`}>Video URL</Label>
              <Input
                id={`video-${post.id}`}
                value={draft.video_url}
                onChange={(event) => setDraft((prev) => ({ ...prev, video_url: event.target.value }))}
                placeholder="https://your-cdn.com/videos/promo.mp4"
              />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor={`image-${post.id}`}>Image URL</Label>
                <Input
                  id={`image-${post.id}`}
                  value={draft.image_url}
                  onChange={(event) => setDraft((prev) => ({ ...prev, image_url: event.target.value }))}
                  placeholder="https://your-cdn.com/product.jpg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`link-${post.id}`}>Link</Label>
                <Input
                  id={`link-${post.id}`}
                  value={draft.link_url}
                  onChange={(event) => setDraft((prev) => ({ ...prev, link_url: event.target.value }))}
                  placeholder="https://your-store.bizgrid.shop/products/…"
                />
              </div>
            </>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => {
                onSave(post.id, draft);
                setEditing(false);
              }}
              disabled={busy || !draft.message.trim()}
            >
              Save changes
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          {post.image_url ? (
            <img
              src={post.image_url}
              alt=""
              className="max-h-48 w-full rounded-md object-cover"
              loading="lazy"
            />
          ) : null}
          <p className="whitespace-pre-wrap text-sm text-ink">{post.message}</p>
          {post.link_url ? (
            <p className="truncate text-xs text-ink-soft">{post.link_url}</p>
          ) : null}
          {post.video_url ? (
            <p className="truncate text-xs text-ink-soft">{post.video_url}</p>
          ) : null}
        </>
      )}

      {needsImage ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-ink">
          Instagram posts need an image. Add one before publishing.
        </p>
      ) : null}

      {post.error_message ? (
        <p className="text-xs text-destructive">{post.error_message}</p>
      ) : null}

      {insights && post.status === "published" ? (
        <div className="flex flex-wrap gap-3 border-t border-border/60 pt-2 text-xs text-ink-soft">
          {typeof insights.reach === "number" ? (
            <span className="inline-flex items-center gap-1">
              <Eye className="h-3 w-3" /> {insights.reach.toLocaleString()} reached
            </span>
          ) : null}
          {typeof insights.reactions === "number" ? (
            <span className="inline-flex items-center gap-1">
              <Heart className="h-3 w-3" /> {insights.reactions.toLocaleString()}
            </span>
          ) : null}
          {typeof insights.comments === "number" ? (
            <span className="inline-flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> {insights.comments.toLocaleString()}
            </span>
          ) : null}
          {typeof insights.shares === "number" ? (
            <span className="inline-flex items-center gap-1">
              <Share2 className="h-3 w-3" /> {insights.shares.toLocaleString()}
            </span>
          ) : null}
          {typeof insights.clicks === "number" ? (
            <span className="inline-flex items-center gap-1">
              <MousePointerClick className="h-3 w-3" /> {insights.clicks.toLocaleString()} clicks
            </span>
          ) : null}
        </div>
      ) : null}

      {scheduling ? (
        <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
          <Label htmlFor={`schedule-${post.id}`}>Publish at</Label>
          <Input
            id={`schedule-${post.id}`}
            type="datetime-local"
            value={scheduleAt}
            min={toLocalInputValue(new Date().toISOString())}
            onChange={(event) => setScheduleAt(event.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={busy || !scheduleAt}
              onClick={() => {
                onSchedule(post.id, fromLocalInputValue(scheduleAt));
                setScheduling(false);
              }}
            >
              Confirm schedule
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setScheduling(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {!editing ? (
        <div className="flex flex-wrap gap-2">
          {post.status === "published" ? (
            post.external_url ? (
              <Button size="sm" variant="outline" asChild>
                <a href={post.external_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  View post
                </a>
              </Button>
            ) : null
          ) : (
            <>
              <Button
                size="sm"
                onClick={() => onPublish(post.id)}
                disabled={busy || post.status === "publishing" || needsImage}
              >
                {busy ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                )}
                Publish now
              </Button>

              {post.status === "scheduled" ? (
                <Button size="sm" variant="outline" onClick={() => onUnschedule(post.id)} disabled={busy}>
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Unschedule
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setScheduling((open) => !open)}
                  disabled={busy || needsImage}
                >
                  <CalendarClock className="mr-1.5 h-3.5 w-3.5" />
                  Schedule
                </Button>
              )}

              {editable ? (
                <Button size="sm" variant="ghost" onClick={() => setEditing(true)} disabled={busy}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
              ) : null}

              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(post.id)}
                disabled={busy}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete
              </Button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
