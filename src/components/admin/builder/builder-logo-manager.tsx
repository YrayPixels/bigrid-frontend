"use client";

import { useRef } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function BuilderLogoManager({
  businessName,
  logoUrl,
  brandColor,
  disabled,
  onUpload,
  onRemove,
}: {
  businessName: string;
  logoUrl: string | null;
  brandColor: string;
  disabled?: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    if (disabled) return;
    inputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || disabled) return;
    onUpload(file);
  }

  const initial = businessName.trim().slice(0, 1).toUpperCase() || "B";

  return (
    <div className="shrink-0 border-b border-border px-4 py-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={openPicker}
          className={cn(
            "group relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-border bg-background transition hover:border-primary/40",
            disabled && "opacity-50",
          )}
          aria-label={logoUrl ? "Change logo" : "Upload logo"}
          title={logoUrl ? "Change logo" : "Upload logo"}
        >
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span
              className="grid h-full w-full place-items-center text-sm font-bold text-white"
              style={{ backgroundColor: brandColor }}
            >
              {initial}
            </span>
          )}
          <span className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 transition group-hover:opacity-100">
            <ImagePlus className="h-4 w-4 text-white" />
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-ink">Store logo</p>
          <p className="truncate text-[11px] text-ink-soft">
            {logoUrl ? "Shown in your site header" : "Upload a logo for your header"}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={openPicker}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium text-ink-soft transition hover:border-primary/40 hover:text-ink disabled:opacity-50"
          >
            {disabled ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
            {logoUrl ? "Change" : "Upload"}
          </button>
          {logoUrl ? (
            <button
              type="button"
              disabled={disabled}
              onClick={onRemove}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-medium text-ink-soft transition hover:border-destructive/40 hover:text-destructive disabled:opacity-50"
              aria-label="Remove logo"
            >
              <Trash2 className="h-3 w-3" />
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
