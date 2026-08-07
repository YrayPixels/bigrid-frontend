export const merchantKeys = {
  store: {
    all: ["store"] as const,
    me: () => [...merchantKeys.store.all, "me"] as const,
  },
  dashboard: (locationId: string = "all") =>
    ["merchant-dashboard-overview", locationId] as const,
  products: (storeId?: string) => ["products", storeId] as const,
  categories: (storeId?: string) => ["categories", storeId] as const,
  orders: {
    all: ["merchant-orders"] as const,
    list: (
      status: string,
      search: string,
      page: number,
      paymentStatus = "all",
      locationId = "all",
    ) => [...merchantKeys.orders.all, status, paymentStatus, search, page, locationId] as const,
    productStats: (storeId?: string) =>
      [...merchantKeys.orders.all, "product-stats", storeId] as const,
  },
  order: (orderId: string) => ["merchant-order", orderId] as const,
  customers: {
    all: ["merchant-customers"] as const,
    list: (search: string, page: number) =>
      [...merchantKeys.customers.all, search, page] as const,
  },
  customer: (customerId: string) => ["merchant-customer", customerId] as const,
  storefront: (storeId?: string) => ["storefront", storeId] as const,
  storefrontTemplates: () => ["storefront-templates"] as const,
  builderSession: () => ["builder-session"] as const,
  marketing: {
    all: ["marketing"] as const,
    status: () => [...merchantKeys.marketing.all, "status"] as const,
    posts: (status?: string) => [...merchantKeys.marketing.all, "posts", status ?? "all"] as const,
    campaigns: () => [...merchantKeys.marketing.all, "campaigns"] as const,
    performance: (windowDays?: number) =>
      [...merchantKeys.marketing.all, "performance", windowDays ?? 90] as const,
    audience: () => [...merchantKeys.marketing.all, "audience"] as const,
    bestTime: (provider?: string) =>
      [...merchantKeys.marketing.all, "best-time", provider ?? "all"] as const,
    adAccounts: () => [...merchantKeys.marketing.all, "ad-accounts"] as const,
    abandoned: (page: number) => ["marketing-abandoned", page] as const,
  },
  billing: {
    subscription: () => ["billing", "subscription"] as const,
  },
  paymentSettings: () => ["payment-settings"] as const,
  domains: () => ["store-domains"] as const,
  publicStorefront: (slug: string) => ["public-storefront", slug] as const,
};
