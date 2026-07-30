"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Camera, ImageIcon, Loader2, ScanBarcode } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { PosCatalogProduct } from "@/lib/api/types";
import { startBarcodeCameraScan, waitForVideoElement } from "@/lib/barcode-camera-scan";
import { formatMoney } from "@/lib/storefront/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ScanMode = "barcode" | "ocr";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProduct: (product: PosCatalogProduct) => void;
  /** Called when a scanned/typed code has no catalog match. */
  onUnknownCode?: (code: string) => void;
  /** Prefer local/offline lookup when provided (returns null to fall through to API). */
  resolveLocally?: (
    code: string,
  ) =>
    | {
        match: "exact" | "ambiguous" | "none";
        product: PosCatalogProduct | null;
        candidates: PosCatalogProduct[];
      }
    | null;
};

function extractOcrQueries(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length >= 2);

  const tokens = text
    .split(/[\s,;|/\\]+/)
    .map((token) => token.trim())
    .filter((token) => /^[A-Za-z0-9][A-Za-z0-9._-]{2,47}$/.test(token));

  const ranked = [...lines, ...tokens]
    .map((value) => value.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return [...new Set(ranked)].slice(0, 8);
}

export function SellScanDialog({
  open,
  onOpenChange,
  onProduct,
  onUnknownCode,
  resolveLocally,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopScanRef = useRef<(() => void) | null>(null);
  const scanningRef = useRef(false);
  const lastCodeRef = useRef("");
  const lastCodeAtRef = useRef(0);

  const [mode, setMode] = useState<ScanMode>("barcode");
  const [manualCode, setManualCode] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [ocrHint, setOcrHint] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<PosCatalogProduct[]>([]);

  const stopCamera = () => {
    scanningRef.current = false;
    try {
      stopScanRef.current?.();
    } catch {
      // ignore
    }
    stopScanRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const resolveCode = async (raw: string, lookupMode: "exact" | "search" = "exact") => {
    const code = raw.trim();
    if (!code || busyRef.current) return;

    busyRef.current = true;
    setBusy(true);
    try {
      const local = resolveLocally?.(code) ?? null;
      if (local) {
        if (local.match === "exact" && local.product) {
          setCandidates([]);
          onProduct(local.product);
          onOpenChange(false);
          return;
        }
        if (local.candidates.length > 0) {
          setCandidates(local.candidates);
          toast.message("Multiple matches — pick one");
          return;
        }
        if (lookupMode === "exact" && onUnknownCode) {
          onOpenChange(false);
          onUnknownCode(code);
          return;
        }
        toast.error("No product for that code");
        return;
      }

      const result = await api.lookupPosProduct(code, lookupMode);
      if (result.match === "exact" && result.product) {
        setCandidates([]);
        onProduct(result.product);
        onOpenChange(false);
        return;
      }
      if (result.candidates.length > 0) {
        setCandidates(result.candidates);
        if (lookupMode === "exact") {
          toast.message("Multiple matches — pick one");
        }
        return;
      }
      if (lookupMode === "exact" && onUnknownCode) {
        onOpenChange(false);
        onUnknownCode(code);
        return;
      }
      toast.error(lookupMode === "exact" ? "No product for that code" : "No matching products");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const handleDecoded = (code: string) => {
    if (busyRef.current) return;
    const now = Date.now();
    if (code === lastCodeRef.current && now - lastCodeAtRef.current < 1800) return;
    lastCodeRef.current = code;
    lastCodeAtRef.current = now;
    void resolveCode(code, "exact");
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      setCandidates([]);
      setCameraError(null);
      setOcrHint(null);
      setBusy(false);
      busyRef.current = false;
      setManualCode("");
      return;
    }

    let cancelled = false;

    const start = async () => {
      setCameraError(null);

      try {
        const video = await waitForVideoElement(
          () => videoRef.current,
          () => cancelled,
        );

        if (mode === "barcode") {
          scanningRef.current = true;
          const controls = await startBarcodeCameraScan(
            video,
            (code) => {
              if (!scanningRef.current || cancelled) return;
              handleDecoded(code);
            },
            {
              cancelled: () => cancelled,
              onStream: (stream) => {
                streamRef.current = stream;
              },
            },
          );
          if (cancelled) {
            controls.stop();
            return;
          }
          streamRef.current = controls.stream;
          stopScanRef.current = () => controls.stop();
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        }).catch(() =>
          navigator.mediaDevices.getUserMedia({ audio: false, video: true }),
        );
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;
        video.muted = true;
        await video.play().catch(() => undefined);
      } catch (err) {
        if (!cancelled && err instanceof Error && err.message === "Cancelled") {
          return;
        }
        if (!cancelled) {
          setCameraError(
            err instanceof Error
              ? err.message
              : "Camera unavailable. Enter a code manually or upload a photo.",
          );
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      stopCamera();
    };
    // Restart camera when dialog/mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const captureFrame = (): HTMLCanvasElement | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas;
  };

  const runOcrOnSource = async (source: HTMLCanvasElement | File | Blob) => {
    setBusy(true);
    setOcrHint("Reading label…");
    setCandidates([]);
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      try {
        const { data } = await worker.recognize(source);
        const text = data.text?.trim() ?? "";
        if (!text) {
          toast.error("No text found in the image");
          return;
        }
        setOcrHint(text.slice(0, 120) + (text.length > 120 ? "…" : ""));

        const queries = extractOcrQueries(text);
        const found = new Map<string, PosCatalogProduct>();

        for (const query of queries) {
          const exact = await api.lookupPosProduct(query, "exact");
          if (exact.match === "exact" && exact.product) {
            found.set(exact.product.id, exact.product);
            continue;
          }
          for (const candidate of exact.candidates) {
            found.set(candidate.id, candidate);
          }
        }

        if (found.size === 0) {
          for (const query of queries.slice(0, 4)) {
            const soft = await api.lookupPosProduct(query, "search");
            for (const candidate of soft.candidates) {
              found.set(candidate.id, candidate);
            }
            if (found.size >= 8) break;
          }
        }

        const list = [...found.values()];
        if (list.length === 1) {
          onProduct(list[0]!);
          onOpenChange(false);
          return;
        }
        if (list.length > 1) {
          setCandidates(list);
          toast.message("Pick a matching product");
          return;
        }
        toast.error("No products matched that label");
      } finally {
        await worker.terminate();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "OCR failed");
    } finally {
      setBusy(false);
    }
  };

  const onCaptureLabel = async () => {
    const canvas = captureFrame();
    if (!canvas) {
      toast.error("Camera not ready yet");
      return;
    }
    await runOcrOnSource(canvas);
  };

  const onPickFile = async (file: File | null) => {
    if (!file) return;
    await runOcrOnSource(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="size-5" />
            Scan to add
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as ScanMode)}
          className="space-y-3"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="barcode">Barcode</TabsTrigger>
            <TabsTrigger value="ocr">Label / OCR</TabsTrigger>
          </TabsList>

          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-zinc-900">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              playsInline
              autoPlay
            />
            <canvas ref={canvasRef} className="hidden" />
            {mode === "barcode" ? (
              <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-lg border-2 border-white/80" />
            ) : null}
            {busy ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <Loader2 className="size-8 animate-spin text-white" />
              </div>
            ) : null}
          </div>

          {cameraError ? (
            <p className="text-sm text-amber-700">{cameraError}</p>
          ) : (
            <p className="text-xs text-zinc-500">
              {mode === "barcode"
                ? "Point at a barcode or QR. USB scanners work in the field below."
                : "Capture or upload a product label — we’ll match name, SKU, or barcode text."}
            </p>
          )}

          <TabsContent value="barcode" className="mt-0 space-y-3">
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void resolveCode(manualCode, "exact");
              }}
            >
              <Input
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
                placeholder="Scan or type code"
                className="h-11"
                autoFocus
                autoComplete="off"
                disabled={busy}
              />
              <Button type="submit" className="h-11 shrink-0" disabled={busy || !manualCode.trim()}>
                Add
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="ocr" className="mt-0 space-y-3">
            <div className="flex gap-2">
              <Button
                type="button"
                className="h-11 flex-1"
                disabled={busy || Boolean(cameraError)}
                onClick={() => void onCaptureLabel()}
              >
                <Camera className="mr-2 size-4" />
                Capture label
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
              >
                <ImageIcon className="size-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  event.target.value = "";
                  void onPickFile(file);
                }}
              />
            </div>
            {ocrHint ? (
              <p className="rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
                Read: {ocrHint}
              </p>
            ) : null}
          </TabsContent>
        </Tabs>

        {candidates.length > 0 ? (
          <div className="space-y-2 border-t border-zinc-200 pt-3">
            <p className="text-sm font-medium">Matches</p>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {candidates.map((product) => {
                const outOfStock =
                  product.stock_quantity !== null && product.stock_quantity <= 0;
                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={outOfStock || busy}
                    onClick={() => {
                      onProduct(product);
                      onOpenChange(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl bg-zinc-50 p-2 text-left ring-1 ring-zinc-200 disabled:opacity-50"
                  >
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-zinc-200">
                      {product.image_url ? (
                        <Image
                          src={product.image_url}
                          alt=""
                          fill
                          className="object-cover"
                          sizes="48px"
                          unoptimized
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-zinc-500">
                        {product.sku || product.barcode || "No code"}
                        {outOfStock ? " · Out of stock" : ""}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">
                      {formatMoney(product.effective_price, product.currency)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
