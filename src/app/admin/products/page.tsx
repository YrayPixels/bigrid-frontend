"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
  ImagePlus,
  Loader2,
  MoreVertical,
  Package,
  Plus,
  Search,
  Star,
  Tag,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { api } from "@/lib/api/client";
import type { ProductImportReport, Store, StoreCategory, StoreProduct } from "@/lib/api/types";

type ProductForm = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  sale_price: string;
  currency: string;
  images: string[];
  sku: string;
  brand: string;
  category_id: string;
  stock_quantity: string;
  status: "active" | "draft" | "archived";
  variants: { name: string; options: string }[];
  perks: string[];
};

type ImportRow = Record<string, unknown>;
type StatusFilter = "all" | "active" | "draft" | "archived";

const LOW_STOCK_THRESHOLD = 10;
const PAGE_SIZE_OPTIONS = [8, 12, 24] as const;

function visiblePageNumbers(current: number, total: number, windowSize = 5): number[] {
  if (total <= 0) return [];
  if (total <= windowSize) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, current - half);
  let end = Math.min(total, start + windowSize - 1);
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

const blankForm: ProductForm = {
  name: "",
  slug: "",
  description: "",
  price: "",
  sale_price: "",
  currency: "NGN",
  images: [],
  sku: "",
  brand: "",
  category_id: "",
  stock_quantity: "",
  status: "active",
  variants: [{ name: "Size", options: "" }],
  perks: [""],
};

const MAX_PRODUCT_IMAGES = 12;

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

function formFromProduct(product?: StoreProduct): ProductForm {
  if (!product)
    return { ...blankForm, variants: [...blankForm.variants], perks: [...blankForm.perks], images: [] };

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: String(product.price),
    sale_price: product.sale_price != null ? String(product.sale_price) : "",
    currency: product.currency || "NGN",
    images: normalizeProductImages(product.images, product.image_url),
    sku: product.sku ?? "",
    brand: product.brand ?? "",
    category_id: product.category_id ?? "",
    stock_quantity:
      typeof product.stock_quantity === "number" ? String(product.stock_quantity) : "",
    status: product.status ?? "active",
    variants: product.variants?.length
      ? product.variants.map((variant) => ({
          name: variant.name,
          options: variant.options.join(", "),
        }))
      : [{ name: "Size", options: "" }],
    perks: product.perks?.length ? [...product.perks] : [""],
  };
}

function productFromForm(form: ProductForm, existing?: StoreProduct): StoreProduct {
  const name = form.name.trim();
  const slug = slugify(form.slug || name);
  const price = Number(form.price);
  const salePrice = form.sale_price.trim() ? Number(form.sale_price) : undefined;
  const stock = form.stock_quantity.trim() ? Number(form.stock_quantity) : undefined;
  const variants = form.variants
    .map((variant) => ({
      name: variant.name.trim(),
      options: variant.options
        .split(",")
        .map((option) => option.trim())
        .filter(Boolean),
    }))
    .filter((variant) => variant.name && variant.options.length);
  const perks = form.perks.map((perk) => perk.trim()).filter(Boolean);
  const images = normalizeProductImages(form.images);

  return {
    id: existing?.id ?? form.id ?? uid(),
    slug,
    name,
    description: form.description.trim(),
    price: Number.isFinite(price) ? price : 0,
    sale_price: Number.isFinite(salePrice) ? salePrice : null,
    currency: form.currency.trim().toUpperCase() || "NGN",
    image_url: images[0] ?? null,
    images: images.length ? images : null,
    sku: form.sku.trim() || undefined,
    brand: form.brand.trim() || null,
    category_id: form.category_id || null,
    stock_quantity: Number.isFinite(stock) ? stock : undefined,
    status: form.status,
    variants: variants.length ? variants : undefined,
    perks: perks.length ? perks : undefined,
  };
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

function collectColorOptions(products: StoreProduct[]): string[] {
  const colors = new Set<string>();
  for (const product of products) {
    for (const variant of product.variants ?? []) {
      if (!isColorVariantName(variant.name)) continue;
      for (const option of variant.options) {
        const trimmed = option.trim();
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
      variant.options.some((option) => option.trim().toLowerCase() === needle),
  );
}

function productHasVariantGroup(product: StoreProduct, groupName: string): boolean {
  return (product.variants ?? []).some(
    (variant) =>
      variant.name.trim().toLowerCase() === groupName.trim().toLowerCase() &&
      variant.options.some((option) => option.trim()),
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

export default function AdminProductsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(new Set());
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedVariantGroups, setSelectedVariantGroups] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | undefined>();
  const [form, setForm] = useState<ProductForm>(blankForm);
  const [imageUrlDraft, setImageUrlDraft] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importReport, setImportReport] = useState<ProductImportReport | null>(null);
  const [importReportOpen, setImportReportOpen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(12);
  const [page, setPage] = useState(1);

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
        if (childSelected && !next.has(node.category.id)) {
          next.add(node.category.id);
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [categoryTree, selectedCategoryIds]);

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
      .filter((order) => !["cancelled", "refunded"].includes(order.status))
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
    setImageUrlDraft("");
    setForm({ ...blankForm, variants: [...blankForm.variants], perks: [...blankForm.perks], images: [] });
    setDialogOpen(true);
  }

  function openEditProduct(product: StoreProduct) {
    setEditingProduct(product);
    setImageUrlDraft("");
    setForm(formFromProduct(product));
    setDialogOpen(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) {
      toast.error("Product name is required.");
      return;
    }
    if (!form.price.trim() || Number(form.price) < 0) {
      toast.error("Enter a valid product price.");
      return;
    }

    const product = productFromForm(form, editingProduct);

    await saveProduct.mutateAsync(product);
    toast.success(editingProduct ? "Product updated." : "Product added.");
    setDialogOpen(false);
  }

  async function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length || !store) return;

    const remaining = MAX_PRODUCT_IMAGES - form.images.length;
    if (remaining <= 0) {
      toast.error(`You can add up to ${MAX_PRODUCT_IMAGES} images.`);
      return;
    }

    const toUpload = files.slice(0, remaining);
    setUploadingImage(true);
    try {
      const uploaded: string[] = [];
      for (const file of toUpload) {
        const { url } = await api.uploadStorefrontImage(store.id, file);
        uploaded.push(url);
      }
      setForm((current) => ({
        ...current,
        images: normalizeProductImages([...current.images, ...uploaded]),
      }));
      toast.success(
        uploaded.length === 1 ? "Image uploaded." : `${uploaded.length} images uploaded.`,
      );
      if (files.length > remaining) {
        toast.message(`Only ${remaining} more image(s) could be added (max ${MAX_PRODUCT_IMAGES}).`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload image");
    } finally {
      setUploadingImage(false);
    }
  }

  function removeImage(index: number) {
    setForm((current) => ({
      ...current,
      images: current.images.filter((_, itemIndex) => itemIndex !== index),
    }));
  }

  function moveImage(index: number, direction: -1 | 1) {
    setForm((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.images.length) return current;
      const images = [...current.images];
      const [item] = images.splice(index, 1);
      images.splice(nextIndex, 0, item);
      return { ...current, images };
    });
  }

  function setCoverImage(index: number) {
    setForm((current) => {
      if (index <= 0 || index >= current.images.length) return current;
      const images = [...current.images];
      const [item] = images.splice(index, 1);
      images.unshift(item);
      return { ...current, images };
    });
  }

  function addImageFromUrl(url: string) {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("Enter an image URL.");
      return false;
    }
    if (form.images.length >= MAX_PRODUCT_IMAGES) {
      toast.error(`You can add up to ${MAX_PRODUCT_IMAGES} images.`);
      return false;
    }
    if (form.images.includes(trimmed)) {
      toast.error("That image is already in the gallery.");
      return false;
    }
    setForm((current) => ({
      ...current,
      images: normalizeProductImages([...current.images, trimmed]),
    }));
    return true;
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

  return (
    <TooltipProvider delayDuration={150}>
    <div className="w-full bg-[#f7f7f5] px-4 py-6 text-[#171717] sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[28px] border border-border/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
          <div>
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
              Track catalog value, sales, and stock health at a glance.
            </span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-xs font-medium text-ink-soft shadow-sm">
            <CalendarDays className="h-4 w-4" />
            Last updated: {formatUpdatedDate(lastUpdated)}
          </div>
        </div>

        <div className="grid gap-3 border-b border-border/70 px-4 py-4 sm:grid-cols-2 sm:px-6 xl:grid-cols-4">
          <AdminStatCard
            value={formatMoneyDetailed(totalRetailValue, defaultCurrency)}
            label="Total Retail Value"
            tooltip="The total selling price of all your products."
            backgroundClassName="bg-[#edf3ff]"
            icon={<span className="text-lg font-bold text-ink">₦</span>}
          />
          <AdminStatCard
            value={formatMoneyDetailed(totalInventoryValue, defaultCurrency)}
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
          <aside className="border-b border-border/70 bg-white p-5 lg:border-b-0 lg:border-r">
            <div className="rounded-2xl border border-border/80 bg-white p-4">
              <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                <h2 className="text-sm font-semibold">Filters</h2>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryIds([]);
                    setSelectedBrands([]);
                    setSelectedColors([]);
                    setSelectedVariantGroups([]);
                    setMinPrice("");
                    setMaxPrice("");
                    setInStockOnly(false);
                  }}
                  className="rounded-md p-1 text-ink-soft hover:bg-secondary hover:text-ink"
                  aria-label="Clear filters"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

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
          </aside>

          <main className="min-w-0 bg-[#fbfbfa] p-4 sm:p-5">
            <div className="rounded-2xl border border-border/80 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-grid overflow-hidden rounded-xl border border-border bg-[#f7f7f5] p-1 text-xs font-semibold sm:grid-cols-4">
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
                      className={`rounded-lg px-5 py-2 transition ${
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

                <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                  <div className="relative min-w-48 flex-1 sm:max-w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search product"
                      className="h-10 rounded-xl bg-white pl-9 text-xs"
                    />
                  </div>
                  <Button variant="outline" className="h-10 rounded-xl">
                    <Filter className="h-4 w-4" />
                    Filter
                  </Button>
                  <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-ink shadow-sm hover:bg-secondary">
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
                    onClick={openNewProduct}
                    className="h-10 rounded-xl bg-[#1f1f1f] text-white"
                  >
                    <Plus className="h-4 w-4" />
                    New Product
                  </Button>
                </div>
              </div>

              {selectedCount > 0 ? (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
                  <span className="text-sm font-semibold text-ink">{selectedCount} selected</span>
                  <div className="ml-auto flex items-center gap-2">
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
                <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {pagedProducts.map((product, index) => {
                    const rating = (4.4 + (index % 4) * 0.1).toFixed(1);
                    const inventory = stockBadge(product);
                    const isArchived = product.status === "archived";
                    return (
                      <article
                        key={product.id}
                        className={`group relative overflow-hidden rounded-2xl border bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft ${selectedProductIds.has(product.id) ? "border-primary ring-2 ring-primary/20" : "border-border/80"}`}
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
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-semibold">{product.name}</h3>
                              <p className="mt-1 text-xs font-medium text-ink">
                                {formatMoney(product.price, product.currency)}
                              </p>
                            </div>
                            <div className="mt-5 flex shrink-0 items-center gap-1 text-xs font-semibold text-[#8fa447]">
                              <Star className="h-3.5 w-3.5 fill-current" />
                              {rating}
                            </div>
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
                    <Button className="mt-5" onClick={openNewProduct}>
                      <Plus className="h-4 w-4" />
                      Add product
                    </Button>
                  </div>
                </div>
              )}

              {filteredProducts.length ? (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-soft">
                <div className="flex flex-wrap items-center gap-3">
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
                <div className="flex items-center gap-1">
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit product" : "Add product"}</DialogTitle>
            <DialogDescription>
              Add the details customers need: price, images, stock, options, and selling points.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(event) => void handleSubmit(event)} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                Product name
                <Input
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                      slug: current.slug || slugify(event.target.value),
                    }))
                  }
                  placeholder="Oversized Hoodie"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Slug
                <Input
                  value={form.slug}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, slug: event.target.value }))
                  }
                  placeholder="oversized-hoodie"
                />
              </label>
            </div>

            <label className="space-y-2 text-sm font-medium">
              Description
              <Textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="A short product description for customers."
                className="min-h-24"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-4">
              <label className="space-y-2 text-sm font-medium">
                Price
                <Input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, price: event.target.value }))
                  }
                  placeholder="28500"
                  required
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Sale price
                <Input
                  type="number"
                  min="0"
                  value={form.sale_price}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sale_price: event.target.value }))
                  }
                  placeholder="Optional"
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Currency
                <Input
                  value={form.currency}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, currency: event.target.value }))
                  }
                  placeholder="NGN"
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Status
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as ProductForm["status"],
                    }))
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2 text-sm font-medium">
                Category
                <select
                  value={form.category_id}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, category_id: event.target.value }))
                  }
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.parent_name ? `${category.parent_name} / ` : ""}
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium">
                SKU
                <Input
                  value={form.sku}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sku: event.target.value }))
                  }
                  placeholder="HD-001"
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Brand
                <Input
                  value={form.brand}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, brand: event.target.value }))
                  }
                  placeholder="Nike"
                  list="product-brand-options"
                />
                <datalist id="product-brand-options">
                  {brandOptions.map((brand) => (
                    <option key={brand} value={brand} />
                  ))}
                </datalist>
              </label>
              <label className="space-y-2 text-sm font-medium">
                Stock quantity
                <Input
                  type="number"
                  min="0"
                  value={form.stock_quantity}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, stock_quantity: event.target.value }))
                  }
                  placeholder="25"
                />
              </label>
            </div>

            <div className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Product images</h3>
                  <p className="text-xs text-ink-soft">
                    Add up to {MAX_PRODUCT_IMAGES} images. The first image is the cover used on
                    cards and checkout.
                  </p>
                </div>
                <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent">
                  {uploadingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(event) => void handleImageUpload(event)}
                    disabled={uploadingImage || form.images.length >= MAX_PRODUCT_IMAGES}
                  />
                </label>
              </div>

              {form.images.length ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {form.images.map((image, index) => (
                    <div
                      key={`${image}-${index}`}
                      className="relative overflow-hidden rounded-lg border border-border bg-secondary/40"
                    >
                      <div className="aspect-square w-full">
                        <img
                          src={image}
                          alt={`Product image ${index + 1}`}
                          className="h-full w-full object-contain object-center"
                        />
                      </div>
                      {index === 0 ? (
                        <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                          Cover
                        </span>
                      ) : null}
                      <div className="flex items-center justify-between gap-1 border-t border-border bg-background/95 p-1.5">
                        <div className="flex items-center gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => moveImage(index, -1)}
                            disabled={index === 0}
                            aria-label="Move image earlier"
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => moveImage(index, 1)}
                            disabled={index === form.images.length - 1}
                            aria-label="Move image later"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-0.5">
                          {index > 0 ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              onClick={() => setCoverImage(index)}
                            >
                              Set cover
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeImage(index)}
                            aria-label="Remove image"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-ink-soft">
                  No images yet. Upload files or paste an image URL below.
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-end gap-3">
                <label className="min-w-0 flex-1 space-y-2 text-sm font-medium">
                  Add image URL
                  <Input
                    value={imageUrlDraft}
                    onChange={(event) => setImageUrlDraft(event.target.value)}
                    placeholder="https://..."
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        if (addImageFromUrl(imageUrlDraft)) setImageUrlDraft("");
                      }
                    }}
                  />
                </label>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (addImageFromUrl(imageUrlDraft)) setImageUrlDraft("");
                  }}
                  disabled={form.images.length >= MAX_PRODUCT_IMAGES}
                >
                  Add URL
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Variants</h3>
                  <p className="text-xs text-ink-soft">
                    Use groups like Size: S, M, L or Color: Black.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      variants: [...current.variants, { name: "", options: "" }],
                    }))
                  }
                >
                  Add variant
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {form.variants.map((variant, index) => (
                  <div key={index} className="grid gap-3 md:grid-cols-[0.7fr_1fr_auto]">
                    <Input
                      value={variant.name}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          variants: current.variants.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, name: event.target.value } : item,
                          ),
                        }))
                      }
                      placeholder="Size"
                    />
                    <Input
                      value={variant.options}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          variants: current.variants.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, options: event.target.value } : item,
                          ),
                        }))
                      }
                      placeholder="S, M, L"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          variants:
                            current.variants.length === 1
                              ? [{ name: "", options: "" }]
                              : current.variants.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Perks</h3>
                  <p className="text-xs text-ink-soft">
                    Highlight benefits like warranty or free delivery.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm((current) => ({ ...current, perks: [...current.perks, ""] }))
                  }
                >
                  Add perk
                </Button>
              </div>
              <div className="mt-4 space-y-3">
                {form.perks.map((perk, index) => (
                  <div key={index} className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <Input
                      value={perk}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          perks: current.perks.map((item, itemIndex) =>
                            itemIndex === index ? event.target.value : item,
                          ),
                        }))
                      }
                      placeholder="Free delivery in Lagos"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          perks:
                            current.perks.length === 1
                              ? [""]
                              : current.perks.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveProduct.isPending}>
                {saveProduct.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editingProduct ? "Save product" : "Add product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
