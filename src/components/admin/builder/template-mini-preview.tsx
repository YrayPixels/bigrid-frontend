"use client";

import { Sparkles } from "lucide-react";
import type { StorefrontTemplatePreview } from "@/lib/api/types";

const FASHION_TEMPLATE_THUMBNAIL =
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80";

export function TemplateMiniPreview({
  variant,
  brandColor,
}: {
  variant: StorefrontTemplatePreview;
  brandColor: string;
}) {
  if (variant === "spark") {
    return (
      <div className="h-24 overflow-hidden rounded-lg border border-border bg-background p-3">
        <div className="flex h-full items-center justify-center rounded-md bg-secondary">
          <Sparkles className="h-6 w-6" style={{ color: brandColor }} />
        </div>
      </div>
    );
  }

  if (variant === "lookbook") {
    return (
      <div className="h-24 overflow-hidden rounded-lg border border-border bg-background p-2">
        <div className="grid h-full grid-rows-[0.2fr_1fr_0.28fr] gap-1">
          <div className="h-2 rounded-sm bg-ink" />
          <div className="relative overflow-hidden rounded-md bg-[#a7aaa5]">
            <img
              src={FASHION_TEMPLATE_THUMBNAIL}
              alt=""
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-black/15" />
            <div className="absolute inset-x-0 top-3 mx-auto h-2 w-24 rounded bg-white/80" />
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="rounded-sm bg-secondary" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "beauty") {
    return (
      <div className="h-24 overflow-hidden rounded-lg border border-[#f0d6d0] bg-[#fff7f3] p-2">
        <div className="grid h-full grid-rows-[1fr_0.75fr] gap-2">
          <div className="relative overflow-hidden rounded-xl bg-[#e6a79f]/30">
            <div className="absolute left-3 top-3 h-4 w-20 rounded-full bg-white/80" />
            <div className="absolute bottom-2 right-3 h-12 w-12 rounded-full bg-[#6f2f2b]/80" />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((item) => (
              <div key={item} className="rounded-lg bg-white p-1">
                <div className="h-5 rounded-md bg-[#e6a79f]/30" />
                <div className="mt-1 h-1.5 rounded bg-[#6f2f2b]/20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "cosmetics") {
    return (
      <div className="h-24 overflow-hidden rounded-lg border border-[#e2e6d9] bg-white p-2">
        <div className="grid h-full grid-cols-[1.2fr_0.8fr] gap-2">
          <div className="relative overflow-hidden bg-[#fff2df] p-2">
            <div className="h-2 w-12 rounded bg-[#82934c]/80" />
            <div className="mt-2 h-4 w-16 rounded bg-[#82934c]/30" />
            <div className="absolute bottom-2 right-2 h-12 w-8 rounded-t-full bg-white shadow-sm" />
          </div>
          <div className="grid gap-1.5">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex items-center gap-1 bg-[#f4f6f1] p-1">
                <div className="h-6 w-4 rounded-t-full bg-white" />
                <div className="h-1.5 flex-1 rounded bg-[#82934c]/30" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div className="h-24 overflow-hidden rounded-lg border border-border bg-[#fbfbdc] p-2">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: brandColor }} />
            <span className="h-2 w-10 rounded bg-[#073e3f]/20" />
          </div>
          <span className="h-3 w-10 rounded-full" style={{ backgroundColor: brandColor }} />
        </div>
        <div className="rounded-t-xl bg-white p-2">
          <div className="mx-auto h-2 w-20 rounded bg-[#073e3f]/20" />
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="space-y-1 rounded bg-[#f0f0f0] p-1">
                <div className="h-6 rounded bg-[#dfe7cf]" />
                <div className="h-1.5 rounded bg-[#073e3f]/20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-24 overflow-hidden rounded-lg border border-border bg-background p-3">
      <div className="h-3 w-20 rounded" style={{ backgroundColor: brandColor }} />
      <div className="mt-3 h-3 w-28 rounded bg-secondary" />
      <div className="mt-2 h-2 w-36 rounded bg-secondary" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="h-6 rounded bg-secondary" />
        <div className="h-6 rounded bg-secondary" />
        <div className="h-6 rounded bg-secondary" />
      </div>
    </div>
  );
}
