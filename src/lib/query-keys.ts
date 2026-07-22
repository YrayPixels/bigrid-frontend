export const merchantKeys = {
  store: {
    all: ["store"] as const,
    me: () => [...merchantKeys.store.all, "me"] as const,
  },
  dashboard: () => ["merchant-dashboard-overview"] as const,
  products: (storeId?: string) => ["products", storeId] as const,
  categories: (storeId?: string) => ["categories", storeId] as const,
  orders: {
    all: ["merchant-orders"] as const,
    list: (status: string, search: string, page: number, paymentStatus = "all") =>
      [...merchantKeys.orders.all, status, paymentStatus, search, page] as const,
    productStats: (storeId?: string) =>
      [...merchantKeys.orders.all, "product-stats", storeId] as const,
  },
  order: (orderId: string) => ["merchant-order", orderId] as const,
  storefront: (storeId?: string) => ["storefront", storeId] as const,
  storefrontTemplates: () => ["storefront-templates"] as const,
  builderSession: () => ["builder-session"] as const,
  marketing: {
    all: ["marketing"] as const,
    status: () => [...merchantKeys.marketing.all, "status"] as const,
    abandoned: (page: number) => ["marketing-abandoned", page] as const,
  },
  billing: {
    subscription: () => ["billing", "subscription"] as const,
  },
  paymentSettings: () => ["payment-settings"] as const,
  domains: () => ["store-domains"] as const,
  publicStorefront: (slug: string) => ["public-storefront", slug] as const,
};
