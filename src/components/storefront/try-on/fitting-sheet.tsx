"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) stopPolling();
        onOpenChange(next);
      }}
    >
      <SheetContent
        side="bottom"
        className="mx-auto flex max-h-[92vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl border-border bg-background p-5 sm:max-w-xl"
        style={{ color: theme.palette.text }}
      >
        <SheetHeader className="pr-8 text-left">
          <SheetTitle>Try it on</SheetTitle>
          <SheetDescription>
            See {product.name} on you. Your photo is used only to create this preview.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          {step === "photo" || step === "options" ? (
            <>
              <div
                className="flex aspect-[3/4] max-h-72 items-center justify-center overflow-hidden rounded-xl border"
                style={{ borderColor: theme.palette.border, backgroundColor: theme.palette.surface }}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Your look" className="h-full w-full object-cover" />
                ) : (
                  <div className="px-6 text-center text-sm" style={{ color: theme.palette.muted }}>
                    {photoTipForMode(mode)}
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
              />

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
                  style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
                >
                  <Upload className="h-4 w-4" />
                  {previewUrl ? "Change photo" : "Upload photo"}
                </button>
                {savedLook ? (
                  <button
                    type="button"
                    onClick={useSavedLook}
                    className="rounded-full border px-4 py-2.5 text-sm font-semibold"
                    style={{ borderColor: theme.palette.border, color: theme.palette.text }}
                  >
                    Use my saved look
                  </button>
                ) : null}
              </div>

              {step === "options" && previewUrl ? (
                <div className="space-y-4">
                  {isClothes ? (
                    <div>
                      <p className="mb-2 text-sm font-semibold">Garment type</p>
                      <div className="flex flex-wrap gap-2">
                        {GARMENT_CATEGORY_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setGarmentCategory(option.value)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs font-medium",
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
                                "rounded-full border px-3 py-1.5 text-xs font-medium",
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

                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => void startTryOn()}
                    className="w-full rounded-full px-6 py-3 text-sm font-semibold disabled:opacity-50"
                    style={{
                      backgroundColor: theme.palette.primary,
                      color: theme.palette.background,
                    }}
                  >
                    Create my look
                  </button>
                </div>
              ) : null}
            </>
          ) : null}

          {step === "generating" ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
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
            <div className="space-y-4">
              <div
                className="overflow-hidden rounded-xl border"
                style={{ borderColor: theme.palette.border }}
              >
                <img
                  src={session.result_url}
                  alt={`${product.name} try-on preview`}
                  className="w-full object-cover"
                />
              </div>
              <p className="text-xs" style={{ color: theme.palette.muted }}>
                AI preview — color and fit may vary.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
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
              <button
                type="button"
                onClick={() => setStep("photo")}
                className="w-full text-sm font-medium underline-offset-2 hover:underline"
                style={{ color: theme.palette.muted }}
              >
                Try again
              </button>
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
        </div>
      </SheetContent>
    </Sheet>
  );
}
