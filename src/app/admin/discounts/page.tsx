"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2, Percent, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type {
  CreateStoreDiscountInput,
  StoreDiscount,
  StoreDiscountType,
  StoreDiscountValueType,
} from "@/lib/api/types";
import { useStoreMe } from "@/hooks/use-merchant-queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const blankForm: CreateStoreDiscountInput = {
  name: "",
  type: "seasonal",
  discount_type: "percent",
  discount_value: 10,
  min_subtotal: null,
  product_ids: [],
  starts_at: null,
  ends_at: null,
  status: "active",
  priority: 0,
};

function typeLabel(type: StoreDiscountType) {
  if (type === "product") return "Product discount";
  if (type === "cart_threshold") return "Cart amount discount";
  return "Seasonal discount";
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

  const [form, setForm] = useState<CreateStoreDiscountInput>(blankForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const products = productsQuery.data ?? [];
  const discounts = discountsQuery.data ?? [];

  const selectedProductIds = useMemo(
    () => new Set(form.product_ids ?? []),
    [form.product_ids],
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: CreateStoreDiscountInput = {
        ...form,
        name: form.name.trim(),
        discount_value: Number(form.discount_value) || 0,
        min_subtotal:
          form.type === "cart_threshold"
            ? form.min_subtotal != null && form.min_subtotal !== ("" as unknown)
              ? Number(form.min_subtotal)
              : 0
            : null,
        product_ids:
          form.type === "cart_threshold" ? [] : (form.product_ids ?? []).filter(Boolean),
        starts_at: form.starts_at,
        ends_at: form.ends_at,
      };
      if (!payload.name) throw new Error("Give this discount a name.");
      if (payload.type === "seasonal" && !payload.starts_at && !payload.ends_at) {
        throw new Error("Seasonal discounts need a start or end date.");
      }
      if (editingId) return api.updateDiscount(editingId, payload);
      return api.createDiscount(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-discounts"] });
      setForm(blankForm);
      setEditingId(null);
      toast.success(editingId ? "Discount updated." : "Discount created.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not save discount"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteDiscount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["merchant-discounts"] });
      toast.success("Discount deleted.");
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not delete discount"),
  });

  function editDiscount(discount: StoreDiscount) {
    setEditingId(discount.id);
    setForm({
      name: discount.name,
      type: discount.type,
      discount_type: discount.discount_type,
      discount_value: discount.discount_value,
      min_subtotal: discount.min_subtotal ?? null,
      product_ids: discount.product_ids ?? [],
      starts_at: discount.starts_at ?? null,
      ends_at: discount.ends_at ?? null,
      status: discount.status,
      priority: discount.priority ?? 0,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Discounts</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Set product sales, cart spend rewards, and seasonal campaigns for{" "}
          {storeQuery.data?.business_name ?? "your store"}.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" />
              {editingId ? "Edit discount" : "Create discount"}
            </CardTitle>
            <CardDescription>
              Product discounts can target specific items. Cart discounts unlock after a spend
              threshold. Seasonal discounts run between dates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="Summer sale"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={form.type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value as StoreDiscountType,
                    }))
                  }
                >
                  <option value="product">Product discount</option>
                  <option value="cart_threshold">Cart amount discount</option>
                  <option value="seasonal">Seasonal discount</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Value type</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={form.discount_type}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      discount_type: event.target.value as StoreDiscountValueType,
                    }))
                  }
                >
                  <option value="percent">Percent off</option>
                  <option value="fixed">Fixed amount off</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{form.discount_type === "percent" ? "Percent" : "Amount"}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.discount_value}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      discount_value: Number(event.target.value),
                    }))
                  }
                />
              </div>
              {form.type === "cart_threshold" ? (
                <div className="space-y-2">
                  <Label>Minimum cart total</Label>
                  <Input
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
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.priority ?? 0}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        priority: Number(event.target.value) || 0,
                      }))
                    }
                  />
                </div>
              )}
            </div>

            {(form.type === "seasonal" || form.type === "product") && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Starts</Label>
                  <Input
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
                  <Label>Ends</Label>
                  <Input
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
            )}

            {form.type !== "cart_threshold" ? (
              <div className="space-y-3">
                <Label>Apply to products</Label>
                <p className="text-xs text-ink-soft">
                  Leave all unchecked to apply across the whole catalog.
                </p>
                <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-border p-3">
                  {products.length === 0 ? (
                    <p className="text-sm text-ink-soft">No products yet.</p>
                  ) : (
                    products.map((product) => {
                      const checked = selectedProductIds.has(product.id);
                      return (
                        <label
                          key={product.id}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="truncate">{product.name}</span>
                          <Switch
                            checked={checked}
                            onCheckedChange={(next) =>
                              setForm((current) => {
                                const ids = new Set(current.product_ids ?? []);
                                if (next) ids.add(product.id);
                                else ids.delete(product.id);
                                return { ...current, product_ids: [...ids] };
                              })
                            }
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
                <p className="text-sm font-semibold">Active</p>
                <p className="text-xs text-ink-soft">Customers only see active discounts.</p>
              </div>
              <Switch
                checked={form.status !== "draft" && form.status !== "archived"}
                onCheckedChange={(checked) =>
                  setForm((current) => ({ ...current, status: checked ? "active" : "draft" }))
                }
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
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingId(null);
                    setForm(blankForm);
                  }}
                >
                  Cancel
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Active and draft rules</CardTitle>
            <CardDescription>
              Product sale prices set on each product still apply on top of these campaigns.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {discountsQuery.isLoading ? (
              <p className="text-sm text-ink-soft">Loading discounts…</p>
            ) : discounts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-center">
                <Plus className="mx-auto h-5 w-5 text-ink-soft" />
                <p className="mt-3 text-sm text-ink-soft">No discounts yet.</p>
              </div>
            ) : (
              discounts.map((discount) => (
                <div
                  key={discount.id}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{discount.name}</p>
                        <Badge variant="secondary">{typeLabel(discount.type)}</Badge>
                        <Badge variant={discount.status === "active" ? "default" : "outline"}>
                          {discount.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-ink-soft">
                        {discount.discount_type === "percent"
                          ? `${discount.discount_value}% off`
                          : `${discount.discount_value} off`}
                        {discount.type === "cart_threshold"
                          ? ` · min cart ${discount.min_subtotal ?? 0}`
                          : ""}
                      </p>
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
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => editDiscount(discount)}>
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(discount.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
