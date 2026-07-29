"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Copy,
  Filter,
  Loader2,
  MoreVertical,
  Package,
  Plus,
  ScanBarcode,
  Search,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { ProductFormDialog } from "@/components/admin/product-form-dialog";
import { ProductScanAddDialog } from "@/components/admin/product-scan-add-dialog";
import { AdminStatCard } from "@/components/admin/stat-card";
import { confirm } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  merchantCache,
  merchantInvalidators,
  useCategories,
  useProductOrderStats,
  useProducts,
  useStoreMe,
} from "@/hooks/use-merchant-queries";
import { useAuth } from "@/lib/auth-context";
import { useLocationScope } from "@/lib/location-scope";
import { api } from "@/lib/api/client";
import type { ProductImportReport, Store, StoreCategory, StoreProduct } from "@/lib/api/types";

type ImportRow = Record<string, unknown>;
type StatusFilter = "all" | "active" | "draft" | "archived";

const LOW_STOCK_THRESHOLD = 10;
const PAGE_SIZE_OPTIONS = [8, 12, 24] as const;
const MAX_PRODUCT_IMAGES = 12;

function visiblePageNumbers(current: number, total: number, windowSize = 5): number[] {
  if (total <= 0) return [];
  if (total <= windowSize) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, current - half);
  const end = Math.min(total, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

function stockBadge(product: StoreProduct) {
  if (typeof product.stock_quantity !== "number") return null;
  if (product.stock_quantity <= 0) {
    return { label: "Out of stock", className: "bg-destructive/10 text-destructive" };
  }
  if (product.low_stock || product.stock_quantity <= LOW_STOCK_THRESHOLD) {
    return {
      label: `Low stock · ${product.stock_quantity}`,
      className: "bg-amber-500/10 text-amber-800",
    };
  }
  return { label: `${product.stock_quantity} in stock`, className: "bg-secondary text-ink-soft" };
}

function normalizeProductImages(images?: string[] | null, cover?: string | null): string[] {
  const unique: string[] = [];
  for (const src of [...(images ?? []), cover ?? ""]) {
    const trimmed = src.trim();
    if (!trimmed || unique.includes(trimmed)) continue;
    unique.push(trimmed);
    if (unique.length >= MAX_PRODUCT_IMAGES) break;
  }
  return unique;
}

function formatMoney(value: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMoneyDetailed(value: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function currencySymbol(currency = "NGN") {
  return (
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    })
      .formatToParts(0)
      .find((part) => part.type === "currency")?.value ?? currency
  );
}

/** Short money for tight mobile stat cards: ₦1.7K / ₦1.7M / ₦1.2B */
function formatMoneyCompact(value: number, currency = "NGN") {
  const abs = Math.abs(value);
  if (!Number.isFinite(abs) || abs < 1_000) {
    return formatMoneyDetailed(value, currency);
  }

  const sign = value < 0 ? "-" : "";
  const symbol = currencySymbol(currency);

  let scaled: number;
  let suffix: string;
  if (abs >= 1_000_000_000) {
    scaled = abs / 1_000_000_000;
    suffix = "B";
  } else if (abs >= 1_000_000) {
    scaled = abs / 1_000_000;
    suffix = "M";
  } else {
    scaled = abs / 1_000;
    suffix = "K";
  }

  const digits = scaled >= 100 ? 0 : 1;
  const compact = scaled
    .toFixed(digits)
    .replace(/\.0$/, "")
    .replace(/(\.\d*[1-9])0+$/, "$1");

  return `${sign}${symbol}${compact}${suffix}`;
}

function formatUpdatedDate(value: Date) {
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `product_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function normalizeRowKey(row: ImportRow, key: string) {
  const match = Object.entries(row).find(([rowKey]) => {
    const normalized = rowKey.toLowerCase().replace(/[\s_-]/g, "");
    return normalized === key.toLowerCase().replace(/[\s_-]/g, "");
  });
  return match?.[1];
}

function rowString(row: ImportRow, key: string) {
  const value = normalizeRowKey(row, key);
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function parseVariants(value: string): StoreProduct["variants"] {
  const variants = value
    .split(";")
    .map((part) => {
      const [name, options] = part.split(":");
      return {
        name: name?.trim() ?? "",
        options: (options ?? "")
          .split(/[,|]/)
          .map((option) => option.trim())
          .filter(Boolean),
      };
    })
    .filter((variant) => variant.name && variant.options.length);
  return variants.length ? variants : undefined;
}

function parseList(value: string) {
  return value
    .split(/[,|;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function productsFromRows(rows: ImportRow[]): StoreProduct[] {
  return rows.map((row) => {
    const name = rowString(row, "name") || rowString(row, "product name");
    const price = Number(rowString(row, "price") || 0);
    const stockValue = rowString(row, "stock_quantity") || rowString(row, "stock");
    const stock = stockValue ? Number(stockValue) : undefined;
    const variants = parseVariants(rowString(row, "variants"));
    const perks = parseList(rowString(row, "perks"));
    const statusValue = rowString(row, "status").toLowerCase();
    const cover = rowString(row, "image_url") || rowString(row, "image") || null;
    const imagesFromRow = rowString(row, "images")
      .split(/[|;]/)
      .map((item) => item.trim())
      .filter(Boolean);
    const images = normalizeProductImages(imagesFromRow, cover);

    return {
      id: uid(),
      slug: slugify(rowString(row, "slug") || name || "product"),
      name,
      description: rowString(row, "description"),
      price: Number.isFinite(price) ? price : -1,
      currency: (rowString(row, "currency") || "NGN").toUpperCase(),
      image_url: images[0] ?? null,
      images: images.length ? images : null,
      sku: rowString(row, "sku") || undefined,
      brand: rowString(row, "brand") || null,
      category: rowString(row, "category") || undefined,
      stock_quantity: Number.isFinite(stock) ? stock : undefined,
      status:
        statusValue === "draft" || statusValue === "archived"
          ? statusValue
          : "active",
      variants,
      perks: perks.length ? perks : undefined,
    };
  });
}

type CategoryTreeNode = {
  category: StoreCategory;
  children: StoreCategory[];
};

function buildCategoryTree(categories: StoreCategory[]): CategoryTreeNode[] {
  const childrenByParent = new Map<string, StoreCategory[]>();
  const roots: StoreCategory[] = [];

  for (const category of categories) {
    if (category.parent_id) {
      const siblings = childrenByParent.get(category.parent_id) ?? [];
      siblings.push(category);
      childrenByParent.set(category.parent_id, siblings);
    } else {
      roots.push(category);
    }
  }

  const sortByOrder = (a: StoreCategory, b: StoreCategory) =>
    (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name);

  const rootIds = new Set(roots.map((category) => category.id));
  // Orphan children (parent missing from list) show as roots so they stay selectable.
  for (const category of categories) {
    if (category.parent_id && !rootIds.has(category.parent_id) && !roots.some((root) => root.id === category.id)) {
      const parentStillListed = categories.some((item) => item.id === category.parent_id);
      if (!parentStillListed) roots.push(category);
    }
  }

  return roots.sort(sortByOrder).map((category) => ({
    category,
    children: (childrenByParent.get(category.id) ?? []).sort(sortByOrder),
  }));
}

function selectedCategoryMatchIds(
  selectedCategoryIds: string[],
  categories: StoreCategory[],
): Set<string> {
  const matchIds = new Set(selectedCategoryIds);
  if (!selectedCategoryIds.length) return matchIds;

  for (const category of categories) {
    if (category.parent_id && matchIds.has(category.parent_id)) {
      matchIds.add(category.id);
    }
  }
  return matchIds;
}

function productMatchesCategories(
  product: StoreProduct,
  selectedCategoryIds: string[],
  categories: StoreCategory[],
): boolean {
  if (selectedCategoryIds.length === 0) return true;

  const matchIds = selectedCategoryMatchIds(selectedCategoryIds, categories);

  if (product.category_id) {
    return matchIds.has(product.category_id);
  }

  if (!product.category) return false;

  return categories
    .filter((category) => matchIds.has(category.id))
    .some((category) => category.name.toLowerCase() === product.category!.toLowerCase());
}

function productCountForCategory(
  products: StoreProduct[],
  category: StoreCategory,
  categories: StoreCategory[] = [],
) {
  const matchIds = selectedCategoryMatchIds([category.id], categories);

  return products.filter((product) => {
    if (product.category_id) {
      return matchIds.has(product.category_id);
    }
    if (!product.category) return false;
    return categories
      .filter((entry) => matchIds.has(entry.id))
      .some((entry) => entry.name.toLowerCase() === product.category!.toLowerCase());
  }).length;
}

function isColorVariantName(name: string) {
  return /^(colou?rs?)$/i.test(name.trim());
}

function variantOptionValue(
  option: NonNullable<StoreProduct["variants"]>[number]["options"][number],
): string {
  return typeof option === "string" ? option : option.value;
}

function collectColorOptions(products: StoreProduct[]): string[] {
  const colors = new Set<string>();
  for (const product of products) {
    for (const variant of product.variants ?? []) {
      if (!isColorVariantName(variant.name)) continue;
      for (const option of variant.options) {
        const trimmed = variantOptionValue(option).trim();
        if (trimmed) colors.add(trimmed);
      }
    }
  }
  return Array.from(colors).sort((a, b) => a.localeCompare(b));
}

function collectBrandOptions(products: StoreProduct[]): string[] {
  const brands = new Set<string>();
  for (const product of products) {
    const brand = product.brand?.trim();
    if (brand) brands.add(brand);
  }
  return Array.from(brands).sort((a, b) => a.localeCompare(b));
}

function productHasColor(product: StoreProduct, color: string): boolean {
  const needle = color.toLowerCase();
  return (product.variants ?? []).some(
    (variant) =>
      isColorVariantName(variant.name) &&
      variant.options.some(
        (option) => variantOptionValue(option).trim().toLowerCase() === needle,
      ),
  );
}

function productHasVariantGroup(product: StoreProduct, groupName: string): boolean {
  return (product.variants ?? []).some(
    (variant) =>
      variant.name.trim().toLowerCase() === groupName.trim().toLowerCase() &&
      variant.options.some((option) => variantOptionValue(option).trim()),
  );
}

const COLOR_SWATCHES: Record<string, string> = {
  black: "#111111",
  white: "#f5f5f5",
  red: "#dc2626",
  blue: "#2563eb",
  navy: "#1e3a8a",
  green: "#16a34a",
  olive: "#6b7c3c",
  yellow: "#eab308",
  orange: "#ea580c",
  pink: "#ec4899",
  purple: "#9333ea",
  brown: "#92400e",
  beige: "#d6c3a5",
  grey: "#9ca3af",
  gray: "#9ca3af",
  gold: "#d4af37",
  silver: "#c0c0c0",
};

function colorSwatch(color: string): string {
  const key = color.trim().toLowerCase();
  if (COLOR_SWATCHES[key]) return COLOR_SWATCHES[key];
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(key)) return key;
  return "#cbd5e1";
}

type ProductFiltersPanelProps = {
  categories: StoreCategory[];
  categoryTree: CategoryTreeNode[];
  products: StoreProduct[];
  selectedCategoryIds: string[];
  expandedCategoryIds: Set<string>;
  toggleCategoryExpanded: (categoryId: string) => void;
  toggleCategorySelected: (categoryId: string, checked: boolean) => void;
  brandOptions: string[];
  selectedBrands: string[];
  setSelectedBrands: Dispatch<SetStateAction<string[]>>;
  minPrice: string;
  maxPrice: string;
  setMinPrice: Dispatch<SetStateAction<string>>;
  setMaxPrice: Dispatch<SetStateAction<string>>;
  priceBounds: { min: number; max: number };
  priceBarLeft: number;
  priceBarRight: number;
  priceRangeSpan: number;
  activeMinPrice: number;
  activeMaxPrice: number;
  defaultCurrency: string;
  colorOptions: string[];
  selectedColors: string[];
  setSelectedColors: Dispatch<SetStateAction<string[]>>;
  inStockOnly: boolean;
  setInStockOnly: Dispatch<SetStateAction<boolean>>;
  inventoryCount: number;
  variantOptions: string[];
  selectedVariantGroups: string[];
  setSelectedVariantGroups: Dispatch<SetStateAction<string[]>>;
  onClearAll: () => void;
  /** When true, drop the outer card chrome (used inside the mobile sheet). */
  embedded?: boolean;
};

function ProductFiltersPanel({
  categories,
  categoryTree,
  products,
  selectedCategoryIds,
  expandedCategoryIds,
  toggleCategoryExpanded,
  toggleCategorySelected,
  brandOptions,
  selectedBrands,
  setSelectedBrands,
  minPrice,
  maxPrice,
  setMinPrice,
  setMaxPrice,
  priceBounds,
  priceBarLeft,
  priceBarRight,
  priceRangeSpan,
  activeMinPrice,
  activeMaxPrice,
  defaultCurrency,
  colorOptions,
  selectedColors,
  setSelectedColors,
  inStockOnly,
  setInStockOnly,
  inventoryCount,
  variantOptions,
  selectedVariantGroups,
  setSelectedVariantGroups,
  onClearAll,
  embedded = false,
}: ProductFiltersPanelProps) {
  return (
        <div
          className={
            embedded
              ? "bg-white"
              : "rounded-2xl border border-border/80 bg-white p-4"
          }
        >
          {embedded ? null : (
          <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
            <h2 className="text-sm font-semibold">Filters</h2>
            <button
                type="button"
                onClick={onClearAll}
                className="rounded-md p-1 text-ink-soft hover:bg-secondary hover:text-ink"
                aria-label="Clear filters"
              >
              <X className="h-4 w-4" />
            </button>
          </div>
          )}

          <div className="space-y-5 py-4">
            <div>
              <div className="mb-3 flex items-center justify-between text-sm font-semibold">
                <span>Categories</span>
                <Link href="/admin/categories" className="text-xs font-medium text-primary">
                  Manage
                </Link>
              </div>
              {categories.length ? (
                <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                  {categoryTree.map(({ category, children }) => {
                    const count = productCountForCategory(products, category, categories);
                    const checked = selectedCategoryIds.includes(category.id);
                    const expanded = expandedCategoryIds.has(category.id);
                    const hasChildren = children.length > 0;

                    return (
                      <div key={category.id} className="space-y-1">
                        <div className="flex items-center gap-1">
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={() => toggleCategoryExpanded(category.id)}
                              className="grid h-5 w-5 shrink-0 place-items-center rounded text-ink-soft hover:bg-secondary hover:text-ink"
                              aria-label={
                                expanded
                                  ? `Collapse ${category.name} subcategories`
                                  : `Expand ${category.name} subcategories`
                              }
                              aria-expanded={expanded}
                            >
                              <ChevronRight
                                className={`h-3.5 w-3.5 transition ${expanded ? "rotate-90" : ""}`}
                              />
                            </button>
                          ) : (
                            <span className="h-5 w-5 shrink-0" />
                          )}
                          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-xs text-ink-soft">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCategorySelected(category.id, checked)}
                              className="h-3.5 w-3.5 accent-primary"
                            />
                            <span className="truncate">
                              {category.name} ({count})
                            </span>
                          </label>
                        </div>

                        {hasChildren && expanded ? (
                          <div className="ml-5 space-y-1 border-l border-border/70 pl-2">
                            {children.map((child) => {
                              const childCount = productCountForCategory(
                                products,
                                child,
                                categories,
                              );
                              const childChecked = selectedCategoryIds.includes(child.id);
                              return (
                                <label
                                  key={child.id}
                                  className="flex cursor-pointer items-center gap-2 py-0.5 text-xs text-ink-soft"
                                >
                                  <input
                                    type="checkbox"
                                    checked={childChecked}
                                    onChange={() =>
                                      toggleCategorySelected(child.id, childChecked)
                                    }
                                    className="h-3.5 w-3.5 accent-primary"
                                  />
                                  <span className="truncate">
                                    {child.name} ({childCount})
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-ink-soft">
                  No categories yet.{" "}
                  <Link href="/admin/categories" className="font-medium text-primary">
                    Create categories
                  </Link>{" "}
                  to filter your catalog.
                </p>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <div className="mb-3 flex items-center justify-between text-sm font-semibold">
                <span>Brands</span>
                {selectedBrands.length ? (
                  <button
                    type="button"
                    onClick={() => setSelectedBrands([])}
                    className="text-ink-soft hover:text-ink"
                    aria-label="Clear brand filters"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              {brandOptions.length ? (
                <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                  {brandOptions.map((brand) => {
                    const checked = selectedBrands.includes(brand);
                    const count = products.filter(
                      (product) =>
                        product.brand?.trim().toLowerCase() === brand.toLowerCase(),
                    ).length;
                    return (
                      <label
                        key={brand}
                        className="flex cursor-pointer items-center gap-2 text-xs text-ink-soft"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedBrands((current) =>
                              checked
                                ? current.filter((item) => item !== brand)
                                : [...current, brand],
                            )
                          }
                          className="h-3.5 w-3.5 accent-primary"
                        />
                        <span className="truncate">
                          {brand} ({count})
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-ink-soft">
                  Add a brand on products to filter by brand here.
                </p>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <div className="mb-3 flex items-center justify-between text-sm font-semibold">
                <span>Price</span>
                {minPrice || maxPrice ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMinPrice("");
                      setMaxPrice("");
                    }}
                    className="text-ink-soft hover:text-ink"
                    aria-label="Clear price filter"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-1 text-[11px] text-ink-soft">
                  From
                  <Input
                    type="number"
                    min={0}
                    value={minPrice}
                    onChange={(event) => setMinPrice(event.target.value)}
                    placeholder={String(Math.floor(priceBounds.min))}
                    className="h-10 rounded-xl text-xs"
                  />
                </label>
                <label className="space-y-1 text-[11px] text-ink-soft">
                  To
                  <Input
                    type="number"
                    min={0}
                    value={maxPrice}
                    onChange={(event) => setMaxPrice(event.target.value)}
                    placeholder={String(Math.ceil(priceBounds.max))}
                    className="h-10 rounded-xl text-xs"
                  />
                </label>
              </div>
              {priceBounds.max > priceBounds.min ? (
                <div className="mt-4 space-y-3">
                  <div className="relative h-1.5 rounded-full bg-primary/15">
                    <div
                      className="absolute inset-y-0 rounded-full bg-primary"
                      style={{ left: `${priceBarLeft}%`, right: `${priceBarRight}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="range"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      step={Math.max(1, Math.round(priceRangeSpan / 100))}
                      value={Number.isFinite(activeMinPrice) ? activeMinPrice : priceBounds.min}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        const capped = Math.min(next, activeMaxPrice);
                        setMinPrice(String(Math.round(capped)));
                      }}
                      className="w-full accent-primary"
                      aria-label="Minimum price"
                    />
                    <input
                      type="range"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      step={Math.max(1, Math.round(priceRangeSpan / 100))}
                      value={Number.isFinite(activeMaxPrice) ? activeMaxPrice : priceBounds.max}
                      onChange={(event) => {
                        const next = Number(event.target.value);
                        const capped = Math.max(next, activeMinPrice);
                        setMaxPrice(String(Math.round(capped)));
                      }}
                      className="w-full accent-primary"
                      aria-label="Maximum price"
                    />
                  </div>
                  <p className="text-[11px] text-ink-soft">
                    {formatMoney(Number.isFinite(activeMinPrice) ? activeMinPrice : priceBounds.min, defaultCurrency)}{" "}
                    –{" "}
                    {formatMoney(Number.isFinite(activeMaxPrice) ? activeMaxPrice : priceBounds.max, defaultCurrency)}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="border-t border-border pt-4">
              <div className="mb-3 flex items-center justify-between text-sm font-semibold">
                <span>Colors</span>
                {selectedColors.length ? (
                  <button
                    type="button"
                    onClick={() => setSelectedColors([])}
                    className="text-ink-soft hover:text-ink"
                    aria-label="Clear color filters"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              {colorOptions.length ? (
                <div className="grid grid-cols-2 gap-2">
                  {colorOptions.map((color) => {
                    const checked = selectedColors.includes(color);
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() =>
                          setSelectedColors((current) =>
                            checked
                              ? current.filter((item) => item !== color)
                              : [...current, color],
                          )
                        }
                        className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-left text-xs transition ${
                          checked
                            ? "border-primary bg-primary/5 text-ink"
                            : "border-border text-ink-soft hover:border-primary/40"
                        }`}
                      >
                        <span
                          className="h-4 w-4 shrink-0 rounded-full border border-black/10"
                          style={{ backgroundColor: colorSwatch(color) }}
                        />
                        <span className="truncate">{color}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-ink-soft">
                  Add a Color variant (e.g. Color: Black, White) on products to filter here.
                </p>
              )}
            </div>

            <div className="border-t border-border pt-4">
              <div className="mb-3 flex items-center justify-between text-sm font-semibold">
                <span>Availability</span>
                {inStockOnly || selectedVariantGroups.length ? (
                  <button
                    type="button"
                    onClick={() => {
                      setInStockOnly(false);
                      setSelectedVariantGroups([]);
                    }}
                    className="text-ink-soft hover:text-ink"
                    aria-label="Clear availability filters"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs text-ink-soft">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(event) => setInStockOnly(event.target.checked)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  In stock ({inventoryCount})
                </label>
                {variantOptions.map((variant) => {
                  const checked = selectedVariantGroups.includes(variant);
                  return (
                    <label
                      key={variant}
                      className="flex cursor-pointer items-center gap-2 text-xs text-ink-soft"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setSelectedVariantGroups((current) =>
                            checked
                              ? current.filter((item) => item !== variant)
                              : [...current, variant],
                          )
                        }
                        className="h-3.5 w-3.5 accent-primary"
                      />
                      Has {variant}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
  );
}

export default function AdminProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { locationId, selectedLabel } = useLocationScope();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const categoryIdFromUrl = searchParams.get("category_id");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(() =>
    categoryIdFromUrl ? [categoryIdFromUrl] : [],
  );
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(new Set());
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedVariantGroups, setSelectedVariantGroups] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | undefined>();
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<ProductImportReport | null>(null);
  const [importReportOpen, setImportReportOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(12);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const storeQuery = useStoreMe({ enabled: !!user });

  const store = storeQuery.data;

  useEffect(() => {
    if (storeQuery.isFetched && !storeQuery.data && user) {
      router.replace("/admin/onboarding");
    }
  }, [storeQuery.isFetched, storeQuery.data, user, router]);

  const productsQuery = useProducts(store?.id, { enabled: !!store });
  const categoriesQuery = useCategories(store?.id, { enabled: !!store });
  const ordersQuery = useProductOrderStats(store?.id, { enabled: !!store });

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const categories = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const brandOptions = useMemo(() => collectBrandOptions(products), [products]);
  const colorOptions = useMemo(() => collectColorOptions(products), [products]);
  const priceBounds = useMemo(() => {
    if (!products.length) return { min: 0, max: 0 };
    const prices = products.map((product) => product.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [products]);
  const variantOptions = useMemo(() => {
    const names = products.flatMap(
      (product) => product.variants?.map((variant) => variant.name) ?? [],
    );
    return Array.from(new Set(names))
      .filter((name) => !isColorVariantName(name))
      .slice(0, 8);
  }, [products]);

  const activeMinPrice = minPrice.trim() ? Number(minPrice) : priceBounds.min;
  const activeMaxPrice = maxPrice.trim() ? Number(maxPrice) : priceBounds.max;
  const priceRangeSpan = Math.max(priceBounds.max - priceBounds.min, 1);
  const priceBarLeft = Math.max(
    0,
    Math.min(100, ((activeMinPrice - priceBounds.min) / priceRangeSpan) * 100),
  );
  const priceBarRight = Math.max(
    0,
    Math.min(100, ((priceBounds.max - activeMaxPrice) / priceRangeSpan) * 100),
  );

  useEffect(() => {
    setExpandedCategoryIds((current) => {
      const next = new Set(current);
      let changed = false;
      for (const node of categoryTree) {
        if (!node.children.length) continue;
        const childSelected = node.children.some((child) => selectedCategoryIds.includes(child.id));
        const parentSelected = selectedCategoryIds.includes(node.category.id);
        if ((childSelected || parentSelected) && !next.has(node.category.id)) {
          next.add(node.category.id);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [categoryTree, selectedCategoryIds]);

  useEffect(() => {
    const raw = searchParams.get("category_id");
    if (!raw) return;
    if (!categories.some((category) => category.id === raw)) return;
    setSelectedCategoryIds((current) => (current.includes(raw) ? current : [raw]));
  }, [categories, searchParams]);

  function toggleCategoryExpanded(categoryId: string) {
    setExpandedCategoryIds((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }

  function toggleCategorySelected(categoryId: string, checked: boolean) {
    setSelectedCategoryIds((current) =>
      checked ? current.filter((item) => item !== categoryId) : [...current, categoryId],
    );
  }
  const filteredProducts = products.filter((product) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      [product.name, product.description, product.category, product.sku, product.brand]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    const productStatus = product.status ?? "active";
    const matchesStatus = statusFilter === "all" || productStatus === statusFilter;
    const matchesCategory = productMatchesCategories(product, selectedCategoryIds, categories);
    const min = minPrice.trim() ? Number(minPrice) : null;
    const max = maxPrice.trim() ? Number(maxPrice) : null;
    const matchesPrice =
      (min === null || !Number.isFinite(min) || product.price >= min) &&
      (max === null || !Number.isFinite(max) || product.price <= max);
    const matchesStock = !inStockOnly || (product.stock_quantity ?? 0) > 0;
    const matchesBrand =
      !selectedBrands.length ||
      (product.brand != null &&
        selectedBrands.some((brand) => brand.toLowerCase() === product.brand!.trim().toLowerCase()));
    const matchesColor =
      !selectedColors.length ||
      selectedColors.some((color) => productHasColor(product, color));
    const matchesVariants =
      !selectedVariantGroups.length ||
      selectedVariantGroups.every((group) => productHasVariantGroup(product, group));
    return (
      matchesSearch &&
      matchesStatus &&
      matchesCategory &&
      matchesPrice &&
      matchesStock &&
      matchesBrand &&
      matchesColor &&
      matchesVariants
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = filteredProducts.length ? (currentPage - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(currentPage * pageSize, filteredProducts.length);
  const pagedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [currentPage, filteredProducts, pageSize]);
  const pageButtons = useMemo(
    () => visiblePageNumbers(currentPage, totalPages),
    [currentPage, totalPages],
  );

  useEffect(() => {
    setPage(1);
  }, [
    search,
    statusFilter,
    selectedCategoryIds,
    selectedBrands,
    selectedColors,
    selectedVariantGroups,
    minPrice,
    maxPrice,
    inStockOnly,
    pageSize,
  ]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const activeCount = products.filter((product) => (product.status ?? "active") === "active").length;
  const draftCount = products.filter((product) => product.status === "draft").length;
  const archivedCount = products.filter((product) => product.status === "archived").length;
  const lowStockCount = products.filter(
    (product) =>
      typeof product.stock_quantity === "number" &&
      product.stock_quantity > 0 &&
      product.stock_quantity <= LOW_STOCK_THRESHOLD,
  ).length;
  const inventoryCount = products.reduce((sum, product) => sum + (product.stock_quantity ?? 0), 0);

  const catalogProducts = useMemo(
    () => products.filter((product) => (product.status ?? "active") !== "archived"),
    [products],
  );
  const defaultCurrency = catalogProducts[0]?.currency ?? "NGN";
  const totalRetailValue = catalogProducts.reduce((sum, product) => sum + product.price, 0);
  const totalInventoryValue = catalogProducts.reduce(
    (sum, product) => sum + product.price * (product.stock_quantity ?? 0),
    0,
  );
  const productsSold = useMemo(() => {
    const orders = ordersQuery.data?.data ?? [];
    return orders
      .filter((order) => order.status !== "cancelled" && order.payment_status !== "refunded")
      .reduce(
        (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0,
      );
  }, [ordersQuery.data]);
  const outOfStockCount = catalogProducts.filter(
    (product) => typeof product.stock_quantity === "number" && product.stock_quantity <= 0,
  ).length;

  const saveProduct = useMutation({
    mutationFn: async (product: StoreProduct) => {
      if (editingProduct) {
        const { id: _id, ...payload } = product;
        return api.updateProduct(editingProduct.id, payload);
      }
      const { id: _id, ...payload } = product;
      return api.createProduct(payload);
    },
    onSuccess: () => {
      merchantInvalidators.products(queryClient);
      merchantInvalidators.categories(queryClient);
      merchantInvalidators.storefront(queryClient);
      setLastUpdated(new Date());
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save product"),
  });

  const duplicateProduct = useMutation({
    mutationFn: (productId: string) => api.duplicateProduct(productId),
    onSuccess: () => {
      merchantInvalidators.products(queryClient);
      setLastUpdated(new Date());
      toast.success("Product duplicated as draft.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not duplicate product"),
  });

  const archiveProduct = useMutation({
    mutationFn: ({ productId, archived }: { productId: string; archived: boolean }) =>
      api.updateProduct(productId, { status: archived ? "archived" : "active" }),
    onSuccess: () => {
      merchantInvalidators.products(queryClient);
      setLastUpdated(new Date());
      toast.success("Product updated.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update product"),
  });

  const deleteProduct = useMutation({
    mutationFn: (productId: string) => api.deleteProduct(productId),
    onSuccess: () => {
      merchantInvalidators.products(queryClient);
      setLastUpdated(new Date());
      toast.success("Product deleted.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete product"),
  });

  // Batch operations
  function toggleProductSelection(productId: string) {
    setSelectedProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedProductIds((prev) => {
      if (prev.size === filteredProducts.length) return new Set();
      return new Set(filteredProducts.map((p) => p.id));
    });
  }

  function clearSelection() {
    setSelectedProductIds(new Set());
  }

  const selectedCount = selectedProductIds.size;
  const allSelected = selectedCount > 0 && selectedCount === filteredProducts.length;

  async function batchDelete() {
    const confirmed = await confirm(`Delete ${selectedCount} product(s)?`, {
      description: "This action cannot be undone.",
      confirmLabel: "Delete all",
      destructive: true,
    });
    if (!confirmed) return;
    const ids = [...selectedProductIds];
    for (const id of ids) {
      try { await api.deleteProduct(id); } catch { /* continue */ }
    }
    merchantInvalidators.products(queryClient);
    setLastUpdated(new Date());
    clearSelection();
    toast.success(`${ids.length} product(s) deleted.`);
  }

  async function batchArchive(archived: boolean) {
    const ids = [...selectedProductIds];
    for (const id of ids) {
      try { await api.updateProduct(id, { status: archived ? "archived" : "active" }); } catch { /* continue */ }
    }
    merchantInvalidators.products(queryClient);
    setLastUpdated(new Date());
    clearSelection();
    toast.success(`${ids.length} product(s) ${archived ? "archived" : "restored"}.`);
  }

  function openNewProduct() {
    setEditingProduct(undefined);
    setDialogOpen(true);
  }

  function openEditProduct(product: StoreProduct) {
    setEditingProduct(product);
    setDialogOpen(true);
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImporting(true);
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: "" });

      if (!rows.length) {
        toast.error("No rows found in that file.");
        return;
      }

      const importedProducts = productsFromRows(rows);

      const report = await api.importProducts(importedProducts);
      merchantInvalidators.products(queryClient);
      merchantInvalidators.categories(queryClient);
      merchantInvalidators.storefront(queryClient);
      setLastUpdated(new Date());

      if (report.imported > 0 && store) {
        merchantCache.setProducts(queryClient, store.id, report.data);
      }

      if (report.failed > 0) {
        setImportReport(report);
        setImportReportOpen(true);
        if (report.imported > 0) {
          toast.warning(
            `${report.imported} products imported, ${report.failed} row${report.failed === 1 ? "" : "s"} skipped.`,
          );
        } else {
          toast.error("Import failed. Fix the highlighted rows and try again.");
        }
        return;
      }

      toast.success(`${report.imported} products imported.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not import products");
    } finally {
      setImporting(false);
    }
  }

  if (storeQuery.isLoading || productsQuery.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!store) return null;

  function clearAllFilters() {
    setSelectedCategoryIds([]);
    setSelectedBrands([]);
    setSelectedColors([]);
    setSelectedVariantGroups([]);
    setMinPrice("");
    setMaxPrice("");
    setInStockOnly(false);
  }

  const activeFilterCount =
    selectedCategoryIds.length +
    selectedBrands.length +
    selectedColors.length +
    selectedVariantGroups.length +
    (minPrice.trim() || maxPrice.trim() ? 1 : 0) +
    (inStockOnly ? 1 : 0);

  const filterPanelProps: ProductFiltersPanelProps = {
    categories,
    categoryTree,
    products,
    selectedCategoryIds,
    expandedCategoryIds,
    toggleCategoryExpanded,
    toggleCategorySelected,
    brandOptions,
    selectedBrands,
    setSelectedBrands,
    minPrice,
    maxPrice,
    setMinPrice,
    setMaxPrice,
    priceBounds,
    priceBarLeft,
    priceBarRight,
    priceRangeSpan,
    activeMinPrice,
    activeMaxPrice,
    defaultCurrency,
    colorOptions,
    selectedColors,
    setSelectedColors,
    inStockOnly,
    setInStockOnly,
    inventoryCount,
    variantOptions,
    selectedVariantGroups,
    setSelectedVariantGroups,
    onClearAll: clearAllFilters,
  };

  return (
    <TooltipProvider delayDuration={150}>
    <div className="w-full bg-[#f7f7f5] px-4 py-6 text-[#171717] sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[28px] border border-border/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-3 border-b border-border/70 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Products</h1>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="text-ink-soft/60 transition hover:text-ink-soft"
                    aria-label="About product metrics"
                  >
                    <CircleHelp className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-56 bg-[#3f3f46] text-white">
                  The total selling price of all your products.
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="mt-1 block text-xs text-ink-soft">
              {locationId === "all"
                ? "Track catalog value, sales, and stock health at a glance."
                : `${selectedLabel}: catalog and stock are shared across all store locations.`}
            </span>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-xs font-medium text-ink-soft shadow-sm">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span className="truncate">Last updated: {formatUpdatedDate(lastUpdated)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 border-b border-border/70 px-4 py-4 sm:gap-3 sm:px-6 xl:grid-cols-4">
          <AdminStatCard
            value={formatMoneyDetailed(totalRetailValue, defaultCurrency)}
            compactValue={formatMoneyCompact(totalRetailValue, defaultCurrency)}
            label="Total Retail Value"
            tooltip="The total selling price of all your products."
            backgroundClassName="bg-[#edf3ff]"
            icon={<span className="text-lg font-bold text-ink">₦</span>}
          />
          <AdminStatCard
            value={formatMoneyDetailed(totalInventoryValue, defaultCurrency)}
            compactValue={formatMoneyCompact(totalInventoryValue, defaultCurrency)}
            label="Total Inventory Value"
            tooltip="The retail value of all units currently in stock."
            backgroundClassName="bg-[#edf8f0]"
            icon={<span className="text-lg font-bold text-ink">₦</span>}
          />
          <AdminStatCard
            value={String(productsSold)}
            label="Products Sold"
            tooltip="Total units sold across completed and active orders."
            backgroundClassName="bg-[#fdf0f0]"
            icon={<Tag className="h-5 w-5 text-[#d14343]" />}
          />
          <AdminStatCard
            value={String(outOfStockCount)}
            label="Out of Stock"
            tooltip="Products with zero units left in inventory."
            backgroundClassName="bg-[#edf3ff]"
            icon={<Package className="h-5 w-5 text-[#3b6fd8]" />}
          />
        </div>

        <div className="grid gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden border-b border-border/70 bg-white p-5 lg:block lg:border-b-0 lg:border-r">
            <ProductFiltersPanel {...filterPanelProps} />
          </aside>

          <main className="min-w-0 bg-[#fbfbfa] p-4 sm:p-5">
            <div className="rounded-2xl border border-border/80 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3">
                <div className="grid w-full grid-cols-2 gap-1 overflow-hidden rounded-xl border border-border bg-[#f7f7f5] p-1 text-xs font-semibold sm:inline-grid sm:w-auto sm:grid-cols-4">
                  {[
                    { value: "all", label: "All", count: products.length },
                    { value: "active", label: "Active", count: activeCount },
                    { value: "draft", label: "Draft", count: draftCount },
                    { value: "archived", label: "Archived", count: archivedCount },
                  ].map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setStatusFilter(tab.value as StatusFilter)}
                      className={`rounded-lg px-3 py-2 transition sm:px-5 ${
                        statusFilter === tab.value
                          ? "bg-white text-ink shadow-sm"
                          : "text-ink-soft hover:text-ink"
                      }`}
                    >
                      {tab.label}
                      <span className="ml-1 text-[10px] text-ink-soft">{tab.count}</span>
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                  <div className="relative w-full min-w-0 flex-1 sm:max-w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search product"
                      className="h-10 rounded-xl bg-white pl-9 text-xs"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="relative h-10 rounded-xl lg:hidden"
                      onClick={() => setFiltersOpen(true)}
                    >
                      <Filter className="h-4 w-4" />
                      Filters
                      {activeFilterCount > 0 ? (
                        <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                          {activeFilterCount}
                        </span>
                      ) : null}
                    </Button>
                    <label className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-ink shadow-sm hover:bg-secondary sm:flex-none sm:px-4">
                      {importing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      Upload
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        className="sr-only"
                        onChange={(event) => void handleImport(event)}
                        disabled={importing || saveProduct.isPending}
                      />
                    </label>
                    {lowStockCount > 0 ? (
                      <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-800">
                        {lowStockCount} low stock
                      </span>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setScanDialogOpen(true)}
                      className="h-10 flex-1 rounded-xl sm:flex-none"
                    >
                      <ScanBarcode className="h-4 w-4" />
                      Scan to add
                    </Button>
                    <Button
                      onClick={openNewProduct}
                      className="h-10 flex-1 rounded-xl bg-[#1f1f1f] text-white sm:flex-none"
                    >
                      <Plus className="h-4 w-4" />
                      New Product
                    </Button>
                  </div>
                </div>
              </div>

              {selectedCount > 0 ? (
                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-3 sm:flex-row sm:items-center sm:px-4">
                  <span className="text-sm font-semibold text-ink">{selectedCount} selected</span>
                  <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                    <Button size="sm" variant="outline" onClick={() => batchArchive(true)}>
                      <Archive className="mr-1 h-3.5 w-3.5" />
                      Archive
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => batchArchive(false)}>
                      <ArchiveRestore className="mr-1 h-3.5 w-3.5" />
                      Restore
                    </Button>
                    <Button size="sm" variant="destructive" onClick={batchDelete}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Delete
                    </Button>
                    <Button size="sm" variant="ghost" onClick={clearSelection}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : null}

              {filteredProducts.length ? (
                <div className="mt-2 flex items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-2 text-xs text-ink-soft">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                    Select all
                  </label>
                </div>
              ) : null}

              {filteredProducts.length ? (
                <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4">
                  {pagedProducts.map((product) => {
                    const inventory = stockBadge(product);
                    const isArchived = product.status === "archived";
                    return (
                      <article
                        key={product.id}
                        className={`group relative overflow-hidden rounded-2xl border bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft sm:p-3 ${selectedProductIds.has(product.id) ? "border-primary ring-2 ring-primary/20" : "border-border/80"}`}
                      >
                        <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedProductIds.has(product.id)}
                            onChange={() => toggleProductSelection(product.id)}
                            className="h-4 w-4 rounded border-border accent-primary"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="h-1.5 w-4 rounded-full bg-primary" />
                          <span className="h-1.5 w-1.5 rounded-full bg-primary/30" />
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="absolute right-2 top-2 z-10 rounded-full p-2 text-ink-soft hover:bg-secondary hover:text-ink"
                              aria-label={`Actions for ${product.name}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => openEditProduct(product)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => duplicateProduct.mutate(product.id)}
                              disabled={duplicateProduct.isPending}
                            >
                              <Copy className="h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                archiveProduct.mutate({ productId: product.id, archived: !isArchived })
                              }
                            >
                              {isArchived ? (
                                <>
                                  <ArchiveRestore className="h-4 w-4" />
                                  Restore
                                </>
                              ) : (
                                <>
                                  <Archive className="h-4 w-4" />
                                  Archive
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={async () => {
                                const confirmed = await confirm(`Delete ${product.name}?`, {
                                  description: "This action cannot be undone.",
                                  confirmLabel: "Delete",
                                  destructive: true,
                                });
                                if (confirmed) {
                                  deleteProduct.mutate(product.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <button
                          type="button"
                          onClick={() => openEditProduct(product)}
                          className="grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-xl bg-[#f4f4f2]"
                        >
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-full w-full object-contain object-center transition group-hover:scale-105"
                            />
                          ) : (
                            <div className="grid h-20 w-20 place-items-center rounded-2xl bg-gradient-hero text-3xl font-bold text-primary-foreground">
                              {product.name.slice(0, 1)}
                            </div>
                          )}
                        </button>
                        <div className="pt-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold">{product.name}</h3>
                            <p className="mt-1 text-xs font-medium text-ink">
                              {formatMoney(product.price, product.currency)}
                            </p>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <span className="rounded-full bg-secondary px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                              {product.status ?? "active"}
                            </span>
                            {product.category ? (
                              <span className="rounded-full bg-secondary px-2 py-1 text-[10px] text-ink-soft">
                                {product.category}
                              </span>
                            ) : null}
                            {inventory ? (
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] font-semibold ${inventory.className}`}
                              >
                                {inventory.label}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="grid min-h-80 place-items-center px-5 py-12 text-center">
                  <div>
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-secondary">
                      <Package className="h-6 w-6 text-ink-soft" />
                    </div>
                    <h3 className="mt-4 font-display text-lg font-semibold">No products found</h3>
                    <p className="mt-2 max-w-sm text-sm text-ink-soft">
                      Adjust the filters, add a product manually, or upload a CSV/XLSX catalog.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                      <Button variant="outline" onClick={() => setScanDialogOpen(true)}>
                        <ScanBarcode className="h-4 w-4" />
                        Scan to add
                      </Button>
                      <Button onClick={openNewProduct}>
                        <Plus className="h-4 w-4" />
                        Add product
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {filteredProducts.length ? (
              <div className="mt-5 flex flex-col gap-3 text-xs text-ink-soft sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                  <div className="flex items-center gap-2">
                    <span>Show</span>
                    <select
                      className="h-8 rounded-lg border border-border bg-white px-2 text-xs text-ink"
                      value={pageSize}
                      onChange={(event) => setPageSize(Number(event.target.value))}
                      aria-label="Products per page"
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                    <span>Per Page</span>
                  </div>
                  <span>
                    Showing {pageStart}–{pageEnd} of {filteredProducts.length}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-1 sm:justify-end">
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={currentPage <= 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {pageButtons.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setPage(pageNumber)}
                      className={`grid h-8 w-8 place-items-center rounded-lg ${
                        pageNumber === currentPage
                          ? "bg-[#1f1f1f] text-white"
                          : "hover:bg-secondary"
                      }`}
                      aria-label={`Page ${pageNumber}`}
                      aria-current={pageNumber === currentPage ? "page" : undefined}
                    >
                      {pageNumber}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={currentPage >= totalPages}
                    aria-label="Next page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              ) : null}
            </div>
          </main>
        </div>
      </section>


      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="left" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-sm">
          <SheetHeader className="border-b border-border px-5 py-4 pr-12 text-left">
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>
              Narrow your catalog by category, brand, price, and availability.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            <ProductFiltersPanel {...filterPanelProps} embedded />
          </div>
          <SheetFooter className="border-t border-border bg-white p-4 sm:flex-col sm:space-x-0">
            <Button type="button" className="w-full" onClick={() => setFiltersOpen(false)}>
              Show {filteredProducts.length} result{filteredProducts.length === 1 ? "" : "s"}
            </Button>
            {activeFilterCount > 0 ? (
              <Button type="button" variant="ghost" className="w-full" onClick={clearAllFilters}>
                Clear all filters
              </Button>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ProductScanAddDialog
        open={scanDialogOpen}
        onOpenChange={setScanDialogOpen}
        existingProducts={products}
        currency={defaultCurrency}
        onCreated={() => {
          merchantInvalidators.products(queryClient);
          merchantInvalidators.storefront(queryClient);
          setLastUpdated(new Date());
          setStatusFilter("archived");
        }}
        onEditProduct={(product) => {
          setScanDialogOpen(false);
          openEditProduct(product);
        }}
      />

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingProduct(undefined);
        }}
        editingProduct={editingProduct}
        categoryTree={categoryTree}
        brandOptions={brandOptions}
        isSaving={saveProduct.isPending}
        onSave={async (product) => {
          await saveProduct.mutateAsync(product);
        }}
        uploadImage={async (file) => {
          if (!store) throw new Error("Store not loaded.");
          const { url } = await api.uploadStorefrontImage(store.id, file);
          return url;
        }}
        onCreateCategory={async ({ name, parent_id }) => {
          const created = await api.createCategory({
            name,
            parent_id: parent_id || null,
          });
          merchantInvalidators.categories(queryClient);
          merchantInvalidators.products(queryClient);
          await categoriesQuery.refetch();
          return created;
        }}
      />

      <Dialog open={importReportOpen} onOpenChange={setImportReportOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import report</DialogTitle>
            <DialogDescription>
              {importReport
                ? `${importReport.imported} imported, ${importReport.failed} skipped`
                : "Review the rows that could not be imported."}
            </DialogDescription>
          </DialogHeader>
          {importReport?.errors.length ? (
            <ul className="space-y-3 text-sm">
              {importReport.errors.map((error, index) => (
                <li
                  key={`${error.row}-${error.field ?? "row"}-${index}`}
                  className="rounded-lg border border-border bg-background px-3 py-2"
                >
                  <p className="font-medium">
                    Row {error.row}
                    {error.field ? ` · ${error.field}` : ""}
                  </p>
                  <p className="mt-1 text-ink-soft">{error.message}</p>
                </li>
              ))}
            </ul>
          ) : null}
          <DialogFooter>
            <Button type="button" onClick={() => setImportReportOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
