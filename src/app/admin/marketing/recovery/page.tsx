"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Mail,
  MessageCircle,
  RefreshCcw,
  ShoppingCart,
  Sparkles,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { merchantInvalidators, useMarketingAbandoned } from "@/hooks/use-merchant-queries";
import { api } from "@/lib/api/client";
import type { AbandonedRecoveryItem, AbandonedRecoverySourceType } from "@/lib/api/types";
import { AdminStatCard } from "@/components/admin/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

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

function kindLabel(kind: AbandonedRecoverySourceType) {
  return kind === "checkout" ? "Abandoned checkout" : "Abandoned cart";
}

function RecoveryPanel({
  item,
  onSent,
}: {
  item: AbandonedRecoveryItem;
  onSent: () => void;
}) {
  const [channel, setChannel] = useState<"email" | "whatsapp">(
    item.customer_email ? "email" : "whatsapp",
  );
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const draftMutation = useMutation({
    mutationFn: () =>
      api.draftAbandonedRecoveryMessage({
        source_type: item.source_type,
        source_id: item.source_id,
        channel,
      }),
    onSuccess: (response) => {
      setSubject(response.draft.subject ?? "");
      setMessage(response.draft.message);
      toast.success("Recovery message drafted.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const sendMutation = useMutation({
    mutationFn: () =>
      api.sendAbandonedRecoveryMessage({
        source_type: item.source_type,
        source_id: item.source_id,
        channel,
        message,
        subject: channel === "email" ? subject : undefined,
      }),
    onSuccess: (response) => {
      if (response.mode === "link_ready" && response.whatsapp_url) {
        window.open(response.whatsapp_url, "_blank", "noopener,noreferrer");
        toast.success("WhatsApp opened with your recovery message.");
      } else {
        toast.success(channel === "email" ? "Recovery email sent." : "WhatsApp message sent.");
      }
      onSent();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const canEmail = Boolean(item.customer_email);
  const canWhatsApp = Boolean(item.customer_phone);

  return (
    <div className="space-y-4 rounded-xl border border-border bg-canvas p-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={channel === "email" ? "default" : "outline"}
          disabled={!canEmail}
          onClick={() => setChannel("email")}
        >
          <Mail className="mr-2 h-4 w-4" />
          Email
        </Button>
        <Button
          type="button"
          size="sm"
          variant={channel === "whatsapp" ? "default" : "outline"}
          disabled={!canWhatsApp}
          onClick={() => setChannel("whatsapp")}
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          WhatsApp
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={draftMutation.isPending || (!canEmail && channel === "email") || (!canWhatsApp && channel === "whatsapp")}
          onClick={() => draftMutation.mutate()}
        >
          {draftMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Draft with AI
        </Button>
      </div>

      {channel === "email" ? (
        <label className="block space-y-2 text-sm">
          <span className="font-medium">Subject</span>
          <input
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 outline-none focus:border-primary"
            placeholder="Complete your order"
          />
        </label>
      ) : null}

      <label className="block space-y-2 text-sm">
        <span className="font-medium">Message</span>
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={5}
          placeholder="Write a friendly reminder with your checkout link…"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={!message.trim() || sendMutation.isPending}
          onClick={() => sendMutation.mutate()}
        >
          {sendMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : channel === "email" ? (
            <Mail className="mr-2 h-4 w-4" />
          ) : (
            <MessageCircle className="mr-2 h-4 w-4" />
          )}
          Send {channel === "email" ? "email" : "WhatsApp"}
        </Button>
        <Link
          href="/admin/marketing"
          className="text-sm text-primary hover:underline"
        >
          Open marketing agent
        </Link>
      </div>
    </div>
  );
}

export default function AbandonedRecoveryPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);

  const recoveryQuery = useMarketingAbandoned(page);

  const summary = recoveryQuery.data?.summary;
  const items = recoveryQuery.data?.items ?? [];
  const meta = recoveryQuery.data?.meta;

  const statValues = useMemo(
    () => ({
      total: summary?.total ?? 0,
      checkoutCount: summary?.checkout_count ?? 0,
      cartCount: summary?.cart_count ?? 0,
      recoverableValue: formatMoney(summary?.recoverable_value ?? 0),
    }),
    [summary],
  );

  useEffect(() => {
    if (items.length === 0) {
      setActiveId(null);
      return;
    }
    if (!activeId || !items.some((item) => item.id === activeId)) {
      setActiveId(items[0]?.id ?? null);
    }
  }, [activeId, items]);

  const activeItem = items.find((item) => item.id === activeId) ?? null;

  return (
    <div className="w-full bg-canvas px-4 py-6 text-ink sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-[28px] border border-border/70 bg-canvas-raised shadow-elevated">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">Abandoned Cart</h1>
            </div>
            <p className="text-xs text-ink-soft sm:text-sm">
              Reach customers who left items in their cart or did not finish payment. Draft recovery
              messages with the marketing agent and send by email or WhatsApp.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => void recoveryQuery.refetch()}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="grid gap-3 border-b border-border/70 px-4 py-4 sm:grid-cols-2 sm:px-6 xl:grid-cols-4">
        <AdminStatCard
          value={String(statValues.total)}
          label="Recoverable leads"
          tooltip="Customers who abandoned checkout or left contact details in cart."
          backgroundClassName="bg-primary/10"
          icon={<ShoppingCart className="h-5 w-5 text-primary" />}
        />
        <AdminStatCard
          value={String(statValues.checkoutCount)}
          label="Unpaid checkouts"
          tooltip="Orders placed but payment was not completed."
          backgroundClassName="bg-destructive/10"
          icon={<Wallet className="h-5 w-5 text-destructive" />}
        />
        <AdminStatCard
          value={String(statValues.cartCount)}
          label="Saved carts"
          tooltip="Shoppers who entered contact details but did not submit checkout."
          backgroundClassName="bg-emerald-500/10"
          icon={<MessageCircle className="h-5 w-5 text-emerald-600" />}
        />
        <AdminStatCard
          value={statValues.recoverableValue}
          label="Potential value"
          tooltip="Combined value of abandoned carts and unpaid checkouts."
          backgroundClassName="bg-primary/10"
          icon={<span className="text-lg font-bold text-ink">₦</span>}
        />
        </div>

        <div className="grid gap-6 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_400px]">
          <Card className="border-border/80 shadow-sm">
          <CardHeader className="border-b border-border/60">
            <CardTitle>Abandoned carts & checkouts</CardTitle>
            <CardDescription>
              {meta ? `${meta.total.toLocaleString()} recoverable customers` : "Loading recovery opportunities"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {recoveryQuery.isLoading ? (
              <div className="grid min-h-64 place-items-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : items.length === 0 ? (
              <div className="grid min-h-64 place-items-center p-8 text-center">
                <div>
                  <ShoppingCart className="mx-auto h-10 w-10 text-ink-soft" />
                  <h3 className="mt-3 font-display text-lg font-semibold">Nothing to recover yet</h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    Abandoned carts and unpaid checkouts will appear here after customers leave
                    without completing payment.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveId(item.id)}
                    className={`w-full px-5 py-4 text-left transition-colors hover:bg-secondary/20 ${
                      activeId === item.id ? "bg-secondary/30" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-ink">
                            {item.customer_name || item.customer_email || item.customer_phone || "Unknown customer"}
                          </span>
                          <Badge variant="outline">{kindLabel(item.kind)}</Badge>
                          {item.order_number ? (
                            <Badge variant="secondary">{item.order_number}</Badge>
                          ) : null}
                        </div>
                        <div className="mt-1 text-xs text-ink-soft">
                          {item.customer_email}
                          {item.customer_email && item.customer_phone ? " · " : ""}
                          {item.customer_phone}
                        </div>
                        <div className="mt-2 text-xs text-ink-soft">
                          {item.items.slice(0, 2).map((line) => `${line.name} x ${line.quantity}`).join(", ")}
                          {item.items.length > 2 ? ` +${item.items.length - 2} more` : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-ink">
                          {formatMoney(item.total_amount, item.currency)}
                        </div>
                        <div className="mt-1 text-xs text-ink-soft">{formatDate(item.abandoned_at)}</div>
                        {item.last_outreach ? (
                          <div className="mt-2 text-xs capitalize text-ink-soft">
                            Last {item.last_outreach.channel}: {item.last_outreach.status}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {meta && meta.last_page > 1 ? (
              <div className="flex items-center justify-between border-t border-border px-5 py-4 text-sm">
                <span className="text-ink-soft">
                  Page {meta.current_page} of {meta.last_page}
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={meta.current_page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={meta.current_page >= meta.last_page}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="h-fit border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Recovery campaign</CardTitle>
            <CardDescription>
              Draft a personalized message and send it directly to the customer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeItem ? (
              <RecoveryPanel
                item={activeItem}
                onSent={() => {
                  void merchantInvalidators.marketingAbandoned(queryClient);
                }}
              />
            ) : (
              <p className="text-sm text-ink-soft">
                Select an abandoned cart or checkout to start a recovery campaign.
              </p>
            )}
          </CardContent>
        </Card>
        </div>
      </section>
    </div>
  );
}
