"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Download,
  Eye,
  ExternalLink,
  Loader2,
  Package,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { useMerchantDashboard, useStoreMe } from "@/hooks/use-merchant-queries";
import { getStorefrontUrl } from "@/lib/store-host";
import { useAuth } from "@/lib/auth-context";
import { useLocationScope } from "@/lib/location-scope";
import { DashboardAiBuilderFab } from "@/components/admin/dashboard-ai-builder-fab";
import { PublishStatusBadge } from "@/components/admin/publish-storefront-button";
import { DashboardMetricCard } from "@/components/admin/dashboard/metric-card";
import { SalesAnalyticsCard } from "@/components/admin/dashboard/sales-analytics-card";
import { TrafficCard } from "@/components/admin/dashboard/traffic-card";
import { TopSellingCard } from "@/components/admin/dashboard/top-selling-card";
import { ProductSalesCard } from "@/components/admin/dashboard/product-sales-card";
import { ShopperDemandCard } from "@/components/admin/dashboard/shopper-demand-card";

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

function firstName(name?: string | null) {
  if (!name?.trim()) return "there";
  return name.trim().split(/\s+/)[0];
}

function periodTrend(values: number[]) {
  if (values.length < 4) return null;
  const mid = Math.floor(values.length / 2);
  const previous = values.slice(0, mid).reduce((a, b) => a + b, 0);
  const recent = values.slice(mid).reduce((a, b) => a + b, 0);
  const delta = recent - previous;
  if (previous === 0) {
    return recent > 0 ? { value: 100, isPositive: true as const, delta } : null;
  }
  return {
    value: (delta / previous) * 100,
    isPositive: delta >= 0,
    delta,
  };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { locationId, selectedLabel } = useLocationScope();
  const [builderOpen, setBuilderOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("setup") === "content") {
      router.replace("/admin/website?mode=create");
    }
  }, [router]);

  const storeQuery = useStoreMe({ enabled: !!user });
  const store = storeQuery.data;

  useEffect(() => {
    if (storeQuery.isFetched && !storeQuery.data && user && !user.has_store) {
      router.replace("/admin/onboarding");
    }
  }, [storeQuery.isFetched, storeQuery.data, user, router]);

  const dashboardQuery = useMerchantDashboard({
    enabled: !!user && (user.has_store || !!store),
    locationId,
  });

  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "2-digit",
        year: "numeric",
      }),
    [],
  );

  const todayLabelShort = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
    [],
  );

  const asOfLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [],
  );

  const overview = dashboardQuery.data;
  const metrics = overview?.metrics;

  const salesSeries = useMemo(() => {
    return (overview?.sales_by_day ?? []).map((day) => {
      const date = new Date(`${day.date}T12:00:00`);
      return {
        label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        fullDate: date.toLocaleDateString(undefined, {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        sales: day.sales,
        orders: day.orders,
      };
    });
  }, [overview]);

  const salesTrend = useMemo(
    () => periodTrend(salesSeries.map((d) => d.sales)),
    [salesSeries],
  );
  const ordersTrend = useMemo(
    () => periodTrend(salesSeries.map((d) => d.orders)),
    [salesSeries],
  );

  if (storeQuery.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!store) return null;

  const canViewLive = store.is_published ?? false;
  const publishState = {
    status: store.status ?? "draft",
    published_at: store.published_at ?? null,
    is_published: store.is_published ?? false,
    has_unpublished_changes: store.has_unpublished_changes ?? false,
  };

  const loading = dashboardQuery.isLoading || dashboardQuery.isFetching;

  return (
    <div className="w-full min-w-0 px-4 py-6 sm:px-6 sm:py-8 md:py-10">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm text-ink-soft">
            <span className="sm:hidden">{todayLabelShort}</span>
            <span className="hidden sm:inline">{todayLabel}</span>
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl md:text-4xl">
            Welcome back, {firstName(user?.name)}!
          </h1>
          <p className="mt-1 truncate text-sm text-ink-soft">
            {store.business_name}
            <span className="hidden sm:inline"> · sales, traffic, and fulfillment at a glance</span>
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs text-ink-soft shadow-soft md:inline-flex">
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            {selectedLabel} · as of {asOfLabel}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PublishStatusBadge publish={publishState} />
            {canViewLive ? (
              <a
                href={getStorefrontUrl(store.slug)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-semibold text-ink shadow-soft hover:bg-secondary sm:flex-none sm:px-4"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                <span className="truncate">View live</span>
              </a>
            ) : (
              <Link
                href="/admin/website"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-sm font-semibold text-ink shadow-soft hover:bg-secondary sm:flex-none sm:px-4"
              >
                <span className="truncate">Publish</span>
              </Link>
            )}
            <Link
              href="/admin/orders"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-95 sm:flex-none sm:px-4"
            >
              <Download className="h-4 w-4 shrink-0" />
              <span className="truncate">Export</span>
            </Link>
          </div>
        </div>
      </div>

      <section className="mt-6 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:mt-8 sm:gap-4 xl:grid-cols-4">
        <DashboardMetricCard
          title="Total revenue"
          value={formatMoney(metrics?.total_sales ?? 0)}
          icon={<Wallet className="h-5 w-5" />}
          loading={loading}
          trend={
            salesTrend
              ? { value: salesTrend.value, isPositive: salesTrend.isPositive }
              : null
          }
          footer={
            salesTrend
              ? `${salesTrend.delta >= 0 ? "+" : "−"}${formatMoney(Math.abs(salesTrend.delta))} vs prior`
              : `${formatMoney(metrics?.average_order_value ?? 0)} avg order`
          }
          href="/admin/orders"
        />
        <DashboardMetricCard
          title="Total visitors"
          value={formatNumber(metrics?.visits_last_30_days ?? metrics?.total_visits ?? 0)}
          icon={<Eye className="h-5 w-5" />}
          iconClassName="text-[oklch(0.55_0.1_230)] bg-[oklch(0.55_0.1_230)]/10"
          loading={loading}
          footer={
            locationId === "all"
              ? `${formatNumber(metrics?.visits_today ?? 0)} visits today`
              : "Storefront visits (all locations)"
          }
        />
        <DashboardMetricCard
          title="Total orders"
          value={formatNumber(metrics?.total_orders ?? 0)}
          icon={<ShoppingBag className="h-5 w-5" />}
          iconClassName="text-[oklch(0.58_0.1_200)] bg-[oklch(0.58_0.1_200)]/10"
          loading={loading}
          trend={
            ordersTrend
              ? { value: ordersTrend.value, isPositive: ordersTrend.isPositive }
              : null
          }
          footer={
            ordersTrend
              ? `${ordersTrend.delta >= 0 ? "+" : "−"}${formatNumber(Math.abs(ordersTrend.delta))} vs prior`
              : `${formatNumber(metrics?.pending_orders ?? 0)} pending`
          }
          href="/admin/orders"
        />
        <DashboardMetricCard
          title="Total products"
          value={formatNumber(metrics?.products_count ?? 0)}
          icon={<Package className="h-5 w-5" />}
          iconClassName="text-[oklch(0.7_0.12_70)] bg-[oklch(0.7_0.12_70)]/10"
          loading={loading}
          footer={`${metrics?.conversion_rate ?? 0}% conversion`}
          href="/admin/products"
        />
      </section>

      <section className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:gap-4 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <SalesAnalyticsCard
            data={salesSeries}
            loading={loading}
            asOfLabel={asOfLabel}
            formatMoney={formatMoney}
          />
        </div>
        <div className="min-w-0">
          <TrafficCard sources={overview?.traffic_sources ?? []} loading={loading} />
        </div>
      </section>

      <section className="mt-3 grid grid-cols-1 gap-3 sm:mt-4 sm:gap-4 xl:grid-cols-3">
        <div className="min-w-0 xl:col-span-2">
          <TopSellingCard
            products={overview?.top_products ?? []}
            loading={loading}
            formatMoney={formatMoney}
          />
        </div>
        <div className="min-w-0">
          <ProductSalesCard rows={overview?.orders_by_status ?? []} loading={loading} />
        </div>
      </section>

      <section className="mt-3 sm:mt-4">
        <ShopperDemandCard summary={overview?.shopper_demand} loading={loading} />
      </section>

      <DashboardAiBuilderFab open={builderOpen} onOpenChange={setBuilderOpen} />
    </div>
  );
}
