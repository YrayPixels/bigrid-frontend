import { mockApi } from "./mocks";
import type {
  CreateStoreOrderInput,
  PlaceOrderResponse,
  PublicStorefront,
  PublishedStorefrontIndexEntry,
  StoreContactInquiryInput,
  StoreOrder,
  StoreProductReview,
  StoreProductReviewInput,
  StoreProductReviewsResponse,
} from "./types";

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

async function publicWrite<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new StorefrontApiError(res.status, data?.message ?? "Request failed");
  }
  return data as T;
}

async function publicHttpFresh<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new StorefrontApiError(res.status, data?.message ?? "Request failed");
  }
  return data as T;
}

export const storefrontApi = {
  async listPublished(): Promise<PublishedStorefrontIndexEntry[]> {
    if (USE_MOCKS) return mockApi.listPublishedStorefronts();
    const res = await publicHttp<{ data: PublishedStorefrontIndexEntry[] }>(
      `${STOREHAUSE_API_PREFIX}/public/storefronts`,
    );
    return res.data;
  },

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

  async placeOrder(slug: string, body: CreateStoreOrderInput): Promise<PlaceOrderResponse> {
    if (USE_MOCKS) {
      const res = await mockApi.placeOrder(slug, body);
      return { order: res.order };
    }
    return publicWrite<PlaceOrderResponse>(
      `${STOREHAUSE_API_PREFIX}/public/storefronts/${slug}/orders`,
      body,
    );
  },

  async verifyPayment(slug: string, reference: string): Promise<StoreOrder> {
    if (USE_MOCKS) {
      const res = await mockApi.placeOrder(slug, {
        customer: {
          first_name: "Test",
          last_name: "User",
          email: "test@example.com",
          phone: "+2348000000000",
        },
        delivery_address: "Test",
        items: [],
      });
      return { ...res.order, payment_status: "paid" };
    }
    const res = await publicWrite<{ order: StoreOrder }>(
      `${STOREHAUSE_API_PREFIX}/public/storefronts/${slug}/orders/verify`,
      { reference },
    );
    return res.order;
  },

  async lookupOrder(
    slug: string,
    params: { order: string; email: string },
  ): Promise<StoreOrder> {
    if (USE_MOCKS) {
      return {
        id: "1",
        order_number: params.order,
        customer_name: "Customer",
        customer_email: params.email,
        customer_phone: "",
        delivery_address: "",
        status: "processing",
        payment_status: "paid",
        currency: "NGN",
        subtotal: 0,
        total_amount: 0,
        items: [],
        notes: null,
        placed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
    const query = new URLSearchParams({
      order: params.order,
      email: params.email,
    });
    const res = await publicHttpFresh<{ order: StoreOrder }>(
      `${STOREHAUSE_API_PREFIX}/public/storefronts/${slug}/orders/lookup?${query.toString()}`,
    );
    return res.order;
  },

  async recordVisit(slug: string, body: { session_id?: string; path?: string; referrer?: string }) {
    if (USE_MOCKS) return mockApi.recordVisit(slug, body);
    return publicWrite<{ message: string }>(
      `${STOREHAUSE_API_PREFIX}/public/storefronts/${slug}/visits`,
      body,
    );
  },

  async submitContact(slug: string, body: StoreContactInquiryInput): Promise<{ message: string }> {
    if (USE_MOCKS) return mockApi.submitContact(slug, body);
    return publicWrite<{ message: string }>(
      `${STOREHAUSE_API_PREFIX}/public/storefronts/${slug}/contact`,
      body,
    );
  },

  async listProductReviews(slug: string, productId: string): Promise<StoreProductReviewsResponse> {
    if (USE_MOCKS) return mockApi.listProductReviews(slug, productId);
    return publicHttpFresh<StoreProductReviewsResponse>(
      `${STOREHAUSE_API_PREFIX}/public/storefronts/${slug}/products/${productId}/reviews`,
    );
  },

  async submitProductReview(
    slug: string,
    productId: string,
    body: StoreProductReviewInput,
  ): Promise<{ message: string; review: StoreProductReview }> {
    if (USE_MOCKS) return mockApi.submitProductReview(slug, productId, body);
    return publicWrite<{ message: string; review: StoreProductReview }>(
      `${STOREHAUSE_API_PREFIX}/public/storefronts/${slug}/products/${productId}/reviews`,
      body,
    );
  },

  async recordAbandonedCart(
    slug: string,
    body: {
      session_token: string;
      customer_name?: string;
      customer_email?: string;
      customer_phone?: string;
      delivery_address?: string;
      subtotal: number;
      currency: string;
      items: Array<{
        product_id: string;
        name: string;
        quantity: number;
        unit_price: number;
        total: number;
        currency: string;
      }>;
    },
  ): Promise<{ cart: { id: string; session_token: string; last_activity_at: string | null } }> {
    if (USE_MOCKS) {
      return {
        cart: {
          id: "mock-cart",
          session_token: body.session_token,
          last_activity_at: new Date().toISOString(),
        },
      };
    }
    return publicWrite(`${STOREHAUSE_API_PREFIX}/public/storefronts/${slug}/abandoned-carts`, body);
  },
};

export { StorefrontApiError };
