"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import {
  merchantInvalidators,
  useMerchantOrder,
} from "@/hooks/use-merchant-queries";
import { api } from "@/lib/api/client";
import type { StoreOrderStatus } from "@/lib/api/types";

const STATUS_OPTIONS: { value: StoreOrderStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

function formatMoney(value: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null | undefined) {
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

export default function AdminOrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const queryClient = useQueryClient();
  const [trackingNumber, setTrackingNumber] = useState("");

  const orderQuery = useMerchantOrder(orderId, { retry: 1 });

  const updateStatus = useMutation({
    mutationFn: (body: {
      status: StoreOrderStatus;
      tracking_number?: string | null;
      refund?: boolean;
    }) => api.updateOrderStatus(orderId, body),
    onSuccess: () => {
      toast.success("Order status updated.");
      merchantInvalidators.order(queryClient, orderId);
      merchantInvalidators.orders(queryClient);
      merchantInvalidators.dashboard(queryClient);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not update order.");
    },
  });

  const order = orderQuery.data;

  if (orderQuery.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (orderQuery.isError) {
    return (
      <div className="px-6 py-10">
        <p className="text-sm text-destructive">
          {orderQuery.error instanceof Error
            ? orderQuery.error.message
            : "Could not load this order."}
        </p>
        <Link href="/admin/orders" className="mt-4 inline-block text-sm font-semibold text-primary">
          Back to orders
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="px-6 py-10">
        <p className="text-sm text-ink-soft">Order not found.</p>
        <Link href="/admin/orders" className="mt-4 inline-block text-sm font-semibold text-primary">
          Back to orders
        </Link>
      </div>
    );
  }

  const currentTracking = trackingNumber || order.tracking_number || "";

  const timeline = [
    {
      label: "Order placed",
      detail: formatDate(order.placed_at),
      active: true,
    },
    ...(order.paid_at
      ? [{ label: "Payment received", detail: formatDate(order.paid_at), active: true }]
      : []),
    ...(order.shipped_at
      ? [{ label: "Shipped", detail: formatDate(order.shipped_at), active: true }]
      : []),
    {
      label: `Status: ${order.status}`,
      detail:
        order.updated_at && order.updated_at !== order.placed_at
          ? `Updated ${formatDate(order.updated_at)}`
          : "Current fulfillment state",
      active: true,
    },
    ...(order.notes ? [{ label: "Customer note", detail: order.notes, active: true }] : []),
  ];

  const handleStatusChange = (nextStatus: StoreOrderStatus) => {
    if (
      nextStatus === "cancelled" &&
      order.payment_status === "paid" &&
      !window.confirm("Cancel and refund this paid order via Paystack? Inventory will be restored.")
    ) {
      return;
    }

    updateStatus.mutate({
      status: nextStatus,
      tracking_number:
        nextStatus === "shipped" ? currentTracking || null : order.tracking_number,
      refund: nextStatus === "cancelled" && order.payment_status === "paid",
    });
  };

  return (
    <div className="w-full px-6 py-10">
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to orders
      </Link>

      <header className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">Order</span>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight font-mono">
            {order.order_number}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">Placed {formatDate(order.placed_at)}</p>
          {order.store_customer_id ? (
            <Link
              href={`/admin/customers/${order.store_customer_id}`}
              className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
            >
              View customer profile
            </Link>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              void api.openOrderInvoice(orderId).catch((error: Error) => {
                toast.error(error.message);
              });
            }}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-semibold"
          >
            <FileText className="h-4 w-4" />
            Invoice
          </button>
          <span
            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass(order.status)}`}
          >
            {order.status}
          </span>
          <select
            value={order.status}
            disabled={updateStatus.isPending}
            onChange={(event) => handleStatusChange(event.target.value as StoreOrderStatus)}
            className="rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-bold">Items</h2>
            <div className="mt-4 divide-y divide-border">
              {(order.items ?? []).length === 0 ? (
                <p className="py-2 text-sm text-ink-soft">No line items recorded.</p>
              ) : (
                order.items?.map((item) => (
                  <div
                    key={`${order.id}-${item.product_id}`}
                    className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                  >
                    <div>
                      <div className="font-medium">{item.name}</div>
                      {item.selected_options && Object.keys(item.selected_options).length > 0 ? (
                        <div className="mt-0.5 text-xs text-ink-soft">
                          {Object.entries(item.selected_options)
                            .map(([name, value]) => `${name}: ${value}`)
                            .join(" · ")}
                        </div>
                      ) : null}
                      <div className="text-sm text-ink-soft">
                        {item.quantity} × {formatMoney(item.unit_price, item.currency)}
                      </div>
                    </div>
                    <div className="font-semibold">{formatMoney(item.total, item.currency)}</div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex items-center justify-between text-ink-soft">
                <span>Subtotal</span>
                <span>{formatMoney(order.subtotal, order.currency)}</span>
              </div>
              {(order.discount_amount ?? 0) > 0 ? (
                <div className="flex items-center justify-between text-ink-soft">
                  <span>Discount{order.discount_label ? ` (${order.discount_label})` : ""}</span>
                  <span>-{formatMoney(order.discount_amount ?? 0, order.currency)}</span>
                </div>
              ) : null}
              {(order.delivery_fee ?? 0) > 0 ? (
                <div className="flex items-center justify-between text-ink-soft">
                  <span>Delivery fee</span>
                  <span>{formatMoney(order.delivery_fee ?? 0, order.currency)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between">
                <span className="font-medium">Total</span>
                <span className="font-display text-xl font-bold">
                  {formatMoney(order.total_amount, order.currency)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-bold">Timeline</h2>
            <ol className="mt-4 space-y-4">
              {timeline.map((entry, index) => (
                <li key={`${entry.label}-${index}`} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <div className="text-sm font-semibold">{entry.label}</div>
                    <div className="text-sm text-ink-soft">{entry.detail}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-bold">Customer</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="font-semibold">{order.customer_name}</div>
              <div className="flex items-center gap-2 text-ink-soft">
                <Mail className="h-4 w-4 shrink-0" />
                {order.customer_email}
              </div>
              <div className="flex items-center gap-2 text-ink-soft">
                <Phone className="h-4 w-4 shrink-0" />
                {order.customer_phone}
              </div>
              <div className="flex items-start gap-2 text-ink-soft">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <span className="mb-1 block capitalize">
                    {order.delivery_method ?? "delivery"}
                  </span>
                  {order.delivery_address}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-bold">Payment & shipping</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Payment</dt>
                <dd className="capitalize font-medium">{order.payment_status}</dd>
              </div>
              {order.paid_at ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">Paid at</dt>
                  <dd>{formatDate(order.paid_at)}</dd>
                </div>
              ) : null}
              {order.paystack_reference ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">Paystack ref</dt>
                  <dd className="font-mono text-xs">{order.paystack_reference}</dd>
                </div>
              ) : null}
              {order.settlement_status ? (
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-soft">Settlement</dt>
                  <dd className="capitalize">{order.settlement_status.replaceAll("_", " ")}</dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-5 space-y-2 border-t border-border pt-4">
              <label className="block text-sm font-medium">Tracking number</label>
              <div className="flex gap-2">
                <input
                  value={currentTracking}
                  onChange={(event) => setTrackingNumber(event.target.value)}
                  placeholder="Optional carrier tracking ID"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  disabled={updateStatus.isPending || order.status === "cancelled"}
                  onClick={() =>
                    updateStatus.mutate({
                      status: order.status === "pending" ? "shipped" : "shipped",
                      tracking_number: currentTracking || null,
                    })
                  }
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  <Truck className="h-4 w-4" />
                  Mark shipped
                </button>
              </div>
              {order.tracking_number ? (
                <p className="text-xs text-ink-soft">Current: {order.tracking_number}</p>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
