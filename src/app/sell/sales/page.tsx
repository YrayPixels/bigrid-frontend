"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { StoreOrder } from "@/lib/api/types";
import { useSellCart } from "@/lib/sell-cart";
import { formatMoney } from "@/lib/storefront/format";

export default function SellSalesPage() {
  const { locationId } = useSellCart();
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.getPosOrders({
          location_id: locationId || undefined,
        });
        if (!cancelled) setOrders(data);
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Failed to load sales");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locationId]);

  const total = orders.reduce((sum, order) => sum + order.total_amount, 0);
  const currency = orders[0]?.currency || "NGN";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Today&apos;s sales</h1>
      <p className="mt-1 text-sm text-zinc-500">
        {orders.length} sale{orders.length === 1 ? "" : "s"} · {formatMoney(total, currency)}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {loading ? (
          <p className="col-span-full py-8 text-center text-sm text-zinc-500">Loading…</p>
        ) : orders.length === 0 ? (
          <p className="col-span-full py-8 text-center text-sm text-zinc-500">No sales yet today.</p>
        ) : (
          orders.map((order) => (
            <Link
              key={order.id}
              href={`/sell/done/${order.id}`}
              className="block rounded-2xl bg-white p-4 ring-1 ring-zinc-200 transition hover:ring-zinc-300 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{order.order_number}</p>
                  <p className="mt-0.5 text-xs capitalize text-zinc-500">
                    {(order.payment_method || "paid").replace("_", " ")}
                    {order.cashier_name ? ` · ${order.cashier_name}` : ""}
                  </p>
                </div>
                <p className="font-semibold">
                  {formatMoney(order.total_amount, order.currency)}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
