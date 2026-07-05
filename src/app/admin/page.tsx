"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMerchantDashboard, useStoreMe } from "@/hooks/use-merchant-queries";
import Link from "next/link";
import {
  Banknote,
  BarChart3,
  ExternalLink,
  Loader2,
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import { getStorefrontUrl } from "@/lib/store-host";
import { useAuth } from "@/lib/auth-context";
import { DashboardAiBuilderFab } from "@/components/admin/dashboard-ai-builder-fab";
import { PublishStatusBadge } from "@/components/admin/publish-storefront-button";

function formatMoney(value: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-NG").format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof BarChart3;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-ink-soft">{label}</p>
          <div className="mt-2 font-display text-2xl font-bold">
            {loading ? (
              <span className="inline-block h-8 w-20 animate-pulse rounded bg-secondary" />
            ) : (
              value
            )}
          </div>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-soft">{hint}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [builderOpen, setBuilderOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("setup") === "content") {
      router.replace("/admin/builder");
    }
  }, [router]);

  const storeQuery = useStoreMe({ enabled: !!user });

  const store = storeQuery.data;

  useEffect(() => {
    if (storeQuery.isFetched && !storeQuery.data && user) {
      router.replace("/admin/onboarding");
    }
  }, [storeQuery.isFetched, storeQuery.data, user, router]);

  const dashboardQuery = useMerchantDashboard({
    enabled: !!user && (user.has_store || !!store),
  });

  if (storeQuery.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!store) return null;

  const overview = dashboardQuery.data;
  const metrics = overview?.metrics;
  const maxDailySales = Math.max(...(overview?.sales_by_day.map((day) => day.sales) ?? [0]), 1);
  const canViewLive = store.is_published ?? false;
  const publishState = {
    status: store.status ?? "draft",
    published_at: store.published_at ?? null,
    is_published: store.is_published ?? false,
    has_unpublished_changes: store.has_unpublished_changes ?? false,
  };

  return (
    <div className="w-full px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            Overview
          </span>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
            {store.business_name}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Sales, traffic, conversion, and order activity for your storefront.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PublishStatusBadge publish={publishState} />
          {canViewLive ? (
            <a
              href={getStorefrontUrl(store.slug)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-ink shadow-soft hover:bg-secondary"
            >
              <ExternalLink className="h-4 w-4" />
              View live store
            </a>
          ) : (
            <Link
              href="/admin/website"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-ink shadow-soft hover:bg-secondary"
            >
              Publish storefront
            </Link>
          )}
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total sales"
          value={formatMoney(metrics?.total_sales ?? 0)}
          hint={`${formatMoney(metrics?.average_order_value ?? 0)} average order value`}
          icon={Banknote}
          loading={dashboardQuery.isLoading}
        />
        <MetricCard
          label="Orders"
          value={formatNumber(metrics?.total_orders ?? 0)}
          hint={`${formatNumber(metrics?.pending_orders ?? 0)} pending fulfillment`}
          icon={ShoppingBag}
          loading={dashboardQuery.isLoading}
        />
        <MetricCard
          label="Store visits"
          value={formatNumber(metrics?.total_visits ?? 0)}
          hint={`${formatNumber(metrics?.visits_today ?? 0)} visits today`}
          icon={Users}
          loading={dashboardQuery.isLoading}
        />
        <MetricCard
          label="Conversion"
          value={`${metrics?.conversion_rate ?? 0}%`}
          hint={`${formatNumber(metrics?.products_count ?? 0)} live products in catalog`}
          icon={TrendingUp}
          loading={dashboardQuery.isLoading}
        />
      </section>

      <section className="mt-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold">Sales trend</h2>
              <p className="text-sm text-ink-soft">Orders and revenue over the last 14 days.</p>
            </div>
            <BarChart3 className="h-5 w-5 text-ink-soft" />
          </div>
          <div className="mt-6 flex h-48 items-end gap-2">
            {(overview?.sales_by_day ?? []).map((day) => (
              <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-md bg-primary/70"
                  style={{
                    height: `${Math.max((day.sales / maxDailySales) * 100, day.sales > 0 ? 8 : 2)}%`,
                  }}
                  title={`${day.date}: ${formatMoney(day.sales)} from ${day.orders} orders`}
                />
                <span className="w-full truncate text-center text-[10px] text-ink-soft">
                  {new Date(day.date).toLocaleDateString("en-NG", { day: "numeric" })}
                </span>
              </div>
            ))}
            {!dashboardQuery.isLoading && !overview?.sales_by_day.length ? (
              <div className="grid h-full w-full place-items-center rounded-xl border border-dashed border-border text-sm text-ink-soft">
                Sales activity will appear after customers start ordering.
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold">Recent orders</h2>
              <p className="text-sm text-ink-soft">
                Latest checkout activity from your storefront.
              </p>
            </div>
            <Package className="h-5 w-5 text-ink-soft" />
          </div>
          <div className="mt-5 space-y-3">
            {dashboardQuery.isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-14 animate-pulse rounded-lg bg-secondary" />
              ))
            ) : overview?.recent_orders.length ? (
              overview.recent_orders.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background p-3 transition hover:bg-secondary/30"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{order.order_number}</div>
                    <div className="truncate text-xs text-ink-soft">
                      {order.customer_name} • {formatDate(order.placed_at)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      {formatMoney(order.total_amount, order.currency)}
                    </div>
                    <div className="text-xs capitalize text-ink-soft">{order.status}</div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-ink-soft">
                No orders yet. Completed checkouts will show here.
              </div>
            )}
          </div>
        </div>
      </section>
      <DashboardAiBuilderFab open={builderOpen} onOpenChange={setBuilderOpen} />
    </div>
  );
}
