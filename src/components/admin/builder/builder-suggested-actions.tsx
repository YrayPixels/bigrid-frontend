"use client";

import { ExternalLink, ImageIcon, ImagePlus, MessageSquare, Palette } from "lucide-react";
import Link from "next/link";
import type { BuilderMediaTarget, BuilderSuggestedAction } from "@/lib/api/types";

export function BuilderSuggestedActions({
  actions,
  disabled,
  onPrompt,
  onColor,
  onUpload,
  onApplyImage,
}: {
  actions: BuilderSuggestedAction[];
  disabled?: boolean;
  onPrompt: (message: string) => void;
  onColor: (color: string, label: string) => void;
  onUpload: (target: BuilderMediaTarget) => void;
  onApplyImage?: (target: BuilderMediaTarget, url: string, label: string) => void;
}) {
  if (!actions.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Suggested next steps</p>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => {
          if (action.type === "link") {
            return (
              <Link
                key={`link-${action.href}-${action.label}`}
                href={action.href}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs text-ink-soft hover:border-primary/40 hover:text-ink"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {action.label}
              </Link>
            );
          }

          if (action.type === "color") {
            return (
              <button
                key={`color-${action.color}-${action.label}`}
                type="button"
                disabled={disabled}
                onClick={() => onColor(action.color, action.label)}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-2.5 py-1.5 text-left text-xs text-ink hover:border-primary/40 disabled:opacity-50"
              >
                <span
                  className="h-4 w-4 shrink-0 rounded-full border border-black/10 shadow-inner"
                  style={{ backgroundColor: action.color }}
                  aria-hidden
                />
                <Palette className="h-3 w-3 text-ink-soft" />
                <span>{action.label}</span>
              </button>
            );
          }

          if (action.type === "upload") {
            return (
              <button
                key={`upload-${action.target}-${action.label}`}
                type="button"
                disabled={disabled}
                onClick={() => onUpload(action.target)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs text-ink-soft hover:border-primary/40 hover:text-ink disabled:opacity-50"
              >
                <ImagePlus className="h-3.5 w-3.5" />
                {action.label}
              </button>
            );
          }

          if (action.type === "image") {
            return (
              <button
                key={`image-${action.target}-${action.url}`}
                type="button"
                disabled={disabled || !onApplyImage}
                onClick={() => onApplyImage?.(action.target, action.url, action.label)}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-2.5 py-1.5 text-left text-xs text-ink hover:border-primary/40 disabled:opacity-50"
              >
                <span className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full border border-black/10">
                  <img src={action.url} alt="" className="h-full w-full object-cover" />
                </span>
                <ImageIcon className="h-3 w-3 text-ink-soft" />
                <span>{action.label}</span>
              </button>
            );
          }

          return (
            <button
              key={`prompt-${action.message}`}
              type="button"
              disabled={disabled}
              onClick={() => onPrompt(action.message)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs text-ink-soft hover:border-primary/40 hover:text-ink disabled:opacity-50"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BuilderColorFeedback({
  colors,
  activeColor,
}: {
  colors: string[];
  activeColor?: string | null;
}) {
  if (!colors.length) return null;

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
      <span className="text-xs font-medium text-ink-soft">Brand colors</span>
      {colors.map((color) => (
        <span
          key={color}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] ${
            activeColor?.toLowerCase() === color.toLowerCase()
              ? "border-primary bg-primary/10 text-ink"
              : "border-border text-ink-soft"
          }`}
        >
          <span
            className="h-3.5 w-3.5 rounded-full border border-black/10"
            style={{ backgroundColor: color }}
          />
          {color}
        </span>
      ))}
    </div>
  );
}
