"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Search, Users } from "lucide-react";
import { useMerchantCustomers } from "@/hooks/use-merchant-queries";

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default function AdminCustomersPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const customersQuery = useMerchantCustomers({
    search: debouncedSearch,
    page,
  });

  const customers = customersQuery.data?.data ?? [];
  const meta = customersQuery.data?.meta;

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Customers</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Soft profiles built from checkout emails and phones.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, email, or phone"
            className="w-full rounded-md border border-border bg-background px-10 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold">Customer list</h2>
            <p className="text-sm text-ink-soft">
              {meta ? `${meta.total.toLocaleString()} customers` : "Loading…"}
            </p>
          </div>
          <Users className="h-5 w-5 text-ink-soft" />
        </div>

        {customersQuery.isLoading ? (
          <div className="grid min-h-56 place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : customers.length === 0 ? (
          <div className="grid min-h-56 place-items-center p-8 text-center">
            <div>
              <Users className="mx-auto h-10 w-10 text-ink-soft" />
              <h3 className="mt-3 font-display text-lg font-semibold">No customers yet</h3>
              <p className="mt-1 text-sm text-ink-soft">
                Profiles appear automatically when shoppers place orders.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-ink-soft">
                <tr>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-5 py-3 font-semibold">Orders</th>
                  <th className="px-5 py-3 font-semibold">Spent</th>
                  <th className="px-5 py-3 font-semibold">Last order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-secondary/20">
                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        {customer.name}
                      </Link>
                      <div className="text-xs text-ink-soft">{customer.email}</div>
                      {customer.phone ? (
                        <div className="text-xs text-ink-soft">{customer.phone}</div>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">{customer.orders_count}</td>
                    <td className="px-5 py-4 font-semibold">{formatMoney(customer.total_spent)}</td>
                    <td className="px-5 py-4 text-ink-soft">{formatDate(customer.last_order_at)}</td>
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
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-md border border-border px-3 py-1.5 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={meta.current_page >= meta.last_page}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-md border border-border px-3 py-1.5 disabled:opacity-50"
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
