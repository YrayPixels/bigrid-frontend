"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Minus, Plus, PackagePlus, ScanBarcode, Search, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { PosCatalogProduct } from "@/lib/api/types";
import { useSellCart, type SellCartLine } from "@/lib/sell-cart";
import { usePosOffline } from "@/lib/pos-offline/context";
import {
  filterCachedProducts,
  lookupCachedProduct,
} from "@/lib/pos-offline/db";
import { formatMoney } from "@/lib/storefront/format";
import { SellScanDialog } from "@/components/sell/sell-scan-dialog";
import {
  SellQuickAddDialog,
  type SellQuickAddSeed,
} from "@/components/sell/sell-quick-add-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/** Digit-only product barcodes (EAN/UPC/ITF). */
function looksLikeBarcode(value: string): boolean {
  return /^[0-9]{8,18}$/.test(value.trim());
}

function hasVariants(product: PosCatalogProduct): boolean {
  return Array.isArray(product.variants) && product.variants.length > 0;
}

function variantGroups(
  product: PosCatalogProduct,
): Array<{ name: string; options: Array<{ value: string; price: number | null; image_url: string | null }> }> {
  if (!Array.isArray(product.variants)) return [];
  return product.variants
    .map((group) => {
      if (!group || typeof group !== "object") return null;
      const name = String((group as { name?: string }).name ?? "").trim();
      const rawOptions = Array.isArray((group as { options?: unknown }).options)
        ? ((group as { options: unknown[] }).options as unknown[])
        : [];
      const options = rawOptions
        .map((option) => {
          if (typeof option === "string") {
            const value = option.trim();
            return value ? { value, price: null, image_url: null } : null;
          }
          if (!option || typeof option !== "object") return null;
          const row = option as { value?: unknown; price?: unknown; image_url?: unknown };
          const value = String(row.value ?? "").trim();
          if (!value) return null;
          const price =
            row.price != null && row.price !== "" && Number.isFinite(Number(row.price))
              ? Number(row.price)
              : null;
          const image_url =
            typeof row.image_url === "string" && row.image_url.trim()
              ? row.image_url.trim()
              : null;
          return { value, price, image_url };
        })
        .filter(
          (
            option,
          ): option is { value: string; price: number | null; image_url: string | null } =>
            option !== null,
        );
      if (!name || options.length === 0) return null;
      return { name, options };
    })
    .filter(
      (
        g,
      ): g is {
        name: string;
        options: Array<{ value: string; price: number | null; image_url: string | null }>;
      } => g !== null,
    );
}

function CartPanel({
  lines,
  currency,
  subtotal,
  customerName,
  customerPhone,
  setCustomerName,
  setCustomerPhone,
  setQuantity,
  removeLine,
  onCharge,
}: {
  lines: SellCartLine[];
  currency: string;
  subtotal: number;
  customerName: string;
  customerPhone: string;
  setCustomerName: (value: string) => void;
  setCustomerPhone: (value: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  onCharge: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        {lines.length === 0 ? (
          <p className="py-10 text-center text-sm text-ink-soft">
            Tap products to add them to the cart.
          </p>
        ) : (
          lines.map((line) => (
            <div key={line.key} className="flex gap-3">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted ring-1 ring-border">
                {line.image_url ? (
                  <Image
                    src={line.image_url}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="56px"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[10px] text-ink-soft">
                    No image
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug">{line.name}</p>
                {Object.keys(line.selected_options).length > 0 ? (
                  <p className="text-xs text-ink-soft">
                    {Object.entries(line.selected_options)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" · ")}
                  </p>
                ) : null}
                <p className="mt-1 text-sm font-semibold">
                  {formatMoney(line.unit_price * line.quantity, line.currency)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9"
                  onClick={() => setQuantity(line.key, line.quantity - 1)}
                >
                  <Minus className="size-4" />
                </Button>
                <span className="w-6 text-center text-sm font-medium">{line.quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-9"
                  onClick={() => setQuantity(line.key, line.quantity + 1)}
                >
                  <Plus className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 text-ink-soft"
                  onClick={() => removeLine(line.key)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))
        )}

        <div className="space-y-2 border-t border-border pt-4">
          <Input
            placeholder="Customer name (optional)"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="h-11"
          />
          <Input
            placeholder="Customer phone (optional)"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="h-11"
          />
        </div>
      </div>
      <Button
        className="mt-4 h-12 w-full shrink-0 rounded-xl text-base"
        disabled={lines.length === 0}
        onClick={onCharge}
      >
        Charge {formatMoney(subtotal, currency)}
      </Button>
    </div>
  );
}

export default function SellPage() {
  const router = useRouter();
  const {
    lines,
    itemCount,
    subtotal,
    addProduct,
    setQuantity,
    removeLine,
    customerName,
    customerPhone,
    setCustomerName,
    setCustomerPhone,
  } = useSellCart();

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [products, setProducts] = useState<PosCatalogProduct[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [variantProduct, setVariantProduct] = useState<PosCatalogProduct | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [scanOpen, setScanOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddSeed, setQuickAddSeed] = useState<SellQuickAddSeed | null>(null);
  const { online, catalog: offlineCatalog, cacheEmpty } = usePosOffline();
  const storeId = offlineCatalog?.store_id ?? null;

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        if (!online) {
          if (!offlineCatalog) {
            if (!cancelled) {
              setProducts([]);
              setCategories([]);
              toast.error("No offline catalog yet. Connect once to download products.");
            }
            return;
          }
          if (cancelled) return;
          setCategories(offlineCatalog.categories);
          setProducts(
            filterCachedProducts(offlineCatalog.products, {
              search: search.trim() || undefined,
              category_id: categoryId,
            }),
          );
          return;
        }

        try {
          const catalog = await api.getPosCatalog({
            search: search.trim() || undefined,
            category_id: categoryId || undefined,
          });
          if (cancelled) return;
          setProducts(catalog.products);
          setCategories(catalog.categories);
        } catch (err) {
          if (offlineCatalog) {
            if (cancelled) return;
            setCategories(offlineCatalog.categories);
            setProducts(
              filterCachedProducts(offlineCatalog.products, {
                search: search.trim() || undefined,
                category_id: categoryId,
              }),
            );
            toast.message("Using offline catalog");
            return;
          }
          throw err;
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Failed to load products");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, categoryId, online, offlineCatalog]);

  const currency =
    products[0]?.currency ||
    offlineCatalog?.store.currency ||
    lines[0]?.currency ||
    "NGN";

  const variantReady = useMemo(() => {
    if (!variantProduct) return false;
    const groups = variantGroups(variantProduct);
    return groups.every((g) => Boolean(selectedOptions[g.name]));
  }, [variantProduct, selectedOptions]);

  const openQuickAdd = (seed?: SellQuickAddSeed) => {
    if (!online) {
      toast.error("Quick add needs a connection");
      return;
    }
    setQuickAddSeed(seed ?? null);
    setQuickAddOpen(true);
  };

  const onTapProduct = (product: PosCatalogProduct) => {
    if (product.stock_quantity !== null && product.stock_quantity <= 0) {
      toast.error("Out of stock");
      return;
    }
    if (hasVariants(product)) {
      setVariantProduct(product);
      setSelectedOptions({});
      return;
    }
    addProduct(product);
    toast.success(`Added ${product.name}`);
  };

  const onQuickAddCreated = (product: PosCatalogProduct) => {
    setProducts((prev) => {
      if (prev.some((row) => row.id === product.id)) return prev;
      return [product, ...prev];
    });
    addProduct(product);
    setSearch("");
  };

  const onSearchKeyDown = async (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    const code = search.trim();
    if (!code) return;
    event.preventDefault();

    if (!online && offlineCatalog) {
      const local = lookupCachedProduct(offlineCatalog.products, code);
      if (local.match === "exact" && local.product) {
        onTapProduct(local.product);
        setSearch("");
        return;
      }
      if (local.candidates.length === 1) {
        onTapProduct(local.candidates[0]!);
        setSearch("");
        return;
      }
      if (local.candidates.length > 1) {
        toast.message("Multiple matches — refine search");
        return;
      }
      toast.error("Not in offline catalog");
      return;
    }

    try {
      const result = await api.lookupPosProduct(code, "exact");
      if (result.match === "exact" && result.product) {
        onTapProduct(result.product);
        setSearch("");
        return;
      }
      if (result.candidates.length === 1) {
        onTapProduct(result.candidates[0]!);
        setSearch("");
        return;
      }
      if (result.candidates.length > 1) {
        toast.message("Multiple matches — refine search or use Scan");
        return;
      }
    } catch {
      if (offlineCatalog) {
        const local = lookupCachedProduct(offlineCatalog.products, code);
        if (local.match === "exact" && local.product) {
          onTapProduct(local.product);
          setSearch("");
          return;
        }
      }
      // Fall through to quick-add for unknown codes / names.
    }

    if (!online) {
      toast.error("Connect to add a new product");
      return;
    }

    if (looksLikeBarcode(code)) {
      openQuickAdd({ barcode: code, barcodeLocked: false, nameHint: "" });
    } else {
      openQuickAdd({ nameHint: code });
    }
  };

  const goCheckout = () => {
    setCartOpen(false);
    router.push("/sell/checkout");
  };

  const cartProps = {
    lines,
    currency,
    subtotal,
    customerName,
    customerPhone,
    setCustomerName,
    setCustomerPhone,
    setQuantity,
    removeLine,
    onCharge: goCheckout,
  };

  return (
    <div className="relative flex flex-1 flex-col lg:flex-row lg:items-stretch lg:gap-0">
      <div className="flex min-w-0 flex-1 flex-col pb-28 lg:pb-0">
        <div className="sticky top-[calc(3.75rem+env(safe-area-inset-top))] z-10 space-y-3 border-b border-border bg-canvas/95 px-4 py-3 backdrop-blur sm:px-6 lg:top-[4.25rem] lg:px-8">
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => void onSearchKeyDown(e)}
                placeholder="Search or scan SKU / barcode"
                className="h-11 rounded-xl bg-card pl-9"
                autoComplete="off"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-11 shrink-0 rounded-xl px-3 sm:px-4"
              onClick={() => setScanOpen(true)}
              aria-label="Scan to add"
            >
              <ScanBarcode className="size-5" />
              <span className="ml-2 hidden sm:inline">Scan</span>
            </Button>
          </div>
          {categories.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setCategoryId(null)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
                  !categoryId ? "bg-ink text-canvas" : "bg-card text-ink-soft ring-1 ring-border"
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
                    categoryId === category.id
                      ? "bg-ink text-canvas"
                      : "bg-card text-ink-soft ring-1 ring-border"
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3 px-4 py-4 sm:grid-cols-3 sm:px-6 md:grid-cols-4 lg:grid-cols-3 lg:px-8 xl:grid-cols-4 2xl:grid-cols-5">
          {loading && products.length === 0
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted/70 sm:h-48" />
              ))
            : null}
          {!loading && products.length === 0 ? (
            <div className="col-span-full flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-ink-soft">
                {cacheEmpty
                  ? "No offline catalog yet. Connect once to download products."
                  : search.trim()
                    ? `No products match “${search.trim()}”.`
                    : "No products found."}
              </p>
              {online && !cacheEmpty ? (
                <Button
                  type="button"
                  className="h-11 rounded-xl"
                  onClick={() => {
                    const query = search.trim();
                    if (query && looksLikeBarcode(query)) {
                      openQuickAdd({ barcode: query, nameHint: "" });
                      return;
                    }
                    openQuickAdd({ nameHint: query || undefined });
                  }}
                >
                  <PackagePlus className="mr-2 size-4" />
                  {search.trim()
                    ? `Add “${search.trim().slice(0, 40)}${search.trim().length > 40 ? "…" : ""}”`
                    : "Add new product"}
                </Button>
              ) : null}
            </div>
          ) : null}
          {products.map((product) => {
            const outOfStock = product.stock_quantity !== null && product.stock_quantity <= 0;
            return (
              <button
                key={product.id}
                type="button"
                disabled={outOfStock}
                onClick={() => onTapProduct(product)}
                className="flex flex-col overflow-hidden rounded-2xl bg-card text-left shadow-sm ring-1 ring-border transition hover:ring-border disabled:opacity-50"
              >
                <div className="relative aspect-square bg-muted">
                  {product.image_url ? (
                    <Image
                      src={product.image_url}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 180px"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-ink-soft">
                      No image
                    </div>
                  )}
                </div>
                <div className="space-y-1 p-3">
                  <p className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</p>
                  <p className="text-sm font-semibold">
                    {formatMoney(product.effective_price, product.currency)}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {outOfStock
                      ? "Out of stock"
                      : product.stock_quantity === null
                        ? "In stock"
                        : `${product.stock_quantity} left`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <aside className="hidden w-[22rem] shrink-0 border-l border-border bg-card lg:flex xl:w-[26rem]">
        <div className="sticky top-[4.25rem] flex h-[calc(100dvh-4.25rem)] w-full flex-col p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Cart</h2>
            <p className="text-sm text-ink-soft">
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </p>
          </div>
          <CartPanel {...cartProps} />
        </div>
      </aside>

      {itemCount > 0 ? (
        <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] lg:hidden">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="mx-auto flex w-full max-w-lg items-center justify-between rounded-2xl bg-ink px-5 py-4 text-canvas shadow-lg"
          >
            <span className="text-sm font-medium">
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </span>
            <span className="text-base font-semibold">{formatMoney(subtotal, currency)}</span>
          </button>
        </div>
      ) : null}

      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] rounded-t-3xl px-4 pb-8 lg:hidden">
          <SheetHeader className="mb-4 text-left">
            <SheetTitle>Cart</SheetTitle>
          </SheetHeader>
          <div className="max-h-[65dvh]">
            <CartPanel {...cartProps} />
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={Boolean(variantProduct)}
        onOpenChange={(open) => {
          if (!open) setVariantProduct(null);
        }}
      >
        <DialogContent className="max-w-sm rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{variantProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {variantProduct
              ? variantGroups(variantProduct).map((group) => (
                  <div key={group.name} className="space-y-2">
                    <p className="text-sm font-medium">{group.name}</p>
                    <div className="flex flex-wrap gap-2">
                      {group.options.map((option) => {
                        const active = selectedOptions[group.name] === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              setSelectedOptions((prev) => ({
                                ...prev,
                                [group.name]: option.value,
                              }))
                            }
                            className={`rounded-full px-3 py-1.5 text-sm ${
                              active
                                ? "bg-ink text-canvas"
                                : "bg-muted text-ink"
                            }`}
                          >
                            {option.value}
                            {option.price != null
                              ? ` · ${formatMoney(option.price, variantProduct?.currency)}`
                              : ""}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              : null}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setVariantProduct(null)}
              >
                <X className="mr-1 size-4" />
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={!variantReady || !variantProduct}
                onClick={() => {
                  if (!variantProduct) return;
                  addProduct(variantProduct, selectedOptions);
                  setVariantProduct(null);
                  toast.success(`Added ${variantProduct.name}`);
                }}
              >
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SellScanDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onProduct={onTapProduct}
        resolveLocally={
          !online && offlineCatalog
            ? (code) => lookupCachedProduct(offlineCatalog.products, code)
            : undefined
        }
        onUnknownCode={(code) => {
          if (!online) {
            toast.error("Connect to add a new product");
            return;
          }
          openQuickAdd({ barcode: code, barcodeLocked: true });
        }}
      />

      <SellQuickAddDialog
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        currency={currency}
        seed={quickAddSeed}
        uploadImage={
          storeId
            ? async (file) => {
                const { url } = await api.uploadStorefrontImage(storeId, file);
                return url;
              }
            : undefined
        }
        onCreated={onQuickAddCreated}
      />
    </div>
  );
}
