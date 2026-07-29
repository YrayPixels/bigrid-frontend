"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { StoreOrder } from "@/lib/api/types";
import { formatMoney } from "@/lib/storefront/format";
import { Button } from "@/components/ui/button";

export default function SellDonePage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await api.getPosOrder(params.orderId);
        if (!cancelled) setOrder(next);
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : "Could not load sale");
          router.replace("/sell");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.orderId, router]);

  if (loading || !order) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
        Loading receipt…
      </div>
    );
  }

  const receiptText = [
    `Receipt ${order.order_number}`,
    `Total: ${formatMoney(order.total_amount, order.currency)}`,
    `Paid by ${order.payment_method === "bank_transfer" ? "transfer" : "cash"}`,
    ...(order.items || []).map(
      (item) =>
        `${item.quantity}× ${item.name} — ${formatMoney(item.total, item.currency || order.currency)}`,
    ),
  ].join("\n");

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: order.order_number, text: receiptText });
        return;
      }
      const wa = `https://wa.me/?text=${encodeURIComponent(receiptText)}`;
      window.open(wa, "_blank", "noopener,noreferrer");
    } catch {
      // user cancelled share
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(receiptText);
      toast.success("Receipt copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <Check className="size-7" />
      </div>
      <h1 className="mt-4 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
        Sale complete
      </h1>
      <p className="mt-1 text-center text-sm text-zinc-500">{order.order_number}</p>
      <p className="mt-4 text-center text-3xl font-semibold sm:text-4xl">
        {formatMoney(order.total_amount, order.currency)}
      </p>
      <p className="mt-1 text-center text-sm capitalize text-zinc-500">
        {(order.payment_method || "paid").replace("_", " ")}
        {order.payment_method === "cash" && order.amount_tendered != null
          ? ` · Change ${formatMoney(
              Math.max(0, order.amount_tendered - order.total_amount),
              order.currency,
            )}`
          : ""}
      </p>

      <div className="mt-8 space-y-3 sm:mt-10">
        <Button className="h-12 w-full rounded-xl" asChild>
          <Link href="/sell">New sale</Link>
        </Button>
        <Button variant="outline" className="h-12 w-full rounded-xl" onClick={share}>
          <Share2 className="mr-2 size-4" />
          Share receipt
        </Button>
        <Button variant="ghost" className="h-11 w-full" onClick={copy}>
          <Copy className="mr-2 size-4" />
          Copy receipt
        </Button>
      </div>
    </div>
  );
}
