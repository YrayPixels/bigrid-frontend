"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, PackagePlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { PosCatalogProduct, StoreProduct } from "@/lib/api/types";
import { lookupBarcodeProduct } from "@/lib/barcode-product-lookup";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type SellQuickAddSeed = {
  barcode?: string;
  nameHint?: string;
  /** When true, barcode field is read-only (from a scan). */
  barcodeLocked?: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currency: string;
  seed?: SellQuickAddSeed | null;
  onCreated: (product: PosCatalogProduct) => void;
};

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || `pos-${Date.now().toString(36)}`;
}

export function storeProductToPosCatalog(
  product: StoreProduct,
  fallbackCurrency: string,
): PosCatalogProduct {
  const price = Number(product.price) || 0;
  const sale_price =
    product.sale_price != null && Number.isFinite(Number(product.sale_price))
      ? Number(product.sale_price)
      : null;
  const effective_price =
    product.effective_price != null && Number.isFinite(Number(product.effective_price))
      ? Number(product.effective_price)
      : (sale_price ?? price);

  return {
    id: product.id,
    name: product.name,
    sku: product.sku?.trim() ? product.sku : null,
    barcode: product.barcode ?? null,
    price,
    sale_price,
    effective_price,
    currency: product.currency || fallbackCurrency,
    image_url: product.image_url,
    stock_quantity:
      typeof product.stock_quantity === "number" ? product.stock_quantity : null,
    variants: product.variants ?? [],
    category_id: product.category_id ?? null,
  };
}

export function SellQuickAddDialog({
  open,
  onOpenChange,
  currency,
  seed,
  onCreated,
}: Props) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [barcode, setBarcode] = useState("");
  const [barcodeLocked, setBarcodeLocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const enrichTokenRef = useRef(0);

  useEffect(() => {
    if (!open) return;

    const nextBarcode = seed?.barcode?.trim() ?? "";
    const nextName = seed?.nameHint?.trim() ?? "";
    const locked = Boolean(seed?.barcodeLocked && nextBarcode);

    setBarcode(nextBarcode);
    setBarcodeLocked(locked);
    setName(nextName);
    setPrice("");
    setBusy(false);
    setLookingUp(false);

    const focusTimer = window.setTimeout(() => {
      nameRef.current?.focus();
      nameRef.current?.select();
    }, 50);

    if (!nextBarcode) {
      return () => window.clearTimeout(focusTimer);
    }

    const token = ++enrichTokenRef.current;
    setLookingUp(true);
    void lookupBarcodeProduct(nextBarcode)
      .then((lookup) => {
        if (token !== enrichTokenRef.current) return;
        const lookedUpName = lookup?.name?.trim();
        if (lookedUpName) {
          setName((current) => (current.trim() ? current : lookedUpName));
        }
      })
      .finally(() => {
        if (token === enrichTokenRef.current) setLookingUp(false);
      });

    return () => {
      window.clearTimeout(focusTimer);
      enrichTokenRef.current += 1;
    };
  }, [open, seed]);

  const saveAndAdd = async () => {
    const trimmedName = name.trim();
    const priceValue = Number(price);
    const trimmedBarcode = barcode.trim();

    if (!trimmedName) {
      toast.error("Enter a product name");
      nameRef.current?.focus();
      return;
    }
    if (!Number.isFinite(priceValue) || priceValue < 0) {
      toast.error("Enter a valid price");
      return;
    }
    if (busy) return;

    setBusy(true);
    try {
      const slugSource = trimmedBarcode
        ? `pos-${trimmedBarcode}`
        : `pos-${trimmedName}`;
      const product = await api.createProduct({
        name: trimmedName,
        slug: slugify(slugSource),
        description: "",
        price: priceValue,
        currency,
        image_url: null,
        images: null,
        barcode: trimmedBarcode || null,
        status: "active",
      });

      const posProduct = storeProductToPosCatalog(product, currency);
      posProduct.stock_quantity = null;

      onCreated(posProduct);
      onOpenChange(false);
      toast.success(`Added ${posProduct.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create product");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="size-5" />
            Quick add product
          </DialogTitle>
          <DialogDescription>
            Create it now and add it to this sale. It stays in your catalog for next time.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void saveAndAdd();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="pos-quick-name">Name</Label>
            <Input
              id="pos-quick-name"
              ref={nameRef}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Product name"
              className="h-11"
              autoComplete="off"
              disabled={busy}
            />
            {lookingUp ? (
              <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Loader2 className="size-3 animate-spin" />
                Looking up barcode…
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="pos-quick-price">Price ({currency})</Label>
            <Input
              id="pos-quick-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="0.00"
              className="h-11"
              autoComplete="off"
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pos-quick-barcode">Barcode</Label>
            <Input
              id="pos-quick-barcode"
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              placeholder="Optional"
              className="h-11"
              autoComplete="off"
              disabled={busy || barcodeLocked}
              readOnly={barcodeLocked}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="h-11 flex-1" disabled={busy}>
              {busy ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save & add to cart"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
