"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Archive, Camera, Loader2, ScanBarcode, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { StoreProduct } from "@/lib/api/types";
import { lookupBarcodeProduct } from "@/lib/barcode-product-lookup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Phase = "scan" | "photo" | "review";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingProducts: StoreProduct[];
  currency?: string;
  uploadImage: (file: File) => Promise<string>;
  onCreated: (product: StoreProduct) => void;
  onEditProduct?: (product: StoreProduct) => void;
};

function findByBarcode(products: StoreProduct[], code: string): StoreProduct | undefined {
  const normalized = code.trim().toLowerCase();
  if (!normalized) return undefined;
  return products.find((product) => {
    const barcode = product.barcode?.trim().toLowerCase();
    const sku = product.sku?.trim().toLowerCase();
    return barcode === normalized || sku === normalized;
  });
}

function canvasToJpegFile(canvas: HTMLCanvasElement, filename: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not capture photo"));
          return;
        }
        resolve(new File([blob], filename, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.88,
    );
  });
}

export function ProductScanAddDialog({
  open,
  onOpenChange,
  existingProducts,
  currency = "NGN",
  uploadImage,
  onCreated,
  onEditProduct,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopScanRef = useRef<(() => void) | null>(null);
  const scanningRef = useRef(false);
  const busyRef = useRef(false);
  const lastCodeRef = useRef("");
  const lastCodeAtRef = useRef(0);
  const existingRef = useRef(existingProducts);
  const sessionIdsRef = useRef(new Set<string>());
  const phaseRef = useRef<Phase>("scan");

  const [phase, setPhase] = useState<Phase>("scan");
  const [pendingCode, setPendingCode] = useState("");
  const [manualCode, setManualCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("Saving…");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [sessionProducts, setSessionProducts] = useState<StoreProduct[]>([]);

  existingRef.current = existingProducts;
  phaseRef.current = phase;

  const clearPreview = () => {
    setPreviewFile(null);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const stopBarcodeReader = () => {
    scanningRef.current = false;
    try {
      stopScanRef.current?.();
    } catch {
      // ignore
    }
    stopScanRef.current = null;
  };

  const stopCamera = () => {
    stopBarcodeReader();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startLiveCamera = async () => {
    const video = videoRef.current;
    if (!video) return;

    stopCamera();
    setCameraError(null);

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
    streamRef.current = stream;
    video.srcObject = stream;
    await video.play();
  };

  const startBarcodeScan = async (cancelled: () => boolean) => {
    const video = videoRef.current;
    if (!video) return;

    stopCamera();
    setCameraError(null);

    scanningRef.current = true;
    const { BrowserMultiFormatReader } = await import("@zxing/browser");
    if (cancelled()) return;

    const reader = new BrowserMultiFormatReader();
    const controls = await reader.decodeFromConstraints(
      {
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      video,
      (result, _error, ctrl) => {
        if (!scanningRef.current || cancelled() || phaseRef.current !== "scan") {
          ctrl.stop();
          return;
        }
        if (result) {
          handleDecoded(result.getText());
        }
      },
    );

    if (cancelled()) {
      controls.stop();
      return;
    }
    stopScanRef.current = () => controls.stop();
  };

  const beginPhotoPhase = (code: string) => {
    stopBarcodeReader();
    setPendingCode(code);
    setManualCode("");
    clearPreview();
    setPhase("photo");
  };

  const acceptCode = (raw: string) => {
    const code = raw.trim();
    if (!code || busyRef.current || phaseRef.current !== "scan") return;

    const known =
      findByBarcode(existingRef.current, code) ||
      findByBarcode(sessionProducts, code);
    if (known) {
      toast.message(`Already in catalog: ${known.name}`, {
        action: onEditProduct
          ? {
              label: "Edit",
              onClick: () => onEditProduct(known),
            }
          : undefined,
      });
      return;
    }

    void beginPhotoPhase(code);
  };

  const handleDecoded = (code: string) => {
    const now = Date.now();
    if (code === lastCodeRef.current && now - lastCodeAtRef.current < 1800) return;
    lastCodeRef.current = code;
    lastCodeAtRef.current = now;
    acceptCode(code);
  };

  const captureFrame = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) {
      toast.error("Camera not ready yet");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      toast.error("Could not capture photo");
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const file = await canvasToJpegFile(canvas, `product-${pendingCode || "scan"}.jpg`);
      clearPreview();
      setPreviewFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setPhase("review");
      stopCamera();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not capture photo");
    }
  };

  const onPickPhoto = (file: File | null) => {
    if (!file) return;
    clearPreview();
    setPreviewFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setPhase("review");
    stopCamera();
  };

  const saveProduct = async (photo: File | null) => {
    const code = pendingCode.trim();
    if (!code || busyRef.current) return;

    busyRef.current = true;
    setBusy(true);
    setBusyLabel(photo ? "Uploading photo…" : "Saving…");

    try {
      let imageUrl: string | null = null;
      if (photo) {
        imageUrl = await uploadImage(photo);
        setBusyLabel("Saving product…");
      }

      const lookup = await lookupBarcodeProduct(code);
      const name = lookup?.name?.trim() || `Scanned ${code}`;
      const slugBase = `scan-${code}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
      const finalImage = imageUrl || lookup?.image_url || null;

      const product = await api.createProduct({
        name,
        slug: slugBase,
        description: lookup?.description ?? "",
        price: 0,
        currency,
        image_url: finalImage,
        images: finalImage ? [finalImage] : null,
        barcode: code,
        brand: lookup?.brand ?? null,
        stock_quantity: 0,
        status: "archived",
      });

      if (!sessionIdsRef.current.has(product.id)) {
        sessionIdsRef.current.add(product.id);
        setSessionProducts((prev) => [product, ...prev]);
      }
      onCreated(product);
      toast.success(`Archived · ${product.name}`);

      clearPreview();
      setPendingCode("");
      setPhase("scan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add product");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const retakePhoto = () => {
    clearPreview();
    setPhase("photo");
  };

  const cancelPending = () => {
    clearPreview();
    setPendingCode("");
    setPhase("scan");
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      clearPreview();
      setCameraError(null);
      setBusy(false);
      busyRef.current = false;
      setManualCode("");
      setPendingCode("");
      setPhase("scan");
      return;
    }

    let cancelled = false;
    const isCancelled = () => cancelled;

    const start = async () => {
      try {
        if (phase === "scan") {
          await startBarcodeScan(isCancelled);
          return;
        }
        if (phase === "photo") {
          await startLiveCamera();
        }
      } catch (err) {
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
    // Restart camera when dialog/phase changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, phase]);

  useEffect(() => {
    if (!open) {
      sessionIdsRef.current.clear();
      setSessionProducts([]);
    }
  }, [open]);

  const hint =
    phase === "scan"
      ? "Point at a barcode or QR. USB scanners work in the field below."
      : phase === "photo"
        ? "Aim at the product, then capture a photo for the catalog."
        : "Looks good? Save it to Archived, or retake.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="size-5" />
            Scan to add
          </DialogTitle>
          <DialogDescription>
            Scan a barcode, take a product photo, then keep going. Items are saved to{" "}
            <span className="inline-flex items-center gap-1 font-medium text-ink">
              <Archive className="size-3.5" />
              Archived
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
          <span className={phase === "scan" ? "text-ink" : undefined}>1. Scan</span>
          <span aria-hidden>→</span>
          <span className={phase === "photo" || phase === "review" ? "text-ink" : undefined}>
            2. Photo
          </span>
          <span aria-hidden>→</span>
          <span className={phase === "review" ? "text-ink" : undefined}>3. Save</span>
        </div>

        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-zinc-900">
          {phase === "review" && previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Captured product" className="h-full w-full object-cover" />
          ) : (
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              muted
              playsInline
              autoPlay
            />
          )}
          <canvas ref={canvasRef} className="hidden" />
          {phase === "scan" ? (
            <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-lg border-2 border-white/80" />
          ) : null}
          {phase === "photo" ? (
            <div className="pointer-events-none absolute inset-6 rounded-xl border-2 border-dashed border-white/70" />
          ) : null}
          {busy ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40">
              <Loader2 className="size-8 animate-spin text-white" />
              <p className="text-sm text-white">{busyLabel}</p>
            </div>
          ) : null}
        </div>

        {cameraError ? (
          <p className="text-sm text-amber-700">{cameraError}</p>
        ) : (
          <p className="text-xs text-zinc-500">{hint}</p>
        )}

        {pendingCode ? (
          <p className="rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
            Barcode <span className="font-semibold text-ink">{pendingCode}</span>
          </p>
        ) : null}

        {phase === "scan" ? (
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              acceptCode(manualCode);
            }}
          >
            <Input
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              placeholder="Scan or type barcode"
              className="h-11"
              autoFocus
              autoComplete="off"
              disabled={busy}
            />
            <Button type="submit" className="h-11 shrink-0" disabled={busy || !manualCode.trim()}>
              Next
            </Button>
          </form>
        ) : null}

        {phase === "photo" ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="h-11 flex-1"
              disabled={busy || Boolean(cameraError)}
              onClick={() => void captureFrame()}
            >
              <Camera className="mr-2 size-4" />
              Capture photo
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={busy}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-11"
              disabled={busy}
              onClick={() => void saveProduct(null)}
            >
              <SkipForward className="mr-2 size-4" />
              Skip
            </Button>
            <Button type="button" variant="ghost" className="h-11" disabled={busy} onClick={cancelPending}>
              Cancel
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
                onPickPhoto(file);
              }}
            />
          </div>
        ) : null}

        {phase === "review" ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="h-11 flex-1"
              disabled={busy || !previewFile}
              onClick={() => void saveProduct(previewFile)}
            >
              Save to archive
            </Button>
            <Button type="button" variant="outline" className="h-11" disabled={busy} onClick={retakePhoto}>
              Retake
            </Button>
            <Button type="button" variant="ghost" className="h-11" disabled={busy} onClick={cancelPending}>
              Cancel
            </Button>
          </div>
        ) : null}

        {sessionProducts.length > 0 ? (
          <div className="space-y-2 border-t border-zinc-200 pt-3">
            <p className="text-sm font-medium">
              Added this session · {sessionProducts.length}
            </p>
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {sessionProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  disabled={busy}
                  onClick={() => onEditProduct?.(product)}
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
                    ) : (
                      <div className="grid size-full place-items-center text-zinc-400">
                        <Archive className="size-4" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-zinc-500">
                      {product.barcode || product.sku || "No code"} · Archived
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
