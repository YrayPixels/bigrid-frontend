"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  Info,
  Loader2,
  Percent,
  Plus,
  Save,
  Search,
  ShoppingCart,
  Tag,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type {
  CreateStoreDiscountInput,
  StoreDiscount,
  StoreDiscountStatus,
  StoreDiscountType,
  StoreDiscountValueType,
} from "@/lib/api/types";
import { useStoreMe } from "@/hooks/use-merchant-queries";
import { confirm } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const STORE_CURRENCY = "NGN";

/** Merchant-facing shape — maps to product/seasonal/cart_threshold on save. */
type DiscountKind = "catalog" | "cart";
type TargetMode = "all" | "specific";
type ListFilter = "all" | "live" | "draft" | "archived";

type DiscountForm = {
  name: string;
  kind: DiscountKind;
  discount_type: StoreDiscountValueType;
  discount_value: number;
  min_subtotal: number | null;
  target_mode: TargetMode;
  product_ids: string[];
  use_schedule: boolean;
  starts_at: string | null;
  ends_at: string | null;
  status: StoreDiscountStatus;
  priority: number;
};

const blankForm: DiscountForm = {
  name: "",
  kind: "catalog",
  discount_type: "percent",
  discount_value: 10,
  min_subtotal: null,
  target_mode: "all",
  product_ids: [],
  use_schedule: false,
  starts_at: null,
  ends_at: null,
  status: "active",
  priority: 0,
};

function formatMoney(value: number, currency = STORE_CURRENCY) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString()}`;
  }
}

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromLocalInput(value: string) {
  if (!value.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatDiscountValue(discount: Pick<StoreDiscount, "discount_type" | "discount_value">) {
  if (discount.discount_type === "percent") return `${discount.discount_value}% off`;
  return `${formatMoney(discount.discount_value)} off`;
}

function scheduleState(discount: StoreDiscount): "live" | "scheduled" | "expired" | "always" {
  const now = Date.now();
  const start = discount.starts_at ? new Date(discount.starts_at).getTime() : null;
  const end = discount.ends_at ? new Date(discount.ends_at).getTime() : null;

  if (start == null && end == null) {
    return discount.type === "seasonal" ? "expired" : "always";
  }
  if (start != null && now < start) return "scheduled";
  if (end != null && now > end) return "expired";
  return "live";
}

function isLiveNow(discount: StoreDiscount) {
  if (discount.status !== "active") return false;
  const state = scheduleState(discount);
  return state === "live" || state === "always";
}

function kindFromDiscount(discount: StoreDiscount): DiscountKind {
  return discount.type === "cart_threshold" ? "cart" : "catalog";
}

function typeLabel(type: StoreDiscountType) {
  if (type === "cart_threshold") return "Cart spend";
  if (type === "seasonal") return "Scheduled sale";
  return "Catalog sale";
}

function typeIcon(type: StoreDiscountType) {
  if (type === "cart_threshold") return ShoppingCart;
  if (type === "seasonal") return CalendarDays;
  return Tag;
}

function formFromDiscount(discount: StoreDiscount): DiscountForm {
  const kind = kindFromDiscount(discount);
  const productIds = discount.product_ids ?? [];
  const hasSchedule = Boolean(discount.starts_at || discount.ends_at) || discount.type === "seasonal";

  return {
    name: discount.name,
    kind,
    discount_type: discount.discount_type,
    discount_value: discount.discount_value,
    min_subtotal: discount.min_subtotal ?? null,
    target_mode: kind === "cart" || productIds.length === 0 ? "all" : "specific",
    product_ids: productIds,
    use_schedule: kind === "catalog" ? hasSchedule : false,
    starts_at: discount.starts_at ?? null,
    ends_at: discount.ends_at ?? null,
    status: discount.status,
    priority: discount.priority ?? 0,
  };
}

function toApiPayload(form: DiscountForm): CreateStoreDiscountInput {
  const startsAt = form.kind === "catalog" && form.use_schedule ? form.starts_at : null;
  const endsAt = form.kind === "catalog" && form.use_schedule ? form.ends_at : null;
  const type: StoreDiscountType =
    form.kind === "cart" ? "cart_threshold" : startsAt || endsAt ? "seasonal" : "product";

  return {
    name: form.name.trim(),
    type,
    discount_type: form.discount_type,
    discount_value: Number(form.discount_value) || 0,
    min_subtotal:
      form.kind === "cart"
        ? form.min_subtotal != null
          ? Number(form.min_subtotal)
          : 0
        : null,
    product_ids:
      form.kind === "cart" || form.target_mode === "all"
        ? []
        : form.product_ids.filter(Boolean),
    starts_at: startsAt,
    ends_at: endsAt,
    status: form.status,
    priority: form.priority ?? 0,
  };
}

function scheduleBadge(discount: StoreDiscount) {
  if (discount.status !== "active") return null;
  const state = scheduleState(discount);
  if (state === "live" || state === "always") {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">Live</Badge>;
  }
  if (state === "scheduled") {
    return <Badge variant="secondary">Scheduled</Badge>;
  }
  if (state === "expired") {
    return <Badge variant="outline">Expired</Badge>;
  }
  return null;
}

export default function AdminDiscountsPage() {
  const queryClient = useQueryClient();
  const storeQuery = useStoreMe();
  const productsQuery = useQuery({
    queryKey: ["merchant-products"],
    queryFn: () => api.getProducts(),
  });
  const discountsQuery = useQuery({
    queryKey: ["merchant-discounts"],
    queryFn: () => api.listDiscounts(),
  });

  const [form, setForm] = useState<DiscountForm>(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [listFilter, setListFilter] = useState<ListFilter>("all");

  const products = productsQuery.data ?? [];
  const discounts = discountsQuery.data ?? [];

  const selectedProductIds = useMemo(
    () => new Set(form.product_ids),
    [form.product_ids],
  );

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return products;
    return products.filter((product) => product.name.toLowerCase().includes(query));
  }, [products, productSearch]);

  const productNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const product of products) map.set(product.id, product.name);
    return map;
  }, [products]);

  const filteredDiscounts = useMemo(() => {
    return discounts.filter((discount) => {
      if (listFilter === "all") return discount.status !== "archived";
      if (listFilter === "live") return isLiveNow(discount);
      if (listFilter === "draft") return discount.status === "draft";
      return discount.status === "archived";
    });
  }, [discounts, listFilter]);

  const counts = useMemo(() => {
    let live = 0;
    let draft = 0;
    let archived = 0;
    for (const discount of discounts) {
      if (discount.status === "archived") archived += 1;
      else if (discount.status === "draft") draft += 1;
      if (isLiveNow(discount)) live += 1;
    }
    return {
      all: discounts.filter((d) => d.status !== "archived").length,
      live,
      draft,
      archived,
    };
  }, [discounts]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = toApiPayload(form);
      if (!payload.name) throw new Error("Give this discount a name.");
      if (payload.discount_value <= 0) throw new Error("Discount value must be greater than zero.");
      if (payload.discount_type === "percent" && payload.discount_value > 100) {
        throw new Error("Percent discounts cannot exceed 100%.");
      }
      if (form.kind === "catalog" && form.use_schedule && !payload.starts_at && !payload.ends_at) {
        throw new Error("Add a start or end date, or turn off the schedule.");
      }
      if (
        payload.starts_at &&
        payload.ends_at &&
        new Date(payload.starts_at) > new Date(payload.ends_at)
      ) {
        throw new Error("End date must be after the start date.");
      }
      if (
        form.kind === "catalog" &&
        form.target_mode === "specific" &&
        payload.product_ids?.length === 0
      ) {
        throw new Error("Select at least one product, or apply to the whole catalog.");
      }
      if (editingId) return api.updateDiscount(editingId, payload);
      return api.createDiscount(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-discounts"] });
      resetForm();
      toast.success(editingId ? "Discount updated." : "Discount created.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save discount"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StoreDiscountStatus }) =>
      api.updateDiscount(id, { status }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["merchant-discounts"] });
      if (editingId === variables.id) {
        setForm((current) => ({ ...current, status: variables.status }));
      }
      toast.success(
        variables.status === "archived"
          ? "Discount archived."
          : variables.status === "active"
            ? "Discount restored."
            : "Discount updated.",
      );
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not update discount"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteDiscount(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["merchant-discounts"] });
      if (editingId === id) resetForm();
      toast.success("Discount deleted.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not delete discount"),
  });

  function resetForm() {
    setEditingId(null);
    setForm(blankForm);
    setProductSearch("");
  }

  function editDiscount(discount: StoreDiscount) {
    setEditingId(discount.id);
    setProductSearch("");
    setForm(formFromDiscount(discount));
  }

  async function handleArchive(discount: StoreDiscount) {
    const ok = await confirm(`Archive ${discount.name}?`, {
      description: "Archived discounts stop applying to customers. You can restore them later.",
      confirmLabel: "Archive",
      destructive: true,
    });
    if (!ok) return;
    statusMutation.mutate({ id: discount.id, status: "archived" });
  }

  async function handleRestore(discount: StoreDiscount) {
    statusMutation.mutate({ id: discount.id, status: "active" });
  }

  async function handleDelete(discount: StoreDiscount) {
    const ok = await confirm(`Delete ${discount.name}?`, {
      description: "This permanently removes the discount. This cannot be undone.",
      confirmLabel: "Delete forever",
      destructive: true,
    });
    if (!ok) return;
    deleteMutation.mutate(discount.id);
  }

  function toggleProduct(productId: string, next: boolean) {
    setForm((current) => {
      const ids = new Set(current.product_ids);
      if (next) ids.add(productId);
      else ids.delete(productId);
      return { ...current, product_ids: [...ids] };
    });
  }

  function selectAllVisible() {
    setForm((current) => {
      const ids = new Set(current.product_ids);
      for (const product of filteredProducts) ids.add(product.id);
      return { ...current, target_mode: "specific", product_ids: [...ids] };
    });
  }

  function clearSelectedProducts() {
    setForm((current) => ({ ...current, product_ids: [] }));
  }

  const filterTabs: { id: ListFilter; label: string; count: number }[] = [
    { id: "all", label: "Active", count: counts.all },
    { id: "live", label: "Live now", count: counts.live },
    { id: "draft", label: "Draft", count: counts.draft },
    { id: "archived", label: "Archived", count: counts.archived },
  ];

  return (
    <div className="w-full px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <header>
          <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">Catalog</span>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Discounts</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft">
            Run catalog sales and cart spend rewards for{" "}
            {storeQuery.data?.business_name ?? "your store"}.
          </p>
        </header>
        {editingId ? (
          <Button variant="outline" onClick={resetForm}>
            <Plus className="mr-2 h-4 w-4" />
            New discount
          </Button>
        ) : null}
      </div>

      <div className="mt-6 flex gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm text-ink-soft">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="font-medium text-ink">How discounts stack</p>
          <p>
            Product sale prices apply first. Then the best matching catalog/scheduled sale is
            chosen. Cart spend rewards apply last on the cart subtotal — only the best cart
            reward wins.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" />
              {editingId ? "Edit discount" : "Create discount"}
            </CardTitle>
            <CardDescription>
              Choose a catalog sale for products, or a cart reward that unlocks after a minimum
              spend.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  {
                    id: "catalog" as const,
                    title: "Catalog sale",
                    description: "Lower prices on products — all or selected.",
                    icon: Tag,
                  },
                  {
                    id: "cart" as const,
                    title: "Cart spend reward",
                    description: "Unlock a discount after a minimum cart total.",
                    icon: ShoppingCart,
                  },
                ] as const
              ).map((option) => {
                const Icon = option.icon;
                const selected = form.kind === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        kind: option.id,
                        use_schedule: option.id === "catalog" ? current.use_schedule : false,
                        target_mode: option.id === "cart" ? "all" : current.target_mode,
                      }))
                    }
                    className={cn(
                      "rounded-xl border p-4 text-left transition",
                      selected
                        ? "border-primary bg-primary/5 shadow-soft"
                        : "border-border hover:bg-secondary/50",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        selected ? "text-primary" : "text-ink-soft",
                      )}
                    />
                    <p className="mt-2 text-sm font-semibold text-ink">{option.title}</p>
                    <p className="mt-1 text-xs text-ink-soft">{option.description}</p>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount-name">Name</Label>
              <Input
                id="discount-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder={form.kind === "cart" ? "Spend ₦50k, save 10%" : "Summer sale"}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Value type</Label>
                <Select
                  value={form.discount_type}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      discount_type: value as StoreDiscountValueType,
                    }))
                  }
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent off</SelectItem>
                    <SelectItem value="fixed">Fixed amount off</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount-value">
                  {form.discount_type === "percent" ? "Percent" : `Amount (${STORE_CURRENCY})`}
                </Label>
                <Input
                  id="discount-value"
                  type="number"
                  min={0}
                  max={form.discount_type === "percent" ? 100 : undefined}
                  value={form.discount_value}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      discount_value: Number(event.target.value),
                    }))
                  }
                />
              </div>
            </div>

            {form.kind === "cart" ? (
              <div className="space-y-2">
                <Label htmlFor="min-subtotal">Minimum cart total ({STORE_CURRENCY})</Label>
                <Input
                  id="min-subtotal"
                  type="number"
                  min={0}
                  value={form.min_subtotal ?? ""}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      min_subtotal: event.target.value === "" ? null : Number(event.target.value),
                    }))
                  }
                  placeholder="50000"
                />
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <Label>Applies to</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        {
                          id: "all" as const,
                          title: "Whole catalog",
                          description: "Every product gets this discount.",
                        },
                        {
                          id: "specific" as const,
                          title: "Selected products",
                          description: "Pick which products are included.",
                        },
                      ] as const
                    ).map((option) => {
                      const selected = form.target_mode === option.id;
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              target_mode: option.id,
                              product_ids: option.id === "all" ? [] : current.product_ids,
                            }))
                          }
                          className={cn(
                            "rounded-xl border px-3 py-3 text-left transition",
                            selected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-secondary/50",
                          )}
                        >
                          <p className="text-sm font-semibold text-ink">{option.title}</p>
                          <p className="mt-0.5 text-xs text-ink-soft">{option.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {form.target_mode === "specific" ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <Label>Products</Label>
                      <div className="flex flex-wrap gap-3 text-xs font-medium">
                        <button
                          type="button"
                          className="text-primary hover:underline"
                          onClick={selectAllVisible}
                        >
                          Select visible
                        </button>
                        {selectedProductIds.size > 0 ? (
                          <button
                            type="button"
                            className="text-ink-soft hover:underline"
                            onClick={clearSelectedProducts}
                          >
                            Clear {selectedProductIds.size}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
                      <Input
                        value={productSearch}
                        onChange={(event) => setProductSearch(event.target.value)}
                        placeholder="Search products…"
                        className="pl-9"
                      />
                    </div>
                    <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-border p-2">
                      {productsQuery.isLoading ? (
                        <p className="px-2 py-3 text-sm text-ink-soft">Loading products…</p>
                      ) : filteredProducts.length === 0 ? (
                        <p className="px-2 py-3 text-sm text-ink-soft">
                          {products.length === 0
                            ? "No products yet."
                            : "No products match your search."}
                        </p>
                      ) : (
                        filteredProducts.map((product) => {
                          const checked = selectedProductIds.has(product.id);
                          return (
                            <label
                              key={product.id}
                              className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 text-sm hover:bg-secondary/60"
                            >
                              <span className="truncate">{product.name}</span>
                              <Switch
                                checked={checked}
                                onCheckedChange={(next) => toggleProduct(product.id, next)}
                              />
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div>
                    <p className="text-sm font-semibold">Run on a schedule</p>
                    <p className="text-xs text-ink-soft">
                      Optional start and end dates for seasonal campaigns.
                    </p>
                  </div>
                  <Switch
                    checked={form.use_schedule}
                    onCheckedChange={(checked) =>
                      setForm((current) => ({
                        ...current,
                        use_schedule: checked,
                        starts_at: checked ? current.starts_at : null,
                        ends_at: checked ? current.ends_at : null,
                      }))
                    }
                  />
                </div>

                {form.use_schedule ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="starts-at">Starts</Label>
                      <Input
                        id="starts-at"
                        type="datetime-local"
                        value={toLocalInput(form.starts_at)}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            starts_at: fromLocalInput(event.target.value),
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ends-at">Ends</Label>
                      <Input
                        id="ends-at"
                        type="datetime-local"
                        value={toLocalInput(form.ends_at)}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            ends_at: fromLocalInput(event.target.value),
                          }))
                        }
                      />
                    </div>
                  </div>
                ) : null}
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                min={0}
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: Number(event.target.value) || 0,
                  }))
                }
              />
              <p className="text-xs text-ink-soft">
                Higher priority is preferred when multiple rules could apply. Best savings still
                win for cart rewards.
              </p>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-semibold">Active</p>
                <p className="text-xs text-ink-soft">Customers only see active discounts.</p>
              </div>
              <Switch
                checked={form.status === "active"}
                onCheckedChange={(checked) =>
                  setForm((current) => ({
                    ...current,
                    status: checked ? "active" : "draft",
                  }))
                }
                disabled={form.status === "archived"}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                {editingId ? "Save changes" : "Create discount"}
              </Button>
              {editingId ? (
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader className="space-y-4">
            <div>
              <CardTitle>Discount rules</CardTitle>
              <CardDescription className="mt-1.5">
                {counts.live
                  ? `${counts.live} live now`
                  : "No live discounts right now"}
                {counts.archived ? ` · ${counts.archived} archived` : ""}.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setListFilter(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition",
                    listFilter === tab.id
                      ? "border-primary bg-primary/10 text-ink"
                      : "border-border text-ink-soft hover:bg-secondary/60",
                  )}
                >
                  {tab.label}
                  <span className="text-ink-soft">{tab.count}</span>
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {discountsQuery.isLoading ? (
              <div className="flex items-center gap-2 text-sm text-ink-soft">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading discounts…
              </div>
            ) : filteredDiscounts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center">
                <Plus className="mx-auto h-5 w-5 text-ink-soft" />
                <p className="mt-3 text-sm font-medium text-ink">
                  {listFilter === "archived"
                    ? "No archived discounts"
                    : listFilter === "live"
                      ? "Nothing live right now"
                      : listFilter === "draft"
                        ? "No drafts"
                        : "No discounts yet"}
                </p>
                <p className="mt-1 text-sm text-ink-soft">
                  {listFilter === "all"
                    ? "Create a catalog sale or cart spend reward to get started."
                    : "Try another filter, or create a new discount."}
                </p>
              </div>
            ) : (
              filteredDiscounts.map((discount) => {
                const Icon = typeIcon(discount.type);
                const productIds = discount.product_ids ?? [];
                const targetedNames = productIds
                  .slice(0, 2)
                  .map((id) => productNameById.get(id) ?? "Unknown")
                  .join(", ");
                const extraCount = Math.max(0, productIds.length - 2);
                const archived = discount.status === "archived";

                return (
                  <div
                    key={discount.id}
                    className={cn(
                      "rounded-xl border border-border bg-background p-4",
                      archived && "opacity-80",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-secondary text-ink-soft">
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <p className="font-semibold">{discount.name}</p>
                          <Badge variant="secondary">{typeLabel(discount.type)}</Badge>
                          <Badge variant={discount.status === "active" ? "default" : "outline"}>
                            {discount.status}
                          </Badge>
                          {scheduleBadge(discount)}
                        </div>
                        <p className="mt-2 text-sm text-ink-soft">
                          {formatDiscountValue(discount)}
                          {discount.type === "cart_threshold"
                            ? ` · min cart ${formatMoney(discount.min_subtotal ?? 0)}`
                            : ""}
                          {typeof discount.priority === "number" && discount.priority > 0
                            ? ` · priority ${discount.priority}`
                            : ""}
                        </p>
                        {discount.type !== "cart_threshold" ? (
                          <p className="mt-1 text-xs text-ink-soft">
                            {productIds.length === 0
                              ? "Whole catalog"
                              : `${targetedNames}${extraCount ? ` +${extraCount} more` : ""}`}
                          </p>
                        ) : null}
                        {(discount.starts_at || discount.ends_at) && (
                          <p className="mt-1 text-xs text-ink-soft">
                            {discount.starts_at
                              ? new Date(discount.starts_at).toLocaleString()
                              : "Open"}{" "}
                            →{" "}
                            {discount.ends_at
                              ? new Date(discount.ends_at).toLocaleString()
                              : "Open"}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => editDiscount(discount)}>
                          Edit
                        </Button>
                        {archived ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={statusMutation.isPending}
                              onClick={() => void handleRestore(discount)}
                            >
                              <ArchiveRestore className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={deleteMutation.isPending}
                              onClick={() => void handleDelete(discount)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={statusMutation.isPending}
                            onClick={() => void handleArchive(discount)}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
