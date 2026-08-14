"use client";

import {
  useQuery,
  type QueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { storefrontApi } from "@/lib/api/storefront";
import type {
  AbandonedRecoveryResponse,
  AdAccount,
  AdCampaign,
  BillingSubscriptionResponse,
  BuilderSessionResponse,
  BestTimeToPost,
  MarketingAudience,
  MarketingPerformance,
  MarketingStatus,
  SocialPost,
  SocialPostStatus,
  MerchantDashboardOverview,
  Store,
  StoreCategory,
  StoreOrder,
  StoreOrdersResponse,
  StoreCustomer,
  StoreCustomersResponse,
  StorePaymentSettings,
  StoreDomainsResponse,
  StoreProduct,
  StorefrontDraftResponse,
  StorefrontTemplateOption,
} from "@/lib/api/types";
import { merchantKeys } from "@/lib/query-keys";

type StoreQueryOptions = Omit<
  UseQueryOptions<Store | null, Error>,
  "queryKey" | "queryFn"
>;

export function useStoreMe(options?: StoreQueryOptions) {
  return useQuery({
    queryKey: merchantKeys.store.me(),
    queryFn: () => api.getMyStore(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useMerchantDashboard(
  options?: Omit<
    UseQueryOptions<MerchantDashboardOverview, Error>,
    "queryKey" | "queryFn"
  > & { locationId?: string },
) {
  const locationId = options?.locationId ?? "all";
  const { locationId: _locationId, ...queryOptions } = options ?? {};
  return useQuery({
    queryKey: merchantKeys.dashboard(locationId),
    queryFn: () => api.getDashboardOverview(locationId),
    staleTime: 60 * 1000,
    ...queryOptions,
  });
}

export function useStorefrontTemplates(
  options?: Omit<
    UseQueryOptions<StorefrontTemplateOption[], Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: merchantKeys.storefrontTemplates(),
    queryFn: () => api.getStorefrontTemplates(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useBuilderSession(
  options?: Omit<
    UseQueryOptions<BuilderSessionResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: merchantKeys.builderSession(),
    queryFn: () => api.getCurrentBuilderSession(),
    staleTime: 30 * 1000,
    ...options,
  });
}

export function useBuilderSessionOrStart(
  options?: Omit<
    UseQueryOptions<BuilderSessionResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: merchantKeys.builderSession(),
    queryFn: async () => {
      const current = await api.getCurrentBuilderSession();
      if (current.session) return current;
      return api.startBuilderSession();
    },
    staleTime: 30 * 1000,
    ...options,
  });
}

export function useCategories(
  storeId?: string,
  options?: Omit<UseQueryOptions<StoreCategory[], Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: merchantKeys.categories(storeId),
    queryFn: () => api.getCategories(),
    enabled: !!storeId,
    ...options,
  });
}

export function useProducts(
  storeId?: string,
  options?: Omit<UseQueryOptions<StoreProduct[], Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: merchantKeys.products(storeId),
    queryFn: () => api.getProducts(),
    enabled: !!storeId,
    ...options,
  });
}

export function useMerchantOrders(
  params: {
    status: string;
    search: string;
    page: number;
    payment_status?: string;
    location_id?: string;
  },
  options?: Omit<UseQueryOptions<StoreOrdersResponse, Error>, "queryKey" | "queryFn">,
) {
  const paymentStatus = params.payment_status ?? "all";
  const locationId = params.location_id ?? "all";
  return useQuery({
    queryKey: merchantKeys.orders.list(
      params.status,
      params.search,
      params.page,
      paymentStatus,
      locationId,
    ),
    queryFn: () =>
      api.getOrders({
        status: params.status === "all" ? undefined : params.status,
        payment_status: paymentStatus === "all" ? undefined : paymentStatus,
        location_id: locationId === "all" ? undefined : locationId,
        search: params.search || undefined,
        page: params.page,
        per_page: 15,
      }),
    placeholderData: (prev) => prev,
    ...options,
  });
}

export function useMerchantOrder(
  orderId: string,
  options?: Omit<UseQueryOptions<StoreOrder, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: merchantKeys.order(orderId),
    queryFn: () => api.getOrder(orderId),
    enabled: !!orderId,
    ...options,
  });
}

export function useMerchantCustomers(
  params: { search: string; page: number },
  options?: Omit<UseQueryOptions<StoreCustomersResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: merchantKeys.customers.list(params.search, params.page),
    queryFn: () =>
      api.getCustomers({
        search: params.search || undefined,
        page: params.page,
        per_page: 20,
      }),
    placeholderData: (prev) => prev,
    ...options,
  });
}

export function useMerchantCustomer(
  customerId: string,
  options?: Omit<UseQueryOptions<StoreCustomer, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: merchantKeys.customer(customerId),
    queryFn: () => api.getCustomer(customerId),
    enabled: !!customerId,
    ...options,
  });
}

export function useStorefront(
  storeId?: string,
  options?: Omit<UseQueryOptions<StorefrontDraftResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: merchantKeys.storefront(storeId),
    queryFn: () => api.getStorefront(storeId!),
    enabled: !!storeId,
    ...options,
  });
}

export function useMarketingStatus(
  options?: Omit<UseQueryOptions<MarketingStatus, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: merchantKeys.marketing.status(),
    queryFn: () => api.getMarketingStatus(),
    ...options,
  });
}

export function useMarketingPosts(
  status?: SocialPostStatus,
  options?: Omit<UseQueryOptions<{ posts: SocialPost[] }, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: merchantKeys.marketing.posts(status),
    queryFn: () => api.listMarketingPosts({ status, limit: 50 }),
    ...options,
  });
}

export function useMarketingPerformance(
  windowDays?: number,
  options?: Omit<UseQueryOptions<MarketingPerformance, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: merchantKeys.marketing.performance(windowDays),
    queryFn: () => api.getMarketingPerformance(windowDays),
    ...options,
  });
}

export function useMarketingAudience(
  options?: Omit<UseQueryOptions<MarketingAudience, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: merchantKeys.marketing.audience(),
    queryFn: () => api.getMarketingAudience(),
    ...options,
  });
}

export function useBestTimeToPost(
  provider?: string,
  options?: Omit<UseQueryOptions<BestTimeToPost, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: merchantKeys.marketing.bestTime(provider),
    queryFn: () => api.getBestTimeToPost(provider),
    ...options,
  });
}

export function useAdCampaigns(
  options?: Omit<UseQueryOptions<{ campaigns: AdCampaign[] }, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: merchantKeys.marketing.campaigns(),
    queryFn: () => api.listAdCampaigns(),
    ...options,
  });
}

export function useAdAccounts(
  options?: Omit<UseQueryOptions<{ accounts: AdAccount[] }, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: merchantKeys.marketing.adAccounts(),
    queryFn: () => api.listAdAccounts(),
    ...options,
  });
}

export function useBillingSubscription(
  options?: Omit<
    UseQueryOptions<BillingSubscriptionResponse, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: merchantKeys.billing.subscription(),
    queryFn: () => api.getBillingSubscription(),
    ...options,
  });
}

export function usePaymentSettings(
  options?: Omit<UseQueryOptions<StorePaymentSettings, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: merchantKeys.paymentSettings(),
    queryFn: () => api.getPaymentSettings(),
    ...options,
  });
}

export function useStoreDomains(
  options?: Omit<UseQueryOptions<StoreDomainsResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: merchantKeys.domains(),
    queryFn: () => api.getStoreDomains(),
    staleTime: 30 * 1000,
    ...options,
  });
}

export function useProductOrderStats(
  storeId?: string,
  options?: Omit<UseQueryOptions<StoreOrdersResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: merchantKeys.orders.productStats(storeId),
    queryFn: () => api.getOrders({ per_page: 100 }),
    enabled: !!storeId,
    ...options,
  });
}

export function useMarketingAbandoned(
  page: number,
  options?: Omit<UseQueryOptions<AbandonedRecoveryResponse, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: merchantKeys.marketing.abandoned(page),
    queryFn: () => api.getAbandonedRecoveries({ page, per_page: 15 }),
    ...options,
  });
}

export function usePublicStorefront(
  slug: string,
  options?: Omit<
    UseQueryOptions<Awaited<ReturnType<typeof storefrontApi.getBySlug>>, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: merchantKeys.publicStorefront(slug),
    queryFn: () => storefrontApi.getBySlug(slug),
    enabled: !!slug,
    ...options,
  });
}

export const merchantCache = {
  setStoreMe: (qc: QueryClient, store: Store) =>
    qc.setQueryData(merchantKeys.store.me(), store),
  setMarketingStatus: (qc: QueryClient, status: MarketingStatus) =>
    qc.setQueryData(merchantKeys.marketing.status(), status),
  setStorefront: (qc: QueryClient, storeId: string, data: StorefrontDraftResponse) =>
    qc.setQueryData(merchantKeys.storefront(storeId), data),
  setPaymentSettings: (qc: QueryClient, data: StorePaymentSettings) =>
    qc.setQueryData(merchantKeys.paymentSettings(), data),
  setBuilderSession: (qc: QueryClient, data: BuilderSessionResponse) =>
    qc.setQueryData(merchantKeys.builderSession(), data),
  setProducts: (qc: QueryClient, storeId: string, data: StoreProduct[]) =>
    qc.setQueryData(merchantKeys.products(storeId), data),
};

export const merchantInvalidators = {
  store: (qc: QueryClient) =>
    qc.invalidateQueries({ queryKey: merchantKeys.store.all }),
  dashboard: (qc: QueryClient) =>
    qc.invalidateQueries({ queryKey: ["merchant-dashboard-overview"] }),
  products: (qc: QueryClient) => qc.invalidateQueries({ queryKey: ["products"] }),
  categories: (qc: QueryClient) => qc.invalidateQueries({ queryKey: ["categories"] }),
  orders: (qc: QueryClient) =>
    qc.invalidateQueries({ queryKey: merchantKeys.orders.all }),
  order: (qc: QueryClient, orderId: string) =>
    qc.invalidateQueries({ queryKey: merchantKeys.order(orderId) }),
  customers: (qc: QueryClient) =>
    qc.invalidateQueries({ queryKey: merchantKeys.customers.all }),
  customer: (qc: QueryClient, customerId: string) =>
    qc.invalidateQueries({ queryKey: merchantKeys.customer(customerId) }),
  storefront: (qc: QueryClient) =>
    qc.invalidateQueries({ queryKey: ["storefront"] }),
  storefrontTemplates: (qc: QueryClient) =>
    qc.invalidateQueries({ queryKey: merchantKeys.storefrontTemplates() }),
  builderSession: (qc: QueryClient) =>
    qc.invalidateQueries({ queryKey: merchantKeys.builderSession() }),
  marketing: (qc: QueryClient) =>
    qc.invalidateQueries({ queryKey: merchantKeys.marketing.all }),
  marketingAbandoned: (qc: QueryClient) =>
    qc.invalidateQueries({ queryKey: ["marketing-abandoned"] }),
  billing: (qc: QueryClient) =>
    qc.invalidateQueries({ queryKey: merchantKeys.billing.subscription() }),
  paymentSettings: (qc: QueryClient) =>
    qc.invalidateQueries({ queryKey: merchantKeys.paymentSettings() }),
};
