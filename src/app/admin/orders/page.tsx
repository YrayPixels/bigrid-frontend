"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CircleHelp,
  Clock3,
  Loader2,
  PackageSearch,
  RefreshCcw,
  Search,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { AdminStatCard } from "@/components/admin/stat-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api/client";
import {
  merchantInvalidators,
  useMerchantDashboard,
  useMerchantOrders,
} from "@/hooks/use-merchant-queries";
import type { StoreOrderStatus } from "@/lib/api/types";
import { useLocationScope } from "@/lib/location-scope";
import { Badge } from "@/components/ui/badge";

const STATUS_OPTIONS: { value: "all" | StoreOrderStatus; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const PAYMENT_OPTIONS = [
  { value: "all", label: "All payments" },
  { value: "pending", label: "Pending" },
  { value: "awaiting_payment", label: "Awaiting payment" },
  { value: "paid", label: "Paid" },
  { value: "refunded", label: "Refunded" },
] as const;

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

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-NG").format(value);
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
    case "delivered":
      return "bg-emerald-500/10 text-emerald-700";
    case "shipped":
      return "bg-indigo-500/10 text-indigo-700";
    case "processing":
      return "bg-blue-500/10 text-blue-700";
    case "cancelled":
      return "bg-destructive/10 text-destructive";
    default:
      return "bg-amber-500/10 text-amber-700";
  }
}

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const { locationId, selectedLabel } = useLocationScope();
  const [status, setStatus] = useState<"all" | StoreOrderStatus>("all");
  const [paymentStatus, setPaymentStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [status, paymentStatus, debouncedSearch, locationId]);

  const ordersQuery = useMerchantOrders({
    status,
    payment_status: paymentStatus,
    search: debouncedSearch,
    page,
    location_id: locationId,
  });

  const dashboardQuery = useMerchantDashboard({ locationId });

  const metrics = dashboardQuery.data?.metrics;
  const statsLoading = dashboardQuery.isLoading;
  const statValues = useMemo(
    () => ({
      totalSales: formatMoneyDetailed(metrics?.total_sales ?? 0),
      totalOrders: formatNumber(metrics?.total_orders ?? 0),
      pendingOrders: formatNumber(metrics?.pending_orders ?? 0),
      averageOrderValue: formatMoneyDetailed(metrics?.average_order_value ?? 0),
    }),
    [metrics],
  );

  const updateStatus = useMutation({
    mutationFn: ({
      orderId,
      nextStatus,
      refund,
    }: {
      orderId: string;
      nextStatus: StoreOrderStatus;
      refund?: boolean;
    }) => api.updateOrderStatus(orderId, { status: nextStatus, refund }),
    onSuccess: () => {
      toast.success("Order status updated.");
      merchantInvalidators.orders(queryClient);
      merchantInvalidators.dashboard(queryClient);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update order.");
    },
  });

  const orders = ordersQuery.data?.data ?? [];
  const meta = ordersQuery.data?.meta;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="w-full bg-[#f7f7f5] px-4 py-6 text-[#171717] sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-border/70 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Orders</h1>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="text-ink-soft/60 transition hover:text-ink-soft"
                      aria-label="About order metrics"
                    >
                      <CircleHelp className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-56 bg-[#3f3f46] text-white">
                    Revenue and fulfillment metrics across all storefront orders.
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="mt-1 text-xs text-ink-soft sm:text-sm">
                {selectedLabel}: manage checkout orders, delivery, payments, and fulfillment.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void ordersQuery.refetch();
                void dashboardQuery.refetch();
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-secondary"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <div className="grid gap-3 border-b border-border/70 px-4 py-4 sm:grid-cols-2 sm:px-6 xl:grid-cols-4">
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[88px] animate-pulse rounded-2xl bg-secondary/60"
                />
              ))
            ) : (
              <>
                <AdminStatCard
                  value={statValues.totalSales}
                  label="Total Sales"
                  tooltip="Total revenue from orders that were not cancelled or refunded."
                  backgroundClassName="bg-[#edf3ff]"
                  icon={<span className="text-lg font-bold text-ink">₦</span>}
                />
                <AdminStatCard
                  value={statValues.totalOrders}
                  label="Total Orders"
                  tooltip="The total number of orders placed through your storefront."
                  backgroundClassName="bg-[#edf8f0]"
                  icon={<ShoppingBag className="h-5 w-5 text-[#4f8a4a]" />}
                />
                <AdminStatCard
                  value={statValues.pendingOrders}
                  label="Pending Orders"
                  tooltip="Orders still waiting to be processed or fulfilled."
                  backgroundClassName="bg-[#fdf0f0]"
                  icon={<Clock3 className="h-5 w-5 text-[#d14343]" />}
                />
                <AdminStatCard
                  value={statValues.averageOrderValue}
                  label="Average Order Value"
                  tooltip="Average amount customers spend per order."
                  backgroundClassName="bg-[#edf3ff]"
                  icon={<TrendingUp className="h-5 w-5 text-[#3b6fd8]" />}
                />
              </>
            )}
          </div>

          <div className="p-4 sm:p-6">
            <section className="rounded-2xl border border-border/80 bg-[#fbfbfa] p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_180px_180px]">
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
          <label className="space-y-2 text-sm">
            <span className="font-medium">Payment</span>
            <select
              value={paymentStatus}
              onChange={(event) => setPaymentStatus(event.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-primary"
            >
              {PAYMENT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

            <section className="mt-6 overflow-hidden rounded-2xl border border-border/80 bg-white shadow-sm">
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
                  <tr key={order.id} className="align-top hover:bg-secondary/20">
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-mono text-sm font-semibold text-primary hover:underline"
                      >
                        {order.order_number}
                      </Link>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant={order.source === "pos" ? "default" : "secondary"}>
                          {order.source === "pos" ? "In-store" : "Online"}
                        </Badge>
                        <span className="text-xs capitalize text-ink-soft">
                          Payment: {order.payment_status}
                          {order.payment_method ? ` · ${order.payment_method.replace("_", " ")}` : ""}
                        </span>
                      </div>
                      {order.source === "pos" && order.cashier_name ? (
                        <div className="mt-1 text-xs text-ink-soft">
                          Cashier: {order.cashier_name}
                          {order.location_name ? ` · ${order.location_name}` : ""}
                        </div>
                      ) : null}
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
                        onChange={(event) => {
                          const nextStatus = event.target.value as StoreOrderStatus;
                          if (
                            nextStatus === "cancelled" &&
                            order.payment_status === "paid" &&
                            !window.confirm(
                              "Cancel and refund this paid order via Paystack? Inventory will be restored.",
                            )
                          ) {
                            event.target.value = order.status;
                            return;
                          }
                          updateStatus.mutate({
                            orderId: order.id,
                            nextStatus,
                            refund: nextStatus === "cancelled" && order.payment_status === "paid",
                          });
                        }}
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
        </section>
      </div>
    </TooltipProvider>
  );
}
