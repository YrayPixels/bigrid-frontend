"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

type EditableImageProps = {
  path?: string;
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  placeholderClassName?: string;
};

export function EditableImage({
  path,
  src,
  alt,
  className,
  imgClassName,
  placeholderClassName,
}: EditableImageProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const { mode, editable } = useStorefrontTheme();
  const canEdit = mode === "edit" && !!path && !!editable?.onImageUpload;

  function openPicker() {
    if (!canEdit || !path) return;
    editable.onSelectPath?.(path);
    inputRef.current?.click();
  }

  async function handleFile(file: File | undefined) {
    if (!file || !canEdit || !path) return;

    setUploading(true);
    try {
      await editable.onImageUpload?.(path, file);
    } finally {
      setUploading(false);
    }
  }

  if (!src && !canEdit) return null;

  return (
    <div
      role={canEdit ? "button" : undefined}
      tabIndex={canEdit ? 0 : undefined}
      title={canEdit ? "Double-click to upload an image" : undefined}
      onDoubleClick={openPicker}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openPicker();
        }
      }}
      className={cn(
        "relative overflow-hidden",
        canEdit && "group cursor-pointer outline-none ring-primary/30 focus:ring-2",
        className,
      )}
    >
      {src ? (
        <img src={src} alt={alt} className={cn("h-full w-full object-cover", imgClassName)} />
      ) : (
        <div
          className={cn(
            "flex h-full min-h-40 flex-col items-center justify-center gap-2 border-2 border-dashed border-primary/40 bg-primary/5 p-6 text-center text-sm text-ink-soft",
            placeholderClassName,
          )}
        >
          <ImagePlus className="h-6 w-6" />
          <span>Double-click to upload image</span>
        </div>
      )}
      {canEdit ? (
        <>
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/0 text-xs font-semibold uppercase tracking-wide text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
            {uploading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading
              </span>
            ) : (
              "Double-click to upload"
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              handleFile(event.target.files?.[0]);
              event.currentTarget.value = "";
            }}
          />
        </>
      ) : null}
    </div>
  );
}
