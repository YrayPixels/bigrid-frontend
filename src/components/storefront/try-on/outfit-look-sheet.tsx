"use client";

import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { Download, ImagePlus, Loader2, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { StorefrontApiError, storefrontApi } from "@/lib/api/storefront";
import type { ShoppingLook, ShoppingLookItem, TryOnSession } from "@/lib/api/types";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import {
  defaultOutfitGender,
  lookCurrency,
  lookItemsTotal,
  lookItemUnitPrice,
  outfitNeedsGender,
  outfitPhotoTip,
  orderOutfitTryOnItems,
  outfitModeForPhoto,
  tryOnEligibleLookItems,
} from "@/lib/storefront/outfit-look";
import { formatMoney } from "@/lib/storefront/format";
import {
  fileToDataUrl,
  getTryOnMode,
  loadSavedTryOnLook,
  saveTryOnLook,
  usesGenderStyle,
} from "@/lib/storefront/try-on";
import { waitForTryOnSession } from "@/lib/storefront/try-on-session";
import { useCustomerAuthOptional } from "@/lib/storefront/customer-auth";
import { TryOnSignInDialog } from "@/components/storefront/try-on/product-try-on-cta";
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

type Step = "photo" | "generating" | "result" | "error";

type OutfitLookSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  look: ShoppingLook;
  items: ShoppingLookItem[];
  preferTryOn?: boolean;
  onAddToCart: (resultUrl?: string | null) => void;
  onBuyNow: (resultUrl?: string | null) => void;
};

export function OutfitLookSheet({
  open,
  onOpenChange,
  look,
  items,
  preferTryOn = true,
  onAddToCart,
  onBuyNow,
}: OutfitLookSheetProps) {
  const isMobile = useIsMobile();
  const { store } = useStorefront();
  const { theme } = useStorefrontTheme();
  const customerAuth = useCustomerAuthOptional();
  const customer = customerAuth?.customer ?? null;
  const requireCustomerAuth = customerAuth !== null;
  const [signInOpen, setSignInOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const tryOnItems = useMemo(
    () => orderOutfitTryOnItems(tryOnEligibleLookItems(store, items)),
    [items, store],
  );
  const canTryOn = tryOnItems.length > 0;
  const photoMode = outfitModeForPhoto(tryOnItems);
  const askGender = outfitNeedsGender(tryOnItems);
  const defaultGender = defaultOutfitGender(tryOnItems);
  const total = lookItemsTotal(items);
  const currency = lookCurrency(look, items);
  const pieceLabel = `${items.length} piece${items.length === 1 ? "" : "s"}`;

  const [step, setStep] = useState<Step>(canTryOn && preferTryOn ? "photo" : "result");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [srcDataUrl, setSrcDataUrl] = useState<string | null>(null);
  const [srcFile, setSrcFile] = useState<File | null>(null);
  const [savedLook, setSavedLook] = useState<string | null>(null);
  const [gender, setGender] = useState<"female" | "male">(defaultGender);
  const [session, setSession] = useState<TryOnSession | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [skippedNames, setSkippedNames] = useState<string[]>([]);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [progressIndex, setProgressIndex] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [savingImage, setSavingImage] = useState(false);

  useEffect(() => {
    if (!open) return;
    abortRef.current?.abort();
    abortRef.current = null;
    setSavedLook(loadSavedTryOnLook(store.slug, photoMode)?.dataUrl ?? null);
    setStep(canTryOn && preferTryOn ? "photo" : "result");
    setPreviewUrl(null);
    setSrcDataUrl(null);
    setSrcFile(null);
    setGender(defaultGender);
    setSession(null);
    setErrorMessage(null);
    setSkippedNames([]);
    setProgressLabel(null);
    setProgressIndex(0);
    setDragActive(false);
  }, [open, store.slug, photoMode, canTryOn, defaultGender, preferTryOn]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

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
  }

  function clearPhoto() {
    setSrcFile(null);
    setSrcDataUrl(null);
    setPreviewUrl(null);
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

  async function startOutfitTryOn() {
    if (!canTryOn) {
      setStep("result");
      return;
    }
    if (requireCustomerAuth && !customer) {
      setSignInOpen(true);
      return;
    }
    if (!srcDataUrl && !srcFile) {
      setErrorMessage("Add a photo to continue.");
      setStep("error");
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStep("generating");
    setErrorMessage(null);
    setSkippedNames([]);
    setSession(null);

    if (srcDataUrl) saveTryOnLook(store.slug, srcDataUrl, photoMode);

    let currentSrcUrl: string | undefined = srcFile ? undefined : (srcDataUrl ?? undefined);
    let currentFile: File | undefined = srcFile ?? undefined;
    let lastSession: TryOnSession | null = null;
    const skipped: string[] = [];

    try {
      for (let index = 0; index < tryOnItems.length; index += 1) {
        if (controller.signal.aborted) return;
        const item = tryOnItems[index];
        const product = item.product;
        setProgressIndex(index + 1);
        setProgressLabel(
          tryOnItems.length === 1
            ? `Creating your look with ${product.name}…`
            : `Adding ${product.name} (${index + 1} of ${tryOnItems.length})…`,
        );

        const mode = getTryOnMode(product);
        const { session: created } = await storefrontApi.createTryOnSession(store.slug, {
          product_id: product.id,
          gender: usesGenderStyle(mode) ? gender : undefined,
          style: usesGenderStyle(mode) ? (product.try_on?.bag_style ?? "random") : undefined,
          garment_category: mode === "clothes" ? (product.try_on?.garment_category ?? "auto") : undefined,
          src_image: currentFile,
          src_image_url: currentFile ? undefined : currentSrcUrl,
        });

        const finished = await waitForTryOnSession(store.slug, created, { signal: controller.signal });
        if (finished.status === "success" && finished.result_url) {
          lastSession = finished;
          currentSrcUrl = finished.result_url;
          currentFile = undefined;
        } else {
          skipped.push(product.name);
          if (!lastSession && index === 0) {
            setErrorMessage(
              finished.error_message ?? "Couldn't create this look — try a different photo.",
            );
            setStep("error");
            return;
          }
        }
      }

      if (!lastSession?.result_url) {
        setErrorMessage("Couldn't create this look — try a different photo.");
        setStep("error");
        return;
      }

      setSkippedNames(skipped);
      setSession(lastSession);
      setStep("result");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const message =
        err instanceof StorefrontApiError
          ? err.message
          : "Couldn't create this look — try a different photo.";
      setErrorMessage(message);
      setStep("error");
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) abortRef.current?.abort();
    onOpenChange(next);
  }

  async function saveResultImage() {
    const resultUrl = session?.result_url;
    if (!resultUrl || savingImage) return;

    setSavingImage(true);
    const safeName =
      look.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "outfit-look";
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
      window.open(resultUrl, "_blank", "noopener,noreferrer");
      toast.message("Opened image in a new tab — long-press or right-click to save.");
    } finally {
      setSavingImage(false);
    }
  }

  const resultUrl = session?.result_url ?? null;
  const collage = items
    .map((item) => item.product.image_url || item.product.images?.[0] || null)
    .filter((url): url is string => Boolean(url));

  const purchaseActions = (
    <div className="grid gap-2 sm:grid-cols-2">
      <button
        type="button"
        onClick={() => {
          onAddToCart(resultUrl);
          onOpenChange(false);
        }}
        className="rounded-full px-6 py-3 text-sm font-semibold"
        style={{
          backgroundColor: theme.palette.primary,
          color: theme.palette.background,
        }}
      >
        Add look to cart
      </button>
      <button
        type="button"
        onClick={() => {
          onBuyNow(resultUrl);
          onOpenChange(false);
        }}
        className="rounded-full border px-6 py-3 text-sm font-semibold"
        style={{ borderColor: theme.palette.primary, color: theme.palette.primary }}
      >
        Buy this look
      </button>
    </div>
  );

  const itemList = (
    <ul className="divide-y rounded-2xl border" style={{ borderColor: theme.palette.border }}>
      {items.map((item) => {
        const product = item.product;
        const image = product.image_url || product.images?.[0] || null;
        return (
          <li key={item.product_id} className="flex gap-3 px-3 py-2.5">
            <div
              className="relative h-14 w-12 shrink-0 overflow-hidden rounded-lg"
              style={{ backgroundColor: `${theme.palette.muted}22` }}
            >
              {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{product.name}</p>
              <p className="mt-0.5 text-xs" style={{ color: theme.palette.muted }}>
                {formatMoney(lookItemUnitPrice(product), product.currency || currency)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );

  const photoPanel = previewUrl ? (
    <div className="group relative overflow-hidden rounded-2xl" style={{ backgroundColor: theme.palette.surface }}>
      <div className="relative aspect-[3/4] w-full max-h-[26rem] sm:max-h-[32rem]">
        <img src={previewUrl} alt="Your photo" className="h-full w-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/55 via-black/25 to-transparent px-3 pb-3 pt-10">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-neutral-900 shadow-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Replace
          </button>
          <button
            type="button"
            onClick={clearPhoto}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow-sm"
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
        dragActive && "scale-[1.01]",
      )}
      style={{
        borderColor: dragActive ? theme.palette.primary : theme.palette.border,
        backgroundColor: dragActive ? `${theme.palette.primary}12` : theme.palette.surface,
        color: theme.palette.text,
      }}
    >
      <span
        className="grid h-12 w-12 place-items-center rounded-full"
        style={{
          backgroundColor: `${theme.palette.primary}14`,
          color: theme.palette.primary,
        }}
      >
        <ImagePlus className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <span className="space-y-1">
        <span className="block text-sm font-semibold tracking-tight">
          {dragActive ? "Drop photo to upload" : "Drop a photo here, or click to browse"}
        </span>
        <span className="mx-auto block max-w-[22rem] text-xs leading-relaxed" style={{ color: theme.palette.muted }}>
          {outfitPhotoTip(tryOnItems)}
        </span>
      </span>
    </button>
  );

  const body = (
    <>
      {step === "photo" ? (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            className="hidden"
            onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
          />
          <div className="grid gap-5 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:items-start">
            <div className="space-y-3">
              {photoPanel}
              {!previewUrl && savedLook ? (
                <button
                  type="button"
                  onClick={useSavedLook}
                  className="flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left"
                  style={{ borderColor: theme.palette.border }}
                >
                  <img src={savedLook} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">Use my saved look</span>
                    <span className="block text-xs" style={{ color: theme.palette.muted }}>
                      Skip upload and continue with your last photo
                    </span>
                  </span>
                </button>
              ) : null}
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.palette.muted }}>
                  Your look
                </p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight" style={{ fontFamily: theme.displayFont }}>
                  {look.name}
                </h3>
                <p className="mt-1 text-sm" style={{ color: theme.palette.muted }}>
                  {pieceLabel} · {formatMoney(total, currency)}
                </p>
              </div>
              {itemList}
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
              <button
                type="button"
                disabled={!previewUrl}
                onClick={() => void startOutfitTryOn()}
                className="w-full rounded-full px-6 py-3.5 text-sm font-semibold tracking-tight disabled:opacity-50"
                style={{
                  backgroundColor: theme.palette.primary,
                  color: theme.palette.background,
                }}
              >
                {tryOnItems.length > 1 ? "Create this look on me" : "Create my look"}
              </button>
              <p className="text-xs" style={{ color: theme.palette.muted }}>
                Or skip the preview and buy the {pieceLabel} together.
              </p>
              {purchaseActions}
            </div>
          </div>
        </>
      ) : null}

      {step === "generating" ? (
        <div className="flex flex-col items-center gap-4 py-14 text-center">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: theme.palette.primary }} />
          <div>
            <p className="font-semibold">{progressLabel ?? "Creating your look…"}</p>
            <p className="mt-1 text-sm" style={{ color: theme.palette.muted }}>
              {tryOnItems.length > 1
                ? `Layering ${tryOnItems.length} pieces — usually a couple of minutes.`
                : "Usually under a minute."}
            </p>
          </div>
          {tryOnItems[Math.max(0, progressIndex - 1)]?.product.image_url ? (
            <img
              src={tryOnItems[Math.max(0, progressIndex - 1)].product.image_url ?? ""}
              alt=""
              className="h-20 w-20 rounded-lg object-cover opacity-80"
            />
          ) : null}
        </div>
      ) : null}

      {step === "result" ? (
        <div className="mx-auto grid w-full max-w-3xl gap-6 md:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] md:items-start">
          <div
            className="relative overflow-hidden rounded-2xl border"
            style={{ borderColor: theme.palette.border }}
          >
            {resultUrl ? (
              <img src={resultUrl} alt={`${look.name} try-on preview`} className="w-full object-cover" />
            ) : collage.length > 0 ? (
              <div className={cn("grid aspect-[3/4]", collage.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                {collage.slice(0, 4).map((url) => (
                  <img key={url} src={url} alt="" className="h-full w-full object-cover" />
                ))}
              </div>
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center text-sm" style={{ color: theme.palette.muted }}>
                Your look
              </div>
            )}
            {resultUrl ? (
              <button
                type="button"
                onClick={() => void saveResultImage()}
                disabled={savingImage}
                className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-neutral-900 shadow-sm disabled:opacity-60"
                aria-label="Save image"
              >
                {savingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                Save
              </button>
            ) : null}
          </div>
          <div className="space-y-4 md:pt-1">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.palette.muted }}>
                Your look
              </p>
              <p className="mt-1 text-base font-semibold tracking-tight">{look.name}</p>
              <p className="mt-1 text-sm" style={{ color: theme.palette.muted }}>
                {pieceLabel} · {formatMoney(total, currency)}
                {session?.stub ? " · demo preview" : resultUrl ? " · AI preview — color and fit may vary" : ""}
              </p>
              {skippedNames.length > 0 ? (
                <p className="mt-2 text-xs" style={{ color: theme.palette.muted }}>
                  Couldn’t apply {skippedNames.join(", ")} — the rest of the look is ready.
                </p>
              ) : null}
            </div>
            {itemList}
            {purchaseActions}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {resultUrl ? (
                <button
                  type="button"
                  onClick={() => void saveResultImage()}
                  disabled={savingImage}
                  className="inline-flex items-center gap-1.5 text-sm font-medium underline-offset-2 hover:underline disabled:opacity-60"
                >
                  {savingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                  Save image
                </button>
              ) : null}
              {canTryOn ? (
                <button
                  type="button"
                  onClick={() => setStep("photo")}
                  className="text-sm font-medium underline-offset-2 hover:underline"
                  style={{ color: theme.palette.muted }}
                >
                  {resultUrl ? "Try again" : "See it on you"}
                </button>
              ) : null}
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
              setStep("photo");
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

  const lookUi = isMobile ? (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto flex max-h-[92vh] w-full max-w-xl flex-col overflow-y-auto rounded-t-2xl border-border bg-background p-5"
        style={{ color: theme.palette.text }}
      >
        <SheetHeader className="pr-8 text-left">
          <SheetTitle>{look.name}</SheetTitle>
          <SheetDescription>
            {canTryOn
              ? "See the full outfit on you, then add every piece to your bag."
              : "Review this look and pay for every piece together."}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-5 space-y-5">{body}</div>
      </SheetContent>
    </Sheet>
  ) : (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] w-[min(92vw,56rem)] max-w-[min(92vw,56rem)] flex-col overflow-y-auto rounded-2xl border-border bg-background p-6 sm:max-w-3xl md:max-w-4xl"
        style={{ color: theme.palette.text }}
      >
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>{look.name}</DialogTitle>
          <DialogDescription>
            {canTryOn
              ? "See the full outfit on you, then add every piece to your bag."
              : "Review this look and pay for every piece together."}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 space-y-5">{body}</div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      {lookUi}
      <TryOnSignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        onContinue={() => {
          if (typeof window === "undefined") {
            customerAuth?.signInWithGoogle();
            return;
          }
          const ret = new URL(window.location.href);
          ret.searchParams.set("shopper", "1");
          ret.searchParams.set("try_on_look", "1");
          customerAuth?.signInWithGoogle(ret.toString());
        }}
      />
    </>
  );
}
