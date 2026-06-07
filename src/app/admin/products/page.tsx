"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit3,
  ImagePlus,
  Loader2,
  Package,
  Plus,
  Search,
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
import type { Store, StoreProduct, StorefrontContent } from "@/lib/api/types";

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

function createStarterStorefront(store: Store): StorefrontContent {
  const description =
    store.description || `Tell customers what makes ${store.business_name} special.`;

  return {
    template: {
      id:
        store.storefront_template_id && store.storefront_template_id !== "ai_pick"
          ? store.storefront_template_id
          : "classic",
      source: "merchant_selected",
    },
    data_plugs: {
      home_products_source: "merchant_products",
    },
    hero: {
      headline: `Welcome to ${store.business_name}`,
      subheadline: description,
      cta_label: "Shop now",
    },
    about: {
      title: `About ${store.business_name}`,
      body: description,
    },
    value_props: [
      { title: "Quality products", body: "Describe why customers should trust this store." },
      { title: "Fast fulfilment", body: "Explain how orders are prepared and delivered." },
      { title: "Helpful support", body: "Tell customers how buyers can get help." },
    ],
    pages: {
      about: {
        title: `About ${store.business_name}`,
        body: description,
        source: "merchant",
      },
      contact: {
        title: "Contact us",
        body: "Have a question? Send us a message and we will get back to you shortly.",
        email: null,
        phone: null,
        source: "merchant",
      },
      faq: {
        title: "Frequently asked questions",
        source: "merchant",
        items: [
          {
            question: "How do I place an order?",
            answer: "Browse products, add items to your cart, and complete checkout.",
          },
        ],
      },
      privacy_policy: {
        title: "Privacy policy",
        body: `This privacy policy explains how ${store.business_name} collects, uses, and protects customer information.`,
        source: "platform_default",
      },
    },
    products: [],
    seo: {
      title: `${store.business_name} | Online Store`,
      description: description.slice(0, 150),
    },
  };
}

function formFromProduct(product?: StoreProduct): ProductForm {
  if (!product) return { ...blankForm, variants: [...blankForm.variants], perks: [...blankForm.perks] };

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

function productsFromRows(rows: ImportRow[]) {
  return rows
    .map((row) => {
      const name = rowString(row, "name") || rowString(row, "product name");
      if (!name) return null;
      const price = Number(rowString(row, "price") || 0);
      const stockValue = rowString(row, "stock_quantity") || rowString(row, "stock");
      const stock = stockValue ? Number(stockValue) : undefined;
      const variants = parseVariants(rowString(row, "variants"));
      const perks = parseList(rowString(row, "perks"));

      return {
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
      } satisfies StoreProduct;
    })
    .filter((product): product is StoreProduct => Boolean(product));
}

export default function AdminProductsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | undefined>();
  const [form, setForm] = useState<ProductForm>(blankForm);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [importing, setImporting] = useState(false);

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

  const storefrontQuery = useQuery({
    queryKey: ["storefront", store?.id],
    queryFn: () => api.getStorefront(store!.id),
    enabled: !!store,
  });

  const storefront = useMemo(() => {
    if (!store) return null;
    return storefrontQuery.data ?? createStarterStorefront(store);
  }, [store, storefrontQuery.data]);

  const products = storefront?.products ?? [];
  const filteredProducts = products.filter((product) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [product.name, product.description, product.category, product.sku]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  const activeCount = products.filter((product) => (product.status ?? "active") === "active").length;
  const draftCount = products.length - activeCount;
  const inventoryCount = products.reduce((sum, product) => sum + (product.stock_quantity ?? 0), 0);

  const saveProducts = useMutation({
    mutationFn: async (nextProducts: StoreProduct[]) => {
      if (!store || !storefront) throw new Error("Storefront is not ready.");
      const nextStorefront: StorefrontContent = {
        ...storefront,
        products: nextProducts,
      };
      return api.updateStorefront(store.id, {
        storefront: nextStorefront,
        storefront_template_id: nextStorefront.template?.id,
      });
    },
    onSuccess: (updatedStorefront) => {
      if (store) queryClient.setQueryData(["storefront", store.id], updatedStorefront);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save products"),
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
    const nextProducts = editingProduct
      ? products.map((item) => (item.id === editingProduct.id ? product : item))
      : [product, ...products];

    await saveProducts.mutateAsync(nextProducts);
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

      await saveProducts.mutateAsync([...importedProducts, ...products]);
      toast.success(`${importedProducts.length} products imported.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not import products");
    } finally {
      setImporting(false);
    }
  }

  if (storeQuery.isLoading || storefrontQuery.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!store || !storefront) return null;

  return (
    <div className="w-full px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header>
          <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            Catalog
          </span>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Products</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            Add products, keep stock visible, define product options, and capture perks customers
            care about before checkout.
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-ink shadow-soft hover:bg-secondary">
            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload list
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="sr-only"
              onChange={(event) => void handleImport(event)}
              disabled={importing || saveProducts.isPending}
            />
          </label>
          <Button onClick={openNewProduct}>
            <Plus className="h-4 w-4" />
            Add product
          </Button>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="text-sm font-medium text-ink-soft">Total products</div>
          <div className="mt-2 font-display text-3xl font-bold">{products.length}</div>
          <p className="mt-2 text-xs text-ink-soft">{activeCount} active in the storefront.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="text-sm font-medium text-ink-soft">Tracked stock</div>
          <div className="mt-2 font-display text-3xl font-bold">{inventoryCount}</div>
          <p className="mt-2 text-xs text-ink-soft">Across products with stock quantities.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="text-sm font-medium text-ink-soft">Draft products</div>
          <div className="mt-2 font-display text-3xl font-bold">{draftCount}</div>
          <p className="mt-2 text-xs text-ink-soft">Keep unfinished products out of launch plans.</p>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold">Product list</h2>
            <p className="text-sm text-ink-soft">
              Import columns: name, description, price, currency, image_url, category, stock,
              variants, perks, sku.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products"
              className="pl-9"
            />
          </div>
        </div>

        {filteredProducts.length ? (
          <div className="divide-y divide-border">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="grid gap-4 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
              >
                <div className="flex min-w-0 gap-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary text-lg font-bold text-ink-soft">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      product.name.slice(0, 1)
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-display text-base font-semibold">
                        {product.name}
                      </h3>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                        {product.status ?? "active"}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
                      {product.description || "No description yet."}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink-soft">
                      <span>{formatMoney(product.price, product.currency)}</span>
                      {product.category ? <span>{product.category}</span> : null}
                      {typeof product.stock_quantity === "number" ? (
                        <span>{product.stock_quantity} in stock</span>
                      ) : null}
                      {product.variants?.length ? (
                        <span>{product.variants.length} option groups</span>
                      ) : null}
                      {product.perks?.length ? <span>{product.perks.length} perks</span> : null}
                    </div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => openEditProduct(product)}>
                  <Edit3 className="h-4 w-4" />
                  Edit
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid min-h-72 place-items-center px-5 py-12 text-center">
            <div>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-secondary">
                <Package className="h-5 w-5 text-ink-soft" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">No products found</h3>
              <p className="mt-2 max-w-sm text-sm text-ink-soft">
                Add your first product manually or upload a CSV/XLSX list to build the catalog faster.
              </p>
              <Button className="mt-5" onClick={openNewProduct}>
                <Plus className="h-4 w-4" />
                Add product
              </Button>
            </div>
          </div>
        )}
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
                  onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
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
                  onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))}
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
                  onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))}
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
                  <p className="text-xs text-ink-soft">Use groups like Size: S, M, L or Color: Black.</p>
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
                  <p className="text-xs text-ink-soft">Highlight benefits like warranty or free delivery.</p>
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
              <Button type="submit" disabled={saveProducts.isPending}>
                {saveProducts.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {editingProduct ? "Save product" : "Add product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
