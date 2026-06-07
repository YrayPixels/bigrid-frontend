import { mockApi } from "./mocks";
import type { PublicStorefront } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
const STOREHAUSE_API_PREFIX = "/storehause";
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true" || !API_BASE;

class StorefrontApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function publicHttp<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new StorefrontApiError(res.status, data?.message ?? "Request failed");
  }
  return data as T;
}

export const storefrontApi = {
  async getBySlug(slug: string): Promise<PublicStorefront> {
    if (USE_MOCKS) return mockApi.getPublicStorefront(slug);
    return publicHttp<PublicStorefront>(`${STOREHAUSE_API_PREFIX}/public/storefronts/${slug}`);
  },

  async getByHost(host: string): Promise<PublicStorefront> {
    if (USE_MOCKS) return mockApi.getPublicStorefrontByHost(host);
    const encoded = encodeURIComponent(host);
    return publicHttp<PublicStorefront>(
      `${STOREHAUSE_API_PREFIX}/public/storefronts/by-host?host=${encoded}`,
    );
  },
};

export { StorefrontApiError };
