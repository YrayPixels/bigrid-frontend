"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { ImagePlus, Loader2, Download, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { StorefrontApiError, storefrontApi } from "@/lib/api/storefront";
import type { StoreProduct, TryOnSession } from "@/lib/api/types";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import {
  fileToDataUrl,
  GARMENT_CATEGORY_OPTIONS,
  getTryOnMode,
  loadSavedTryOnLook,
  photoTipForMode,
  saveTryOnLook,
  type GarmentCategory,
} from "@/lib/storefront/try-on";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const BAG_STYLES = [
  { value: "random", label: "Surprise me" },
  { value: "style_parisian_chic", label: "Parisian" },
  { value: "style_urban_chic", label: "Urban" },
  { value: "style_mediterranean_chic", label: "Mediterranean" },
  { value: "style_art_deco_style", label: "Art deco" },
] as const;

type Step = "photo" | "options" | "generating" | "result" | "error";

type FittingSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: StoreProduct;
  onAddToCart: () => void;
  onBuyNow: () => void;
};

function isGarmentCategory(value: string): value is GarmentCategory {
  return GARMENT_CATEGORY_OPTIONS.some((option) => option.value === value);
}

export function FittingSheet({
  open,
  onOpenChange,
  product,
  onAddToCart,
  onBuyNow,
}: FittingSheetProps) {
  const isMobile = useIsMobile();
  const { store } = useStorefront();
  const { theme } = useStorefrontTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const mode = getTryOnMode(product);
  const isClothes = mode === "clothes";
  const askGender = !isClothes && (product.try_on?.bag_gender_default ?? "ask") === "ask";
  const defaultGender =
    product.try_on?.bag_gender_default === "male" ||
    product.try_on?.bag_gender_default === "female"
      ? product.try_on.bag_gender_default
      : "female";
  const defaultStyle = product.try_on?.bag_style ?? "random";
  const defaultGarment: GarmentCategory =
    product.try_on?.garment_category && isGarmentCategory(product.try_on.garment_category)
      ? product.try_on.garment_category
      : "auto";

  const [step, setStep] = useState<Step>("photo");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [srcDataUrl, setSrcDataUrl] = useState<string | null>(null);
  const [srcFile, setSrcFile] = useState<File | null>(null);
  const [savedLook, setSavedLook] = useState<string | null>(null);
  const [gender, setGender] = useState<"female" | "male">(defaultGender);
  const [style, setStyle] = useState(defaultStyle);
  const [garmentCategory, setGarmentCategory] = useState<GarmentCategory>(defaultGarment);
  const [session, setSession] = useState<TryOnSession | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [savingImage, setSavingImage] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSavedLook(loadSavedTryOnLook(store.slug, mode)?.dataUrl ?? null);
    setStep("photo");
    setPreviewUrl(null);
    setSrcDataUrl(null);
    setSrcFile(null);
    setGender(defaultGender);
    setStyle(defaultStyle);
    setGarmentCategory(defaultGarment);
    setSession(null);
    setErrorMessage(null);
    setSubmitting(false);
    setDragActive(false);
  }, [open, store.slug, mode, defaultGender, defaultStyle, defaultGarment]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage("Photo must be under 10MB.");
      setStep("error");
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setSrcFile(file);
      setSrcDataUrl(dataUrl);
      setPreviewUrl(dataUrl);
      setErrorMessage(null);
      setStep("options");
    } catch {
      setErrorMessage("Could not read that photo.");
      setStep("error");
    }
  }

  function useSavedLook() {
    if (!savedLook) return;
    setSrcFile(null);
    setSrcDataUrl(savedLook);
    setPreviewUrl(savedLook);
    setStep("options");
  }

  function clearPhoto() {
    setSrcFile(null);
    setSrcDataUrl(null);
    setPreviewUrl(null);
    setStep("photo");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onDragEnter(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }

  function onDragOver(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!dragActive) setDragActive(true);
  }

  function onDragLeave(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    const next = event.relatedTarget as Node | null;
    if (next && event.currentTarget.contains(next)) return;
    setDragActive(false);
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0] ?? null;
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please drop a photo (JPG, PNG, or WebP).");
      setStep("error");
      return;
    }
    void handleFile(file);
  }

  async function startTryOn() {
    if (!srcDataUrl && !srcFile) {
      setErrorMessage("Add a photo to continue.");
      setStep("error");
      return;
    }

    setSubmitting(true);
    setStep("generating");
    setErrorMessage(null);
    stopPolling();

    try {
      const { session: created } = await storefrontApi.createTryOnSession(store.slug, {
        product_id: product.id,
        gender: isClothes ? undefined : gender,
        style: isClothes ? undefined : style,
        garment_category: isClothes ? garmentCategory : undefined,
        src_image: srcFile ?? undefined,
        src_image_url: srcFile ? undefined : (srcDataUrl ?? undefined),
      });

      if (srcDataUrl) saveTryOnLook(store.slug, srcDataUrl, mode);
      setSession(created);

      if (created.status === "success") {
        setStep("result");
        setSubmitting(false);
        return;
      }
      if (created.status === "error") {
        setErrorMessage(created.error_message ?? "Couldn't create this look — try a different photo.");
        setStep("error");
        setSubmitting(false);
        return;
      }

      pollRef.current = setInterval(async () => {
        try {
          const { session: next } = await storefrontApi.getTryOnSession(store.slug, created.id);
          setSession(next);
          if (next.status === "success") {
            stopPolling();
            setStep("result");
            setSubmitting(false);
          } else if (next.status === "error") {
            stopPolling();
            setErrorMessage(
              next.error_message ?? "Couldn't create this look — try a different photo.",
            );
            setStep("error");
            setSubmitting(false);
          }
        } catch (err) {
          stopPolling();
          const message =
            err instanceof StorefrontApiError
              ? err.message
              : "Still working — refresh or try again in a moment.";
          setErrorMessage(message);
          setStep("error");
          setSubmitting(false);
        }
      }, 2000);
    } catch (err) {
      const message =
        err instanceof StorefrontApiError
          ? err.message
          : "Couldn't create this look — try a different photo.";
      setErrorMessage(message);
      setStep("error");
      setSubmitting(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) stopPolling();
    onOpenChange(next);
  }

  async function saveResultImage() {
    const resultUrl = session?.result_url;
    if (!resultUrl || savingImage) return;

    setSavingImage(true);
    const safeName =
      product.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "try-on";
    const filename = `${safeName}-try-on.png`;

    try {
      const res = await fetch(resultUrl, { mode: "cors" });
      if (!res.ok) throw new Error("Could not download image.");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("Image saved.");
    } catch {
      // Cross-origin / CORS fallback — open so the shopper can save manually.
      window.open(resultUrl, "_blank", "noopener,noreferrer");
      toast.message("Opened image in a new tab — long-press or right-click to save.");
    } finally {
      setSavingImage(false);
    }
  }

  const tip = photoTipForMode(mode, isClothes ? garmentCategory : null);
  const showOptions = step === "options" && Boolean(previewUrl);

  const photoPanel = previewUrl ? (
    <div
      className="group relative overflow-hidden rounded-2xl"
      style={{ backgroundColor: theme.palette.surface }}
    >
      <div className="relative aspect-[3/4] w-full max-h-[26rem] sm:max-h-[32rem]">
        <img src={previewUrl} alt="Your look" className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/55 via-black/25 to-transparent px-3 pb-3 pt-10">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-neutral-900 shadow-sm backdrop-blur-sm transition hover:bg-white"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Replace
          </button>
          <button
            type="button"
            onClick={clearPhoto}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow-sm backdrop-blur-sm transition hover:bg-white"
            aria-label="Remove photo"
          >
            <X className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      </div>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => fileInputRef.current?.click()}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex min-h-[14rem] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center transition duration-200 sm:min-h-[16rem]",
        "focus-visible:outline-none",
        dragActive && "scale-[1.01]",
      )}
      style={{
        borderColor: dragActive ? theme.palette.primary : theme.palette.border,
        backgroundColor: dragActive ? `${theme.palette.primary}12` : theme.palette.surface,
        color: theme.palette.text,
        boxShadow: dragActive ? `0 0 0 3px ${theme.palette.primary}22` : undefined,
      }}
    >
      <span
        className="grid h-12 w-12 place-items-center rounded-full"
        style={{
          backgroundColor: dragActive ? `${theme.palette.primary}22` : `${theme.palette.primary}14`,
          color: theme.palette.primary,
        }}
      >
        <ImagePlus className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className="space-y-1">
        <span className="block text-sm font-semibold tracking-tight">
          {dragActive ? "Drop photo to upload" : "Drop a photo here, or click to browse"}
        </span>
        <span
          className="mx-auto block max-w-[22rem] text-xs leading-relaxed"
          style={{ color: theme.palette.muted }}
        >
          {tip}
        </span>
      </span>
      <span
        className="text-[11px] font-medium uppercase tracking-[0.08em]"
        style={{ color: theme.palette.muted }}
      >
        JPG · PNG · WebP · up to 10MB
      </span>
    </button>
  );

  const optionsPanel = showOptions ? (
    <div className="flex h-full flex-col space-y-5 sm:justify-between">
      <div className="space-y-5">
        {isClothes ? (
          <div>
            <p className="mb-2 text-sm font-semibold">Garment type</p>
            <p className="mb-3 text-xs leading-relaxed" style={{ color: theme.palette.muted }}>
              This describes the product — not the height of your photo. For dresses, upload a
              full-body shot to see the whole look.
            </p>
            <div className="flex flex-wrap gap-2">
              {GARMENT_CATEGORY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setGarmentCategory(option.value)}
                  className={cn(
                    "rounded-full border px-3.5 py-2 text-xs font-medium",
                    garmentCategory === option.value && "ring-2 ring-offset-1",
                  )}
                  style={{
                    borderColor: theme.palette.border,
                    ...(garmentCategory === option.value
                      ? {
                          backgroundColor: theme.palette.primary,
                          color: theme.palette.background,
                        }
                      : {}),
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {askGender ? (
              <div>
                <p className="mb-2 text-sm font-semibold">Gender</p>
                <div className="flex gap-2">
                  {(["female", "male"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setGender(value)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-medium capitalize",
                        gender === value && "ring-2 ring-offset-2",
                      )}
                      style={{
                        borderColor: theme.palette.border,
                        ...(gender === value
                          ? {
                              backgroundColor: theme.palette.primary,
                              color: theme.palette.background,
                            }
                          : {}),
                      }}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-sm font-semibold">Style</p>
              <div className="flex flex-wrap gap-2">
                {BAG_STYLES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStyle(option.value)}
                    className={cn(
                      "rounded-full border px-3.5 py-2 text-xs font-medium",
                      style === option.value && "ring-2 ring-offset-1",
                    )}
                    style={{
                      borderColor: theme.palette.border,
                      ...(style === option.value
                        ? {
                            backgroundColor: theme.palette.primary,
                            color: theme.palette.background,
                          }
                        : {}),
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        disabled={submitting}
        onClick={() => void startTryOn()}
        className="w-full rounded-full px-6 py-3.5 text-sm font-semibold tracking-tight disabled:opacity-50"
        style={{
          backgroundColor: theme.palette.primary,
          color: theme.palette.background,
        }}
      >
        Create my look
      </button>
    </div>
  ) : null;

  const body = (
    <>
      {step === "photo" || step === "options" ? (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
          />

          <div
            className={cn(
              showOptions
                ? "grid gap-5 sm:gap-6 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:items-stretch"
                : "space-y-4",
            )}
          >
            <div className="space-y-3">
              {photoPanel}
              {!previewUrl && savedLook ? (
                <button
                  type="button"
                  onClick={useSavedLook}
                  className="flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition hover:bg-black/[0.02]"
                  style={{ borderColor: theme.palette.border }}
                >
                  <img
                    src={savedLook}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-xl object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">Use my saved look</span>
                    <span className="block text-xs" style={{ color: theme.palette.muted }}>
                      Skip upload and continue with your last photo
                    </span>
                  </span>
                </button>
              ) : null}
            </div>
            {optionsPanel}
          </div>
        </>
      ) : null}

      {step === "generating" ? (
        <div className="flex flex-col items-center gap-4 py-14 text-center">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: theme.palette.primary }} />
          <div>
            <p className="font-semibold">Creating your look…</p>
            <p className="mt-1 text-sm" style={{ color: theme.palette.muted }}>
              Usually under a minute.
            </p>
          </div>
          {product.image_url ? (
            <img
              src={product.image_url}
              alt=""
              className="h-20 w-20 rounded-lg object-cover opacity-80"
            />
          ) : null}
        </div>
      ) : null}

      {step === "result" && session?.result_url ? (
        <div className="mx-auto grid w-full max-w-3xl gap-6 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:items-start">
          <div
            className="relative overflow-hidden rounded-2xl border"
            style={{ borderColor: theme.palette.border }}
          >
            <img
              src={session.result_url}
              alt={`${product.name} try-on preview`}
              className="w-full object-cover"
            />
            <button
              type="button"
              onClick={() => void saveResultImage()}
              disabled={savingImage}
              className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-neutral-900 shadow-sm backdrop-blur-sm transition hover:bg-white disabled:opacity-60"
              aria-label="Save image"
            >
              {savingImage ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Save
            </button>
          </div>
          <div className="space-y-4 md:pt-1">
            <div>
              <p className="text-base font-semibold tracking-tight">{product.name}</p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: theme.palette.muted }}>
                {session.stub
                  ? "Demo preview (stub mode) — turn off PERFECTCORP_STUB to use live AI."
                  : "AI preview — color and fit may vary."}
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  onAddToCart();
                  onOpenChange(false);
                }}
                className="rounded-full px-6 py-3 text-sm font-semibold"
                style={{
                  backgroundColor: theme.palette.primary,
                  color: theme.palette.background,
                }}
              >
                Add to cart
              </button>
              <button
                type="button"
                onClick={() => {
                  onBuyNow();
                  onOpenChange(false);
                }}
                className="rounded-full border px-6 py-3 text-sm font-semibold"
                style={{ borderColor: theme.palette.primary, color: theme.palette.primary }}
              >
                Buy now
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                onClick={() => void saveResultImage()}
                disabled={savingImage}
                className="inline-flex items-center gap-1.5 text-sm font-medium underline-offset-2 hover:underline disabled:opacity-60"
                style={{ color: theme.palette.text }}
              >
                {savingImage ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Save image
              </button>
              <button
                type="button"
                onClick={() => setStep("photo")}
                className="text-sm font-medium underline-offset-2 hover:underline"
                style={{ color: theme.palette.muted }}
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {step === "error" ? (
        <div className="space-y-4 py-6 text-center">
          <p className="text-sm font-medium">{errorMessage}</p>
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setStep(previewUrl ? "options" : "photo");
            }}
            className="rounded-full px-6 py-3 text-sm font-semibold"
            style={{
              backgroundColor: theme.palette.primary,
              color: theme.palette.background,
            }}
          >
            Try again
          </button>
        </div>
      ) : null}
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          side="bottom"
          className="mx-auto flex max-h-[92vh] w-full max-w-xl flex-col overflow-y-auto rounded-t-2xl border-border bg-background p-5"
          style={{ color: theme.palette.text }}
        >
          <SheetHeader className="pr-8 text-left">
            <SheetTitle>Try it on</SheetTitle>
            <SheetDescription>
              See {product.name} on you. Your photo is used only to create this preview.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-5 space-y-5">{body}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[90vh] w-[min(92vw,56rem)] max-w-[min(92vw,56rem)] flex-col overflow-y-auto rounded-2xl border-border bg-background p-6 sm:max-w-3xl md:max-w-4xl",
        )}
        style={{ color: theme.palette.text }}
      >
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>Try it on</DialogTitle>
          <DialogDescription>
            See {product.name} on you. Your photo is used only to create this preview.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-5">{body}</div>
      </DialogContent>
    </Dialog>
  );
}
