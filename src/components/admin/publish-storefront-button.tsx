"use client";

import { Loader2, Rocket } from "lucide-react";
import type { Store, StorefrontPublishState } from "@/lib/api/types";

export function publishStatusLabel(publish: StorefrontPublishState | null | undefined): string {
  if (!publish) return "Draft";
  if (!publish.is_published) return "Not live yet";
  if (publish.has_unpublished_changes) return "Unpublished changes";
  return "Live";
}

export function PublishStorefrontButton({
  store,
  publish,
  publishing,
  disabled,
  onPublish,
  className = "",
}: {
  store: Store | null;
  publish: StorefrontPublishState | null | undefined;
  publishing?: boolean;
  disabled?: boolean;
  onPublish: () => void;
  className?: string;
}) {
  if (!store) return null;

  const canPublish = !!publish?.has_unpublished_changes || !publish?.is_published;

  return (
    <button
      type="button"
      onClick={onPublish}
      disabled={disabled || publishing || !canPublish}
      className={`inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90 disabled:opacity-60 ${className}`}
    >
      {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
      {publish?.is_published ? "Publish changes" : "Publish storefront"}
    </button>
  );
}

export function PublishStatusBadge({
  publish,
}: {
  publish: StorefrontPublishState | null | undefined;
}) {
  const label = publishStatusLabel(publish);
  const isLive = publish?.is_published && !publish?.has_unpublished_changes;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        isLive ? "bg-primary/10 text-primary" : "bg-secondary text-ink-soft"
      }`}
    >
      {label}
    </span>
  );
}
