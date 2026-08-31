"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, CloudOff, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { StoreOrder } from "@/lib/api/types";
import { getPendingOrder, type PendingPosOrder } from "@/lib/pos-offline/db";
import { formatMoney } from "@/lib/storefront/format";
import { Button } from "@/components/ui/button";

export default function SellDonePage() {
  const params = useParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [pending, setPending] = useState<PendingPosOrder | null>(null);
  const [loading, setLoading] = useState(true);

  const orderId = params.orderId;
  const isPending = orderId.startsWith("pending:");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (isPending) {
          const clientId = orderId.slice("pending:".length);
          const row = await getPendingOrder(clientId);
          if (!row) throw new Error("Offline sale not found");
          if (!cancelled) {
            if (row.server_order_id) {
              router.replace(`/sell/done/${row.server_order_id}`);
              return;
            }
            setPending(row);
          }
          return;
        }

        const next = await api.getPosOrder(orderId);
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
  }, [orderId, isPending, router]);

  if (loading || (!order && !pending)) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-ink-soft">
        Loading receipt…
      </div>
    );
  }

  const receipt = pending
    ? {
        order_number: pending.local_receipt.order_number,
        total_amount: pending.local_receipt.total_amount,
        currency: pending.local_receipt.currency,
        payment_method: pending.local_receipt.payment_method,
        amount_tendered: pending.local_receipt.amount_tendered,
        items: pending.local_receipt.items.map((item) => ({
          quantity: item.quantity,
          name: item.name,
          total: item.unit_price * item.quantity,
          currency: pending.local_receipt.currency,
        })),
        offline: true,
        syncError: pending.last_error,
      }
    : {
        order_number: order!.order_number,
        total_amount: order!.total_amount,
        currency: order!.currency,
        payment_method: order!.payment_method,
        amount_tendered: order!.amount_tendered,
        items: order!.items || [],
        offline: false,
        syncError: null as string | null,
      };

  const receiptText = [
    `Receipt ${receipt.order_number}`,
    receipt.offline ? "(Saved offline — pending sync)" : null,
    `Total: ${formatMoney(receipt.total_amount, receipt.currency)}`,
    `Paid by ${receipt.payment_method === "bank_transfer" ? "transfer" : "cash"}`,
    ...receipt.items.map(
      (item) =>
        `${item.quantity}× ${item.name} — ${formatMoney(item.total, item.currency || receipt.currency)}`,
    ),
  ]
    .filter(Boolean)
    .join("\n");

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: receipt.order_number, text: receiptText });
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
      <p className="mt-1 text-center text-sm text-ink-soft">{receipt.order_number}</p>
      {receipt.offline ? (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-amber-700">
          <CloudOff className="size-3.5" />
          Saved offline — will sync when online
        </p>
      ) : null}
      {receipt.syncError ? (
        <p className="mt-2 text-center text-xs text-red-600">{receipt.syncError}</p>
      ) : null}
      <p className="mt-4 text-center text-3xl font-semibold sm:text-4xl">
        {formatMoney(receipt.total_amount, receipt.currency)}
      </p>
      <p className="mt-1 text-center text-sm capitalize text-ink-soft">
        {(receipt.payment_method || "paid").replace("_", " ")}
        {receipt.payment_method === "cash" && receipt.amount_tendered != null
          ? ` · Change ${formatMoney(
              Math.max(0, receipt.amount_tendered - receipt.total_amount),
              receipt.currency,
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
