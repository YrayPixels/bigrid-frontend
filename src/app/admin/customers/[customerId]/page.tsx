"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  merchantInvalidators,
  useMerchantCustomer,
} from "@/hooks/use-merchant-queries";
import { api } from "@/lib/api/client";

function formatMoney(value: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminCustomerDetailPage() {
  const params = useParams<{ customerId: string }>();
  const customerId = params.customerId;
  const queryClient = useQueryClient();
  const customerQuery = useMerchantCustomer(customerId, { retry: 1 });
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (customerQuery.data) {
      setNotes(customerQuery.data.notes ?? "");
    }
  }, [customerQuery.data]);

  const saveNotes = useMutation({
    mutationFn: () => api.updateCustomer(customerId, { notes: notes || null }),
    onSuccess: () => {
      toast.success("Customer notes saved.");
      merchantInvalidators.customer(queryClient, customerId);
      merchantInvalidators.customers(queryClient);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (customerQuery.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (customerQuery.isError || !customerQuery.data) {
    return (
      <div className="px-6 py-10">
        <p className="text-sm text-destructive">Customer not found.</p>
        <Link href="/admin/customers" className="mt-4 inline-block text-sm font-semibold text-primary">
          Back to customers
        </Link>
      </div>
    );
  }

  const customer = customerQuery.data;

  return (
    <div className="w-full px-6 py-10">
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to customers
      </Link>

      <header className="mt-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">{customer.name}</h1>
        <p className="mt-2 text-sm text-ink-soft">
          {customer.email}
          {customer.phone ? ` · ${customer.phone}` : ""}
        </p>
      </header>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <h2 className="font-display text-lg font-bold">Orders</h2>
          <div className="mt-4 divide-y divide-border">
            {(customer.orders ?? []).length === 0 ? (
              <p className="text-sm text-ink-soft">No orders linked yet.</p>
            ) : (
              customer.orders?.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-mono text-sm font-semibold text-primary hover:underline"
                    >
                      {order.order_number}
                    </Link>
                    <div className="text-xs capitalize text-ink-soft">
                      {order.status} · {order.payment_status.replaceAll("_", " ")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatMoney(order.total_amount, order.currency)}
                    </div>
                    <div className="text-xs text-ink-soft">{formatDate(order.placed_at)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-bold">Stats</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Orders</dt>
                <dd className="font-medium">{customer.orders_count}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Total spent</dt>
                <dd className="font-medium">{formatMoney(customer.total_spent)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">First order</dt>
                <dd>{formatDate(customer.first_order_at)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Last order</dt>
                <dd>{formatDate(customer.last_order_at)}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
            <h2 className="font-display text-lg font-bold">Internal notes</h2>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={5}
              className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="Private notes about this customer"
            />
            <button
              type="button"
              disabled={saveNotes.isPending}
              onClick={() => saveNotes.mutate()}
              className="mt-3 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              {saveNotes.isPending ? "Saving…" : "Save notes"}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
