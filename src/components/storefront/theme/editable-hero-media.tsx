"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

type EditableHeroMediaProps = {
  imagePath: string;
  videoPath: string;
  imageSrc?: string | null;
  videoSrc?: string | null;
  alt: string;
  className?: string;
  mediaClassName?: string;
};

function isVideoFile(file: File) {
  return file.type.startsWith("video/") || /\.(mp4|webm|mov|m4v)$/i.test(file.name);
}

export function EditableHeroMedia({
  imagePath,
  videoPath,
  imageSrc,
  videoSrc,
  alt,
  className,
  mediaClassName,
}: EditableHeroMediaProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const { mode, editable } = useStorefrontTheme();
  const canEdit = mode === "edit" && !!editable?.onImageUpload;
  const hasVideo = Boolean(videoSrc);
  const hasImage = Boolean(imageSrc);
  const hasMedia = hasVideo || hasImage;

  function openPicker() {
    if (!canEdit) return;
    editable.onSelectPath?.(hasVideo ? videoPath : imagePath);
    inputRef.current?.click();
  }

  async function handleFile(file: File | undefined) {
    if (!file || !canEdit) return;

    setUploading(true);
    try {
      const path = isVideoFile(file) ? videoPath : imagePath;
      editable.onSelectPath?.(path);
      await editable.onImageUpload?.(path, file);
    } finally {
      setUploading(false);
    }
  }

  if (!hasMedia && !canEdit) return null;

  return (
    <div
      role={canEdit ? "button" : undefined}
      tabIndex={canEdit ? 0 : undefined}
      title={canEdit ? "Double-click to upload an image or video" : undefined}
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
      {hasVideo ? (
        <video
          key={videoSrc!}
          src={videoSrc!}
          poster={imageSrc ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          className={cn("h-full w-full object-cover object-center", mediaClassName)}
          aria-label={alt}
        />
      ) : hasImage ? (
        <img
          src={imageSrc!}
          alt={alt}
          className={cn("h-full w-full object-cover object-center", mediaClassName)}
        />
      ) : (
        <div className="flex h-full min-h-[20rem] flex-col items-center justify-center gap-2 border-2 border-dashed border-white/50 bg-black/20 p-6 text-center text-sm text-white">
          <ImagePlus className="h-6 w-6" />
          <span>Double-click to upload image or video</span>
        </div>
      )}
      {canEdit ? (
        <>
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/0 text-xs font-semibold uppercase tracking-wide text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
            {uploading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading
              </span>
            ) : (
              "Double-click to upload image or video"
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/mp4,video/webm,video/quicktime"
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
