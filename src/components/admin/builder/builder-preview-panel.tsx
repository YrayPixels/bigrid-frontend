"use client";

import Link from "next/link";
import { ExternalLink, Loader2, Sparkles } from "lucide-react";
import { GeneratingSkeleton } from "@/components/storefront/generating-skeleton";
import { StorefrontPreview } from "@/components/storefront/storefront-preview";
import type { Store, StorefrontContent } from "@/lib/api/types";
import { getStorefrontUrl } from "@/lib/store-host";

export function BuilderPreviewPanel({
  store,
  storefront,
  generating,
}: {
  store: Store | null;
  storefront: StorefrontContent | null;
  generating: boolean;
}) {
  if (generating) {
    return (
      <div className="flex h-full min-h-[560px] flex-col rounded-2xl border border-border bg-card shadow-soft">
        <PreviewHeader store={store} storefront={null} />
        <div className="flex-1 p-4">
          <GeneratingSkeleton />
        </div>
      </div>
    );
  }

  if (!store || !storefront) {
    return (
      <div className="flex h-full min-h-[560px] flex-col rounded-2xl border border-dashed border-border bg-card/60 shadow-soft">
        <PreviewHeader store={store} storefront={null} />
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold">Live preview</h3>
          <p className="mt-2 max-w-sm text-sm text-ink-soft">
            Chat through your business details, pick a template, and generate a draft to preview your
            storefront here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[560px] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <PreviewHeader store={store} storefront={storefront} />
      <div className="flex-1 overflow-auto bg-secondary/40 p-4">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-xl border border-border bg-background shadow-soft">
          <StorefrontPreview store={store} content={storefront} />
        </div>
      </div>
    </div>
  );
}

function PreviewHeader({
  store,
  storefront,
}: {
  store: Store | null;
  storefront: StorefrontContent | null;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-ink-soft">Preview</div>
        <h3 className="font-display text-lg font-semibold">
          {store?.business_name ?? "Your storefront"}
        </h3>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {storefront ? (
          <Link
            href="/admin/website"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-ink hover:bg-secondary"
          >
            Open full editor
          </Link>
        ) : null}
        {store ? (
          <a
            href={getStorefrontUrl(store.slug)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-ink hover:bg-secondary"
          >
            <ExternalLink className="h-4 w-4" />
            View live
          </a>
        ) : null}
        {storefront ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            Draft ready
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-ink-soft">
            <Loader2 className="h-3 w-3" />
            Waiting for draft
          </span>
        )}
      </div>
    </div>
  );
}
