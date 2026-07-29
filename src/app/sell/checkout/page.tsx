"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { StorePaymentSettings } from "@/lib/api/types";
import { useSellCart } from "@/lib/sell-cart";
import { formatMoney } from "@/lib/storefront/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Tender = "cash" | "bank_transfer" | null;

export default function SellCheckoutPage() {
  const router = useRouter();
  const {
    lines,
    subtotal,
    locationId,
    customerName,
    customerPhone,
    clearCart,
  } = useSellCart();

  const [tender, setTender] = useState<Tender>(null);
  const [amountReceived, setAmountReceived] = useState("");
  const [transferRef, setTransferRef] = useState("");
  const [payments, setPayments] = useState<StorePaymentSettings | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (lines.length === 0) {
      router.replace("/sell");
    }
  }, [lines.length, router]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await api.getPosPaymentInfo();
        if (!cancelled) setPayments(info);
      } catch {
        // Transfer may still be blocked server-side if not configured.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const currency = lines[0]?.currency || "NGN";
  const received = Number(amountReceived);
  const changeDue = useMemo(() => {
    if (!Number.isFinite(received)) return 0;
    return Math.max(0, received - subtotal);
  }, [received, subtotal]);

  const canConfirmCash =
    tender === "cash" && Number.isFinite(received) && received >= subtotal;
  const canConfirmTransfer = tender === "bank_transfer" && Boolean(payments?.payouts_configured);

  const submit = async () => {
    if (!tender || lines.length === 0) return;
    setSubmitting(true);
    try {
      const order = await api.createPosOrder({
        items: lines.map((line) => ({
          product_id: line.product_id,
          quantity: line.quantity,
          selected_options:
            Object.keys(line.selected_options).length > 0
              ? line.selected_options
              : undefined,
        })),
        payment_method: tender,
        payment_reference: tender === "bank_transfer" ? transferRef.trim() || null : null,
        amount_tendered: tender === "cash" ? received : null,
        location_id: locationId,
        customer_name: customerName.trim() || null,
        customer_phone: customerPhone.trim() || null,
      });
      clearCart();
      router.replace(`/sell/done/${order.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sale failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <button
        type="button"
        className="mb-4 text-left text-sm text-zinc-500 hover:text-zinc-800"
        onClick={() => router.push("/sell")}
      >
        ← Back to cart
      </button>

      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 sm:p-6">
        <p className="text-sm text-zinc-500">Total due</p>
        <p className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
          {formatMoney(subtotal, currency)}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setTender("cash")}
          className={`rounded-2xl px-4 py-5 text-left ring-1 ${
            tender === "cash"
              ? "bg-zinc-900 text-white ring-zinc-900"
              : "bg-white text-zinc-900 ring-zinc-200"
          }`}
        >
          <p className="text-base font-semibold">Cash</p>
          <p className={`mt-1 text-xs ${tender === "cash" ? "text-zinc-300" : "text-zinc-500"}`}>
            Count money received
          </p>
        </button>
        <button
          type="button"
          onClick={() => setTender("bank_transfer")}
          className={`rounded-2xl px-4 py-5 text-left ring-1 ${
            tender === "bank_transfer"
              ? "bg-zinc-900 text-white ring-zinc-900"
              : "bg-white text-zinc-900 ring-zinc-200"
          }`}
        >
          <p className="text-base font-semibold">Transfer</p>
          <p
            className={`mt-1 text-xs ${
              tender === "bank_transfer" ? "text-zinc-300" : "text-zinc-500"
            }`}
          >
            Confirm bank payment
          </p>
        </button>
      </div>

      {tender === "cash" ? (
        <div className="mt-5 space-y-3 rounded-2xl bg-white p-4 ring-1 ring-zinc-200 sm:p-5">
          <label className="block text-sm font-medium">Amount received</label>
          <Input
            inputMode="decimal"
            value={amountReceived}
            onChange={(e) => setAmountReceived(e.target.value)}
            placeholder={String(subtotal)}
            className="h-12 text-lg"
          />
          <p className="text-sm text-zinc-600">
            Change due:{" "}
            <span className="font-semibold text-zinc-900">
              {formatMoney(changeDue, currency)}
            </span>
          </p>
        </div>
      ) : null}

      {tender === "bank_transfer" ? (
        <div className="mt-5 space-y-3 rounded-2xl bg-white p-4 ring-1 ring-zinc-200 sm:p-5">
          {payments?.payouts_configured ? (
            <>
              <p className="text-sm font-medium">Pay to</p>
              <div className="space-y-1 text-sm">
                <p>{payments.payout_bank_name}</p>
                <p className="font-semibold tracking-wide">{payments.payout_account_number}</p>
                <p className="text-zinc-600">{payments.payout_account_name}</p>
              </div>
              <Input
                value={transferRef}
                onChange={(e) => setTransferRef(e.target.value)}
                placeholder="Transfer reference (optional)"
                className="h-11"
              />
            </>
          ) : (
            <p className="text-sm text-amber-800">
              Bank details are not set up yet. Ask the owner to add payout details in Settings, or take cash.
            </p>
          )}
        </div>
      ) : null}

      <div className="mt-auto pt-8 sm:mt-10 sm:pt-0">
        <Button
          className="h-12 w-full rounded-xl text-base sm:mx-auto sm:max-w-md sm:block"
          disabled={
            submitting ||
            (tender === "cash" ? !canConfirmCash : tender === "bank_transfer" ? !canConfirmTransfer : true)
          }
          onClick={submit}
        >
          {submitting ? "Recording…" : "Confirm sale"}
        </Button>
      </div>
    </div>
  );
}
