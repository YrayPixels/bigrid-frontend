"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, PackageSearch, RefreshCcw, Search, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { StoreOrderStatus } from "@/lib/api/types";

const STATUS_OPTIONS: { value: "all" | StoreOrderStatus; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

function formatMoney(value: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClass(status: string) {
  switch (status) {
    case "fulfilled":
      return "bg-emerald-500/10 text-emerald-700";
    case "processing":
      return "bg-blue-500/10 text-blue-700";
    case "cancelled":
    case "refunded":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-amber-500/10 text-amber-700";
  }
}

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"all" | StoreOrderStatus>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [status, debouncedSearch]);

  const ordersQuery = useQuery({
    queryKey: ["merchant-orders", status, debouncedSearch, page],
    queryFn: () =>
      api.getOrders({
        status,
        search: debouncedSearch || undefined,
        page,
        per_page: 15,
      }),
  });

  const updateStatus = useMutation({
    mutationFn: ({ orderId, nextStatus }: { orderId: string; nextStatus: StoreOrderStatus }) =>
      api.updateOrderStatus(orderId, { status: nextStatus }),
    onSuccess: () => {
      toast.success("Order status updated.");
      queryClient.invalidateQueries({ queryKey: ["merchant-orders"] });
      queryClient.invalidateQueries({ queryKey: ["merchant-dashboard-overview"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update order.");
    },
  });

  const orders = ordersQuery.data?.data ?? [];
  const meta = ordersQuery.data?.meta;

  return (
    <div className="w-full px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">Sales</span>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Orders</h1>
          <p className="mt-2 w-full text-sm text-ink-soft">
            Manage customer checkout orders, delivery details, payment state, and fulfillment
            status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void ordersQuery.refetch()}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold shadow-soft hover:bg-secondary"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </button>
      </header>

      <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Search orders</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Order number, customer, email, phone..."
                className="w-full rounded-md border border-border bg-background px-10 py-2 outline-none focus:border-primary"
              />
            </div>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as "all" | StoreOrderStatus)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-primary"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold">Storefront orders</h2>
            <p className="text-sm text-ink-soft">
              {meta ? `${meta.total.toLocaleString()} orders found` : "Loading order activity"}
            </p>
          </div>
          <ShoppingBag className="h-5 w-5 text-ink-soft" />
        </div>

        {ordersQuery.isLoading ? (
          <div className="grid min-h-64 place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="grid min-h-64 place-items-center p-8 text-center">
            <div>
              <PackageSearch className="mx-auto h-10 w-10 text-ink-soft" />
              <h3 className="mt-3 font-display text-lg font-semibold">No orders found</h3>
              <p className="mt-1 text-sm text-ink-soft">
                Customer checkouts will appear here once shoppers place orders.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-5 py-3 font-semibold">Order</th>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Items</th>
                  <th className="px-5 py-3 font-semibold">Total</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Placed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => (
                  <tr key={order.id} className="align-top">
                    <td className="px-5 py-4">
                      <div className="font-mono text-sm font-semibold">{order.order_number}</div>
                      <div className="mt-1 text-xs capitalize text-ink-soft">
                        Payment: {order.payment_status}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-medium">{order.customer_name}</div>
                      <div className="text-xs text-ink-soft">{order.customer_email}</div>
                      <div className="text-xs text-ink-soft">{order.customer_phone}</div>
                      <div className="mt-2 max-w-xs text-xs text-ink-soft">
                        {order.delivery_address}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1">
                        {order.items.map((item) => (
                          <div key={`${order.id}-${item.product_id}`} className="text-xs">
                            {item.name} x {item.quantity}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold">
                      {formatMoney(order.total_amount, order.currency)}
                    </td>
                    <td className="px-5 py-4">
                      <div
                        className={`mb-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(order.status)}`}
                      >
                        {order.status}
                      </div>
                      <select
                        value={order.status}
                        disabled={updateStatus.isPending}
                        onChange={(event) =>
                          updateStatus.mutate({
                            orderId: order.id,
                            nextStatus: event.target.value as StoreOrderStatus,
                          })
                        }
                        className="block w-36 rounded-md border border-border bg-background px-2 py-1 text-xs outline-none focus:border-primary"
                      >
                        {STATUS_OPTIONS.filter((option) => option.value !== "all").map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-5 py-4 text-ink-soft">{formatDate(order.placed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.last_page > 1 ? (
          <div className="flex items-center justify-between border-t border-border px-5 py-4 text-sm">
            <span className="text-ink-soft">
              Page {meta.current_page} of {meta.last_page}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={meta.current_page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-md border border-border px-3 py-1.5 font-medium disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={meta.current_page >= meta.last_page}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-md border border-border px-3 py-1.5 font-medium disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
