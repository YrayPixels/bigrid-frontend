"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Archive, Loader2, ScanBarcode } from "lucide-react";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingProducts: StoreProduct[];
  currency?: string;
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

export function ProductScanAddDialog({
  open,
  onOpenChange,
  existingProducts,
  currency = "NGN",
  onCreated,
  onEditProduct,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const stopScanRef = useRef<(() => void) | null>(null);
  const scanningRef = useRef(false);
  const busyRef = useRef(false);
  const lastCodeRef = useRef("");
  const lastCodeAtRef = useRef(0);
  const existingRef = useRef(existingProducts);
  const sessionIdsRef = useRef(new Set<string>());

  const [manualCode, setManualCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [sessionProducts, setSessionProducts] = useState<StoreProduct[]>([]);

  existingRef.current = existingProducts;

  const stopCamera = () => {
    scanningRef.current = false;
    try {
      stopScanRef.current?.();
    } catch {
      // ignore
    }
    stopScanRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const addFromCode = async (raw: string) => {
    const code = raw.trim();
    if (!code || busyRef.current) return;

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

    busyRef.current = true;
    setBusy(true);
    try {
      const lookup = await lookupBarcodeProduct(code);
      const name = lookup?.name?.trim() || `Scanned ${code}`;
      const slugBase = `scan-${code}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-");

      const product = await api.createProduct({
        name,
        slug: slugBase,
        description: lookup?.description ?? "",
        price: 0,
        currency,
        image_url: lookup?.image_url ?? null,
        images: lookup?.image_url ? [lookup.image_url] : null,
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
      setManualCode("");
      toast.success(`Archived · ${product.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add product");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const handleDecoded = (code: string) => {
    const now = Date.now();
    if (code === lastCodeRef.current && now - lastCodeAtRef.current < 1800) return;
    lastCodeRef.current = code;
    lastCodeAtRef.current = now;
    void addFromCode(code);
  };

  useEffect(() => {
    if (!open) {
      stopCamera();
      setCameraError(null);
      setBusy(false);
      busyRef.current = false;
      setManualCode("");
      return;
    }

    let cancelled = false;

    const start = async () => {
      setCameraError(null);
      stopCamera();

      const video = videoRef.current;
      if (!video) return;

      try {
        scanningRef.current = true;
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled) return;
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
            if (!scanningRef.current || cancelled) {
              ctrl.stop();
              return;
            }
            if (result) {
              handleDecoded(result.getText());
            }
          },
        );
        if (cancelled) {
          controls.stop();
          return;
        }
        stopScanRef.current = () => controls.stop();
      } catch (err) {
        if (!cancelled) {
          setCameraError(
            err instanceof Error
              ? err.message
              : "Camera unavailable. Enter a barcode manually or use a USB scanner.",
          );
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      stopCamera();
    };
    // Restart camera when dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) {
      sessionIdsRef.current.clear();
      setSessionProducts([]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="size-5" />
            Scan to add
          </DialogTitle>
          <DialogDescription>
            Scan barcodes quickly — each new product is saved to{" "}
            <span className="inline-flex items-center gap-1 font-medium text-ink">
              <Archive className="size-3.5" />
              Archived
            </span>{" "}
            so you can price and publish later.
          </DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-zinc-900">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            muted
            playsInline
            autoPlay
          />
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-24 -translate-y-1/2 rounded-lg border-2 border-white/80" />
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
            Point at a barcode or QR. USB scanners work in the field below. Keep scanning —
            the dialog stays open.
          </p>
        )}

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void addFromCode(manualCode);
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
            Add
          </Button>
        </form>

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
