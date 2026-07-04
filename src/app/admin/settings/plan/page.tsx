"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  CreditCard,
  Loader2,
  MessageSquareText,
  Smartphone,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api/client";
import type { BillingAddOnPack, SubscriptionPlanId } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

function formatRenewalDate(value?: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not scheduled";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatSubscriptionStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function usagePercent(used: number, cap?: number | null) {
  if (!cap || cap <= 0) return 0;
  return Math.min(100, Math.round((used / cap) * 100));
}

function UsageProgressRow({
  label,
  valueLabel,
  percent,
}: {
  label: string;
  valueLabel: string;
  percent: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-ink-soft">{valueLabel}</span>
      </div>
      <Progress value={percent} />
    </div>
  );
}

function BillingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 animate-pulse rounded-xl bg-secondary" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-72 animate-pulse rounded-2xl bg-secondary" />
        ))}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export default function PlanSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const storeQuery = useQuery({
    queryKey: ["store", "me"],
    queryFn: () => api.getMyStore(),
  });
  const billingQuery = useQuery({
    queryKey: ["billing", "subscription"],
    queryFn: () => api.getBillingSubscription(),
    enabled: Boolean(storeQuery.data),
  });
  const [checkoutPlan, setCheckoutPlan] = useState<SubscriptionPlanId | null>(null);
  const [selectedSmsPack, setSelectedSmsPack] = useState("");
  const [selectedWhatsappPack, setSelectedWhatsappPack] = useState("");
  const [selectedAiPack, setSelectedAiPack] = useState("");

  useEffect(() => {
    if (storeQuery.isFetched && !storeQuery.data) {
      router.replace("/admin/onboarding");
    }
  }, [router, storeQuery.data, storeQuery.isFetched]);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (!checkout) return;

    if (checkout === "success") {
      toast.success("Payment received. Your subscription will update shortly.");
      void queryClient.invalidateQueries({ queryKey: ["billing", "subscription"] });
    } else if (checkout === "addon_success") {
      toast.success("Add-on purchase received. Your balance will update shortly.");
      void queryClient.invalidateQueries({ queryKey: ["billing", "subscription"] });
    } else if (checkout === "cancelled") {
      toast.message("Checkout cancelled. You can try again whenever you're ready.");
    }

    router.replace("/admin/settings/plan", { scroll: false });
  }, [queryClient, router, searchParams]);

  const startCheckout = useMutation({
    mutationFn: (plan: SubscriptionPlanId) => api.startBillingCheckout(plan),
    onSuccess: (result) => {
      if (result.mode === "checkout") {
        window.location.href = result.checkout_url;
        return;
      }
      toast.success(result.message);
      void queryClient.invalidateQueries({ queryKey: ["billing", "subscription"] });
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not start checkout"),
    onSettled: () => setCheckoutPlan(null),
  });

  const openBillingPortal = useMutation({
    mutationFn: () => api.openBillingPortal(),
    onSuccess: (result) => {
      window.location.href = result.portal_url;
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not open billing portal"),
  });

  const startTopup = useMutation({
    mutationFn: (pack: Pick<BillingAddOnPack, "type" | "id">) => api.startBillingTopup(pack),
    onSuccess: (result) => {
      if (result.mode === "checkout") {
        window.location.href = result.checkout_url;
      }
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Could not start top-up checkout"),
  });

  if (storeQuery.isLoading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const subscription = billingQuery.data?.subscription;
  const usage = subscription?.usage;
  const planOptions = billingQuery.data?.plans ?? [];
  const addOns = billingQuery.data?.add_ons;
  const smsRemaining = usage?.sms.remaining;
  const smsIncluded = usage?.sms.included_monthly ?? 0;
  const smsPercent =
    smsIncluded > 0 && smsRemaining !== undefined
      ? Math.round((smsRemaining / smsIncluded) * 100)
      : 0;
  const whatsappRemaining = usage?.whatsapp.remaining;
  const whatsappIncluded = usage?.whatsapp.included_monthly ?? 0;
  const whatsappPercent =
    whatsappIncluded > 0 && whatsappRemaining !== undefined
      ? Math.round((whatsappRemaining / whatsappIncluded) * 100)
      : 0;

  return (
  <div className="space-y-8">
    <header>
      <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">Settings</span>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Plan & billing</h1>
      <p className="mt-2 max-w-3xl text-sm text-ink-soft">
        Choose your subscription plan, track usage limits, and top up SMS, WhatsApp, and AI credits.
      </p>
    </header>

    <Card className="shadow-soft">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Manage subscription plan
            </CardTitle>
            <CardDescription>
              Review limits, renewal date, and upgrade options for your storefront.
            </CardDescription>
          </div>
          {subscription ? (
            <Badge variant="secondary">
              {formatSubscriptionStatus(subscription.status)} · renews{" "}
              {formatRenewalDate(subscription.renews_at)}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {billingQuery.isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
            <p className="font-medium text-destructive">Could not load billing details.</p>
            <p className="mt-1 text-ink-soft">
              {billingQuery.error instanceof Error
                ? billingQuery.error.message
                : "Please try again in a moment."}
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => billingQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        {subscription?.billing_configured === false ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Subscription billing is not configured on the server yet. Add your Dodo Payments API key
            and product IDs to enable checkout.
          </div>
        ) : null}

        {billingQuery.isLoading ? (
          <BillingSkeleton />
        ) : (
          <>
            {usage ? (
              <div className="rounded-2xl border border-border bg-background p-5">
                <div className="mb-4">
                  <h3 className="font-display text-lg font-semibold">Current usage</h3>
                  <p className="mt-1 text-sm text-ink-soft">
                    Track plan consumption against your monthly limits.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <UsageProgressRow
                    label="Monthly processing"
                    valueLabel={usage.processing.label}
                    percent={usagePercent(usage.processing.used_ngn ?? 0, usage.processing.cap_ngn)}
                  />
                  <UsageProgressRow
                    label="Storefronts"
                    valueLabel={usage.stores.label}
                    percent={usagePercent(usage.stores.used ?? 0, usage.stores.cap)}
                  />
                  <UsageProgressRow
                    label="Customers"
                    valueLabel={usage.customers.label}
                    percent={usagePercent(usage.customers.used ?? 0, usage.customers.cap)}
                  />
                  <UsageProgressRow
                    label="AI queries today"
                    valueLabel={`${usage.ai.used_today} / ${usage.ai.daily_limit}`}
                    percent={usagePercent(usage.ai.used_today, usage.ai.daily_limit)}
                  />
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-4">
              {(subscription?.limits ?? []).map((item) => (
                <div key={item.label} className="rounded-xl border border-border bg-background p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                    {item.label}
                  </p>
                  <p className="mt-2 font-display text-lg font-semibold">{item.value}</p>
                </div>
              ))}
            </div>

            {subscription?.has_payment_method ? (
              <Button
                variant="outline"
                onClick={() => openBillingPortal.mutate()}
                disabled={openBillingPortal.isPending}
              >
                {openBillingPortal.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                Manage billing
              </Button>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-3">
              {planOptions.map((plan) => {
                const isActive = subscription?.plan === plan.id;
                const isLoading = checkoutPlan === plan.id && startCheckout.isPending;

                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl border p-5 ${
                      isActive
                        ? "border-primary bg-primary/5 shadow-soft"
                        : "border-border bg-background"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-display text-lg font-bold">{plan.name}</h3>
                        <p className="mt-1 text-sm text-ink-soft">{plan.description}</p>
                      </div>
                      {isActive ? <Badge>Active</Badge> : null}
                    </div>
                    <p className="mt-5 font-display text-2xl font-bold">
                      {plan.price_label}
                      <span className="text-sm font-medium text-ink-soft">/mo</span>
                    </p>
                    <ul className="mt-4 space-y-2 text-sm text-ink-soft">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="mt-5 w-full"
                      variant={isActive ? "secondary" : "default"}
                      disabled={isActive || !plan.available || startCheckout.isPending}
                      onClick={() => {
                        setCheckoutPlan(plan.id);
                        startCheckout.mutate(plan.id);
                      }}
                    >
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {isActive
                        ? "Current plan"
                        : plan.available
                          ? "Switch to plan"
                          : "Unavailable"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>

    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquareText className="h-5 w-5 text-primary" />
          Messaging wallets
        </CardTitle>
        <CardDescription>
          Each plan includes monthly SMS and WhatsApp units. Buy more when you run out — purchased
          units stack on top of your plan allowance.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-border bg-background p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-ink-soft">SMS balance</p>
              <p className="mt-1 font-display text-3xl font-bold">
                {(smsRemaining ?? 0).toLocaleString()} units
              </p>
            </div>
            <Badge variant="secondary">
              {smsIncluded > 0 ? `${smsPercent}% of monthly included left` : "No allowance"}
            </Badge>
          </div>
          <Progress value={smsPercent} className="mt-4" />
          <p className="mt-3 text-xs text-ink-soft">
            {usage
              ? `${usage.sms.included_remaining.toLocaleString()} included · ${usage.sms.purchased_balance.toLocaleString()} purchased`
              : "Loading SMS balance"}
          </p>
          <Field label="Buy more SMS">
            <select
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={selectedSmsPack}
              onChange={(event) => setSelectedSmsPack(event.target.value)}
            >
              <option value="">Select a package</option>
              {(addOns?.sms ?? []).map((pack) => (
                <option key={pack.id} value={pack.id} disabled={!pack.available}>
                  {pack.units?.toLocaleString()} units — {pack.price_label}
                </option>
              ))}
            </select>
          </Field>
          <Button
            className="w-full"
            disabled={!selectedSmsPack || startTopup.isPending}
            onClick={() => {
              if (!selectedSmsPack) return;
              startTopup.mutate({ type: "sms", id: selectedSmsPack });
            }}
          >
            {startTopup.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Smartphone className="mr-2 h-4 w-4" />
            )}
            Buy SMS units
          </Button>
        </div>

        <div className="space-y-4 rounded-2xl border border-border bg-background p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-ink-soft">WhatsApp balance</p>
              <p className="mt-1 font-display text-3xl font-bold">
                {(whatsappRemaining ?? 0).toLocaleString()} units
              </p>
            </div>
            <Badge variant="secondary">
              {whatsappIncluded > 0
                ? `${whatsappPercent}% of monthly included left`
                : "No allowance"}
            </Badge>
          </div>
          <Progress value={whatsappPercent} className="mt-4" />
          <p className="mt-3 text-xs text-ink-soft">
            {usage
              ? `${usage.whatsapp.included_remaining.toLocaleString()} included · ${usage.whatsapp.purchased_balance.toLocaleString()} purchased`
              : "Loading WhatsApp balance"}
          </p>
          <Field label="Buy more WhatsApp">
            <select
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={selectedWhatsappPack}
              onChange={(event) => setSelectedWhatsappPack(event.target.value)}
            >
              <option value="">Select a package</option>
              {(addOns?.whatsapp ?? []).map((pack) => (
                <option key={pack.id} value={pack.id} disabled={!pack.available}>
                  {pack.units?.toLocaleString()} units — {pack.price_label}
                </option>
              ))}
            </select>
          </Field>
          <Button
            className="w-full"
            disabled={!selectedWhatsappPack || startTopup.isPending}
            onClick={() => {
              if (!selectedWhatsappPack) return;
              startTopup.mutate({ type: "whatsapp", id: selectedWhatsappPack });
            }}
          >
            {startTopup.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MessageSquareText className="mr-2 h-4 w-4" />
            )}
            Buy WhatsApp units
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI generation credits
        </CardTitle>
        <CardDescription>
          Every plan includes 5 AI queries per day for storefront generation and edits. Purchase
          extra credits when you need more in a busy day.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-border bg-background p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-ink-soft">Today&apos;s free queries</p>
              <p className="mt-1 font-display text-3xl font-bold">
                {usage
                  ? `${usage.ai.remaining_today} / ${usage.ai.daily_limit} left`
                  : "5 / 5 left"}
              </p>
            </div>
            <Badge variant="secondary">Resets daily</Badge>
          </div>
          <Progress
            value={usage ? usagePercent(usage.ai.used_today, usage.ai.daily_limit) : 0}
            className="mt-5"
          />
          <p className="mt-3 text-sm text-ink-soft">
            Purchased credits remaining:{" "}
            <span className="font-semibold text-foreground">
              {(usage?.ai.purchased_remaining ?? 0).toLocaleString()}
            </span>
          </p>
        </div>
        <div className="space-y-3 rounded-2xl border border-border bg-background p-5">
          <Field label="Credit package">
            <select
              className="h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={selectedAiPack}
              onChange={(event) => setSelectedAiPack(event.target.value)}
            >
              <option value="">Select a package</option>
              {(addOns?.ai_credits ?? []).map((pack) => (
                <option key={pack.id} value={pack.id} disabled={!pack.available}>
                  {pack.credits?.toLocaleString()} credits — {pack.price_label}
                </option>
              ))}
            </select>
          </Field>
          <Button
            className="w-full"
            disabled={!selectedAiPack || startTopup.isPending}
            onClick={() => {
              if (!selectedAiPack) return;
              startTopup.mutate({ type: "ai_credits", id: selectedAiPack });
            }}
          >
            {startTopup.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Buy AI credits
          </Button>
        </div>
      </CardContent>
    </Card>

    <p className="text-sm text-ink-soft">
      Need store profile or payout settings?{" "}
      <Link href="/admin/settings/store" className="font-medium text-primary hover:underline">
        Store details
      </Link>{" "}
      ·{" "}
      <Link href="/admin/settings?tab=payouts" className="font-medium text-primary hover:underline">
        Payouts
      </Link>
    </p>
  </div>
  );
}
