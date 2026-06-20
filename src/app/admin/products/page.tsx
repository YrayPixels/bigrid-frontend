"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  ImagePlus,
  Loader2,
  MoreVertical,
  Package,
  Plus,
  Search,
  Star,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api/client";
import type { Store, StoreProduct } from "@/lib/api/types";

type ProductForm = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  price: string;
  currency: string;
  image_url: string;
  sku: string;
  category: string;
  stock_quantity: string;
  status: "active" | "draft";
  variants: { name: string; options: string }[];
  perks: string[];
};

type ImportRow = Record<string, unknown>;
type StatusFilter = "all" | "active" | "draft";

const blankForm: ProductForm = {
  name: "",
  slug: "",
  description: "",
  price: "",
  currency: "NGN",
  image_url: "",
  sku: "",
  category: "",
  stock_quantity: "",
  status: "active",
  variants: [{ name: "Size", options: "" }],
  perks: [""],
};

function formatMoney(value: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
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
    return { ...blankForm, variants: [...blankForm.variants], perks: [...blankForm.perks] };

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    price: String(product.price),
    currency: product.currency || "NGN",
    image_url: product.image_url ?? "",
    sku: product.sku ?? "",
    category: product.category ?? "",
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

  return {
    id: existing?.id ?? form.id ?? uid(),
    slug,
    name,
    description: form.description.trim(),
    price: Number.isFinite(price) ? price : 0,
    currency: form.currency.trim().toUpperCase() || "NGN",
    image_url: form.image_url.trim() || null,
    sku: form.sku.trim() || undefined,
    category: form.category.trim() || undefined,
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
  return rows
    .map<StoreProduct | null>((row) => {
      const name = rowString(row, "name") || rowString(row, "product name");
      if (!name) return null;
      const price = Number(rowString(row, "price") || 0);
      const stockValue = rowString(row, "stock_quantity") || rowString(row, "stock");
      const stock = stockValue ? Number(stockValue) : undefined;
      const variants = parseVariants(rowString(row, "variants"));
      const perks = parseList(rowString(row, "perks"));

      const product: StoreProduct = {
        id: uid(),
        slug: slugify(rowString(row, "slug") || name),
        name,
        description: rowString(row, "description"),
        price: Number.isFinite(price) ? price : 0,
        currency: (rowString(row, "currency") || "NGN").toUpperCase(),
        image_url: rowString(row, "image_url") || rowString(row, "image") || null,
        sku: rowString(row, "sku") || undefined,
        category: rowString(row, "category") || undefined,
        stock_quantity: Number.isFinite(stock) ? stock : undefined,
        status: rowString(row, "status").toLowerCase() === "draft" ? "draft" : "active",
        variants,
        perks: perks.length ? perks : undefined,
      };
      return product;
    })
    .filter((product): product is StoreProduct => Boolean(product));
}

export default function AdminProductsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | undefined>();
  const [form, setForm] = useState<ProductForm>(blankForm);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(() => new Date());

  const storeQuery = useQuery({
    queryKey: ["store", "me"],
    queryFn: () => api.getMyStore(),
    enabled: !!user,
  });

  const store = storeQuery.data;

  useEffect(() => {
    if (storeQuery.isFetched && !storeQuery.data && user) {
      router.replace("/admin/onboarding");
    }
  }, [storeQuery.isFetched, storeQuery.data, user, router]);

  const productsQuery = useQuery({
    queryKey: ["products", store?.id],
    queryFn: () => api.getProducts(),
    enabled: !!store,
  });

  const products = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);
  const categoryOptions = useMemo(() => {
    const categories = products
      .map((product) => product.category)
      .filter((category): category is string => Boolean(category));
    const uniqueCategories = Array.from(new Set(categories));
    return uniqueCategories.length
      ? uniqueCategories
      : ["Clothing", "Shoes", "Bags", "Accessories", "Jewelry"];
  }, [products]);
  const variantOptions = useMemo(() => {
    const names = products.flatMap(
      (product) => product.variants?.map((variant) => variant.name) ?? [],
    );
    return Array.from(new Set(names)).slice(0, 5);
  }, [products]);
  const filteredProducts = products.filter((product) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      [product.name, product.description, product.category, product.sku]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
    const productStatus = product.status ?? "active";
    const matchesStatus = statusFilter === "all" || productStatus === statusFilter;
    const matchesCategory =
      selectedCategories.length === 0 ||
      (product.category ? selectedCategories.includes(product.category) : false);
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    const matchesPrice =
      (min === null || product.price >= min) && (max === null || product.price <= max);
    const matchesStock = !inStockOnly || (product.stock_quantity ?? 0) > 0;
    return matchesSearch && matchesStatus && matchesCategory && matchesPrice && matchesStock;
  });

  const activeCount = products.filter(
    (product) => (product.status ?? "active") === "active",
  ).length;
  const draftCount = products.length - activeCount;
  const inventoryCount = products.reduce((sum, product) => sum + (product.stock_quantity ?? 0), 0);

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
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["storefront"] });
      setLastUpdated(new Date());
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save product"),
  });

  function openNewProduct() {
    setEditingProduct(undefined);
    setForm({ ...blankForm, variants: [...blankForm.variants], perks: [...blankForm.perks] });
    setDialogOpen(true);
  }

  function openEditProduct(product: StoreProduct) {
    setEditingProduct(product);
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
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !store) return;
    setUploadingImage(true);
    try {
      const { url } = await api.uploadStorefrontImage(store.id, file);
      setForm((current) => ({ ...current, image_url: url }));
      toast.success("Image uploaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload image");
    } finally {
      setUploadingImage(false);
    }
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
      const importedProducts = productsFromRows(rows);

      if (!importedProducts.length) {
        toast.error("No products found in that file.");
        return;
      }

      await api.importProducts(importedProducts);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["storefront"] });
      setLastUpdated(new Date());
      toast.success(`${importedProducts.length} products imported.`);
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
    <div className="w-full bg-[#f7f7f5] px-4 py-6 text-[#171717] sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[28px] border border-border/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-soft">
              Catalog
            </span>
            <h1 className="mt-1 font-display text-xl font-bold tracking-tight">
              Product list page
            </h1>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-xs font-medium text-ink-soft shadow-sm">
            <CalendarDays className="h-4 w-4" />
            Last updated: {formatUpdatedDate(lastUpdated)}
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="border-b border-border/70 bg-white p-5 lg:border-b-0 lg:border-r">
            <div className="rounded-2xl border border-border/80 bg-white p-4">
              <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
                <h2 className="text-sm font-semibold">Filters</h2>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategories([]);
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
                    <span>Type</span>
                    <X className="h-3.5 w-3.5 text-ink-soft" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {categoryOptions.slice(0, 6).map((category) => {
                      const checked = selectedCategories.includes(category);
                      return (
                        <label
                          key={category}
                          className="flex items-center gap-2 text-xs text-ink-soft"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedCategories((current) =>
                                checked
                                  ? current.filter((item) => item !== category)
                                  : [...current, category],
                              )
                            }
                            className="h-3.5 w-3.5 accent-primary"
                          />
                          {category}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="mb-3 flex items-center justify-between text-sm font-semibold">
                    <span>Brands</span>
                    <X className="h-3.5 w-3.5 text-ink-soft" />
                  </div>
                  <div className="max-h-36 space-y-2 overflow-y-auto pr-2">
                    {categoryOptions.map((category) => {
                      const count = products.filter(
                        (product) => product.category === category,
                      ).length;
                      const checked = selectedCategories.includes(category);
                      return (
                        <label
                          key={category}
                          className="flex items-center gap-2 text-xs text-ink-soft"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setSelectedCategories((current) =>
                                checked
                                  ? current.filter((item) => item !== category)
                                  : [...current, category],
                              )
                            }
                            className="h-3.5 w-3.5 accent-primary"
                          />
                          <span className="truncate">
                            {category} ({count})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="mb-3 flex items-center justify-between text-sm font-semibold">
                    <span>Price</span>
                    <X className="h-3.5 w-3.5 text-ink-soft" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="space-y-1 text-[11px] text-ink-soft">
                      From
                      <Input
                        type="number"
                        min="0"
                        value={minPrice}
                        onChange={(event) => setMinPrice(event.target.value)}
                        placeholder="0"
                        className="h-10 rounded-xl text-xs"
                      />
                    </label>
                    <label className="space-y-1 text-[11px] text-ink-soft">
                      To
                      <Input
                        type="number"
                        min="0"
                        value={maxPrice}
                        onChange={(event) => setMaxPrice(event.target.value)}
                        placeholder="50000"
                        className="h-10 rounded-xl text-xs"
                      />
                    </label>
                  </div>
                  <div className="mt-5 h-12 rounded-xl bg-[linear-gradient(90deg,transparent_0_5%,#f2ded8_5%_12%,transparent_12%_18%,#f2ded8_18%_30%,transparent_30%_35%,#f2ded8_35%_42%,transparent_42%_46%,#f2ded8_46%_60%,transparent_60%_64%,#f2ded8_64%_74%,transparent_74%_78%,#f2ded8_78%_88%,transparent_88%)]" />
                  <div className="mt-2 h-1 rounded-full bg-primary/20">
                    <div className="h-full rounded-full bg-primary" style={{ width: "82%" }} />
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="mb-3 flex items-center justify-between text-sm font-semibold">
                    <span>Colors Options</span>
                    <X className="h-3.5 w-3.5 text-ink-soft" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "#e64d3c",
                      "#f05a28",
                      "#f5c542",
                      "#4f8f63",
                      "#517da3",
                      "#5d54a4",
                      "#292929",
                      "#d7d7d7",
                      "#02a83a",
                    ].map((color) => (
                      <span
                        key={color}
                        className="h-4 w-4 rounded-full border border-white shadow ring-1 ring-border"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <div className="mb-3 flex items-center justify-between text-sm font-semibold">
                    <span>Availability</span>
                    <X className="h-3.5 w-3.5 text-ink-soft" />
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
                    {variantOptions.map((variant) => (
                      <label
                        key={variant}
                        className="flex items-center gap-2 text-xs text-ink-soft"
                      >
                        <input type="checkbox" className="h-3.5 w-3.5 accent-primary" />
                        Has {variant}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <main className="min-w-0 bg-[#fbfbfa] p-4 sm:p-5">
            <div className="rounded-2xl border border-border/80 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-grid overflow-hidden rounded-xl border border-border bg-[#f7f7f5] p-1 text-xs font-semibold sm:grid-cols-3">
                  {[
                    { value: "all", label: "All", count: products.length },
                    { value: "active", label: "Active", count: activeCount },
                    { value: "draft", label: "Non Active", count: draftCount },
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
                  <Button
                    onClick={openNewProduct}
                    className="h-10 rounded-xl bg-[#1f1f1f] text-white"
                  >
                    <Plus className="h-4 w-4" />
                    New Product
                  </Button>
                </div>
              </div>

              {filteredProducts.length ? (
                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {filteredProducts.map((product, index) => {
                    const rating = (4.4 + (index % 4) * 0.1).toFixed(1);
                    return (
                      <article
                        key={product.id}
                        className="group relative overflow-hidden rounded-2xl border border-border/80 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
                      >
                        <div className="absolute left-3 top-3 z-10 flex items-center gap-1">
                          <span className="h-1.5 w-4 rounded-full bg-primary" />
                          <span className="h-1.5 w-1.5 rounded-full bg-primary/30" />
                        </div>
                        <button
                          type="button"
                          onClick={() => openEditProduct(product)}
                          className="absolute right-2 top-2 z-10 rounded-full p-2 text-ink-soft hover:bg-secondary hover:text-ink"
                          aria-label={`Edit ${product.name}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditProduct(product)}
                          className="grid aspect-[4/3] w-full place-items-center overflow-hidden rounded-xl bg-[#f4f4f2]"
                        >
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="h-full w-full object-contain p-4 transition group-hover:scale-105"
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
                            {typeof product.stock_quantity === "number" ? (
                              <span className="rounded-full bg-secondary px-2 py-1 text-[10px] text-ink-soft">
                                {product.stock_quantity} left
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

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-ink-soft">
                <div className="flex items-center gap-2">
                  <span>Show</span>
                  <select className="h-8 rounded-lg border border-border bg-white px-2 text-xs text-ink">
                    <option>8</option>
                    <option>12</option>
                    <option>24</option>
                  </select>
                  <span>Per Page</span>
                </div>
                <div className="flex items-center gap-1">
                  <button className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {[1, 2, 3, 4, 5].map((page) => (
                    <button
                      key={page}
                      className={`grid h-8 w-8 place-items-center rounded-lg ${
                        page === 2 ? "bg-[#1f1f1f] text-white" : "hover:bg-secondary"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button className="grid h-8 w-8 place-items-center rounded-lg hover:bg-secondary">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
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
              <label className="space-y-2 text-sm font-medium md:col-span-2">
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
                <Input
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, category: event.target.value }))
                  }
                  placeholder="Hoodies"
                />
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
              <div className="flex flex-wrap items-end gap-3">
                <label className="min-w-0 flex-1 space-y-2 text-sm font-medium">
                  Image URL
                  <Input
                    value={form.image_url}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, image_url: event.target.value }))
                    }
                    placeholder="https://..."
                  />
                </label>
                <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent">
                  {uploadingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  Upload image
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(event) => void handleImageUpload(event)}
                    disabled={uploadingImage}
                  />
                </label>
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
    </div>
  );
}
