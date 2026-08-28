import type { StoreProduct } from "@/lib/api/types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
const STOREHAUSE_API_PREFIX = "/storehause";

export type PlatformCatalogStore = {
  id: string;
  slug: string;
  business_name: string;
  description: string | null;
  industry: string;
  brand_color: string;
  logo_url: string | null;
  storefront_url: string;
  product_count?: number;
};

export type PlatformCatalogSearchHit = {
  relevance_score: number;
  store: PlatformCatalogStore;
  product: StoreProduct;
};

async function publicHttpFresh<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.message === "string" ? data.message : "Request failed");
  }
  return data as T;
}

export const platformCatalogApi = {
  async search(input: {
    query: string;
    budget_max?: number;
    limit?: number;
    store_slug?: string;
  }): Promise<PlatformCatalogSearchHit[]> {
    const params = new URLSearchParams({ query: input.query });
    if (input.budget_max != null) params.set("budget_max", String(input.budget_max));
    if (input.limit != null) params.set("limit", String(input.limit));
    if (input.store_slug) params.set("store_slug", input.store_slug);

    const payload = await publicHttpFresh<{ data: PlatformCatalogSearchHit[] }>(
      `${STOREHAUSE_API_PREFIX}/public/catalog/search?${params.toString()}`,
    );
    return payload.data ?? [];
  },

  async getProduct(
    storeSlug: string,
    productRef: string,
  ): Promise<{ store: PlatformCatalogStore; product: StoreProduct }> {
    return publicHttpFresh(
      `${STOREHAUSE_API_PREFIX}/public/catalog/stores/${encodeURIComponent(storeSlug)}/products/${encodeURIComponent(productRef)}`,
    );
  },

  async listStores(): Promise<PlatformCatalogStore[]> {
    const payload = await publicHttpFresh<{ data: PlatformCatalogStore[] }>(
      `${STOREHAUSE_API_PREFIX}/public/catalog/stores`,
    );
    return payload.data ?? [];
  },

  async getStore(slug: string): Promise<PlatformCatalogStore> {
    return publicHttpFresh(`${STOREHAUSE_API_PREFIX}/public/catalog/stores/${encodeURIComponent(slug)}`);
  },
};
