import { mockApi } from "./mocks";
import { STOREFRONT_TEMPLATE_OPTIONS } from "./types";
import type {
  AuthResponse,
  BuilderBusinessProfile,
  BuilderSessionResponse,
  BuilderSessionStatus,
  CreateStoreInput,
  MerchantDashboardOverview,
  RecommendStorefrontTemplatesInput,
  Store,
  StoreOrder,
  StoreOrdersResponse,
  StoreOrderStatus,
  StoreProduct,
  ProductImportReport,
  StorefrontContent,
  StorefrontDraftResponse,
  StorefrontPublishState,
  PublishStorefrontResponse,
  StorefrontTemplateId,
  StorefrontTemplateOption,
  UpdateStoreInput,
  UpdateStorefrontInput,
  User,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
const STOREHAUSE_API_PREFIX = "/storehause";
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true" || !API_BASE;
const TOKEN_KEY = "storehaus_auth_token";

export type PersistBuilderMessageInput = {
  business_profile?: BuilderBusinessProfile;
  status?: BuilderSessionStatus;
  assistant_message?: string;
  assistant_payload?: Record<string, unknown>;
  selected_template_id?: StorefrontTemplateId | null;
  storefront_snapshot?: StorefrontContent | null;
  brand_color?: string;
  color_label?: string;
  media_updates?: Partial<Record<"media.hero_image_url" | "media.about_image_url", string>>;
  apply_stock_images?: boolean;
};

export type PersistBuilderDraftInput = {
  storefront: StorefrontContent;
  selected_template_id?: StorefrontTemplateId | null;
};

export type PersistBuilderEditInput = {
  storefront: StorefrontContent;
  changed_paths?: string[];
  assistant_message?: string;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data?.message ?? "Request failed");
  return data as T;
}

async function httpForm<T>(path: string, body: FormData): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data?.message ?? "Request failed");
  return data as T;
}

function requireToken(): string {
  const token = getToken();
  if (!token) throw new ApiError(401, "Not authenticated");
  return token;
}

export const api = {
  async register(body: { name: string; email: string; password: string }): Promise<AuthResponse> {
    const res = USE_MOCKS
      ? await mockApi.register(body)
      : await http<AuthResponse>(`${STOREHAUSE_API_PREFIX}/auth/register`, {
          method: "POST",
          body: JSON.stringify(body),
        });
    setToken(res.token);
    return res;
  },

  async login(body: { email: string; password: string }): Promise<AuthResponse> {
    const res = USE_MOCKS
      ? await mockApi.login(body)
      : await http<AuthResponse>(`${STOREHAUSE_API_PREFIX}/auth/login`, {
          method: "POST",
          body: JSON.stringify(body),
        });
    setToken(res.token);
    return res;
  },

  async logout(): Promise<void> {
    const token = getToken();
    if (!token) return;
    try {
      if (USE_MOCKS) await mockApi.logout(token);
      else await http<void>(`${STOREHAUSE_API_PREFIX}/auth/logout`, { method: "POST" });
    } finally {
      setToken(null);
    }
  },

  async me(): Promise<User> {
    const token = requireToken();
    const res = USE_MOCKS
      ? await mockApi.me(token)
      : await http<{ user: User }>(`${STOREHAUSE_API_PREFIX}/auth/me`);
    return res.user;
  },

  async createStore(body: CreateStoreInput): Promise<Store> {
    const token = requireToken();
    const res = USE_MOCKS
      ? await mockApi.createStore(token, body)
      : await http<{ store: Store }>(`${STOREHAUSE_API_PREFIX}/stores`, {
          method: "POST",
          body: JSON.stringify(body),
        });
    return res.store;
  },

  async getMyStore(): Promise<Store | null> {
    const token = requireToken();
    const res = USE_MOCKS
      ? await mockApi.getMyStore(token)
      : await http<{ store: Store | null }>(`${STOREHAUSE_API_PREFIX}/stores/me`).catch((err) => {
          if (err instanceof ApiError && err.status === 404) return { store: null };
          throw err;
        });
    return res.store;
  },

  async getDashboardOverview(): Promise<MerchantDashboardOverview> {
    const token = requireToken();
    if (USE_MOCKS) return mockApi.getDashboardOverview(token);
    return http<MerchantDashboardOverview>(`${STOREHAUSE_API_PREFIX}/dashboard`);
  },

  async getStorefrontTemplates(): Promise<StorefrontTemplateOption[]> {
    if (USE_MOCKS) return mockApi.getStorefrontTemplates();

    const res = await http<{ templates: StorefrontTemplateOption[] }>(
      `${STOREHAUSE_API_PREFIX}/storefront-templates`,
    ).catch((err) => {
      console.warn("Falling back to static storefront templates", err);
      return { templates: STOREFRONT_TEMPLATE_OPTIONS };
    });

    return res.templates.length ? res.templates : STOREFRONT_TEMPLATE_OPTIONS;
  },

  async recommendStorefrontTemplates(
    body: RecommendStorefrontTemplatesInput,
  ): Promise<{ template_id: StorefrontTemplateId; score: number; reason: string }[]> {
    if (USE_MOCKS) {
      const res = await mockApi.recommendStorefrontTemplates(body);
      return res.recommendations;
    }

    const res = await http<{
      recommendations: { template_id: StorefrontTemplateId; score: number; reason: string }[];
    }>(`${STOREHAUSE_API_PREFIX}/storefront-builder/recommend-templates`, {
      method: "POST",
      body: JSON.stringify(body),
    }).catch((err) => {
      console.warn("Falling back to local template recommendations", err);
      return { recommendations: [] };
    });

    return res.recommendations;
  },

  async getOrders(
    filters: {
      status?: string;
      search?: string;
      page?: number;
      per_page?: number;
    } = {},
  ): Promise<StoreOrdersResponse> {
    const token = requireToken();
    if (USE_MOCKS) return mockApi.getOrders(token, filters);

    const params = new URLSearchParams();
    if (filters.status && filters.status !== "all") params.set("status", filters.status);
    if (filters.search) params.set("search", filters.search);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.per_page) params.set("per_page", String(filters.per_page));

    return http<StoreOrdersResponse>(
      `${STOREHAUSE_API_PREFIX}/orders${params.toString() ? `?${params.toString()}` : ""}`,
    );
  },

  async getOrder(orderId: string): Promise<StoreOrder> {
    const token = requireToken();
    if (USE_MOCKS) return mockApi.getOrder(token, orderId);
    const res = await http<{ order: StoreOrder }>(`${STOREHAUSE_API_PREFIX}/orders/${orderId}`);
    return res.order;
  },

  async updateOrderStatus(
    orderId: string,
    body: { status: StoreOrderStatus; notes?: string },
  ): Promise<{ order: StoreOrder; message: string }> {
    const token = requireToken();
    if (USE_MOCKS) return mockApi.updateOrderStatus(token, orderId, body);
    return http<{ order: StoreOrder; message: string }>(
      `${STOREHAUSE_API_PREFIX}/orders/${orderId}/status`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
  },

  async generateStorefront(
    storeId: string,
    storefrontTemplateId?: StorefrontTemplateId,
    storefront?: StorefrontContent,
  ): Promise<StorefrontDraftResponse> {
    const token = requireToken();
    const body = {
      store_id: storeId,
      ...(storefrontTemplateId ? { storefront_template_id: storefrontTemplateId } : {}),
    };
    const res = USE_MOCKS
      ? await mockApi.generateStorefront(token, body)
      : await http<{ generation_id: string; storefront: StorefrontContent; publish: StorefrontPublishState }>(
          `${STOREHAUSE_API_PREFIX}/ai/storefront/generate`,
          { method: "POST", body: JSON.stringify({ ...body, ...(storefront ? { storefront } : {}) }) },
        );
    return { storefront: res.storefront, publish: res.publish };
  },

  async getStorefront(storeId: string): Promise<StorefrontDraftResponse> {
    const token = requireToken();
    return USE_MOCKS
      ? mockApi.getStorefront(token, storeId)
      : http<StorefrontDraftResponse>(`${STOREHAUSE_API_PREFIX}/ai/storefront/${storeId}`);
  },

  async updateStorefront(storeId: string, body: UpdateStorefrontInput): Promise<StorefrontDraftResponse> {
    const token = requireToken();
    return USE_MOCKS
      ? mockApi.updateStorefront(token, storeId, body)
      : http<StorefrontDraftResponse>(`${STOREHAUSE_API_PREFIX}/ai/storefront/${storeId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
  },

  async publishStorefront(storeId: string): Promise<PublishStorefrontResponse> {
    const token = requireToken();
    return USE_MOCKS
      ? mockApi.publishStorefront(token, storeId)
      : http<PublishStorefrontResponse>(`${STOREHAUSE_API_PREFIX}/stores/${storeId}/publish`, {
          method: "POST",
        });
  },

  async updateMyStore(body: UpdateStoreInput): Promise<Store> {
    const token = requireToken();
    if (USE_MOCKS) {
      const res = await mockApi.updateMyStore(token, body);
      return res.store;
    }
    const res = await http<{ store: Store }>(`${STOREHAUSE_API_PREFIX}/stores/me`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return res.store;
  },

  async uploadStorefrontImage(storeId: string, file: File): Promise<{ url: string }> {
    const token = requireToken();
    if (USE_MOCKS) return mockApi.uploadStorefrontImage(token, storeId, file);

    const body = new FormData();
    body.append("image", file);
    return httpForm<{ url: string }>(`${STOREHAUSE_API_PREFIX}/stores/${storeId}/images`, body);
  },

  async getCurrentBuilderSession(): Promise<BuilderSessionResponse> {
    const token = requireToken();
    if (USE_MOCKS) return mockApi.getCurrentBuilderSession(token);
    return http<BuilderSessionResponse>(`${STOREHAUSE_API_PREFIX}/storefront-builder/sessions/current`);
  },

  async startBuilderSession(prompt?: string): Promise<BuilderSessionResponse> {
    const token = requireToken();
    if (USE_MOCKS) return mockApi.startBuilderSession(token, prompt);
    return http<BuilderSessionResponse>(`${STOREHAUSE_API_PREFIX}/storefront-builder/sessions`, {
      method: "POST",
      body: JSON.stringify(prompt ? { prompt } : {}),
    });
  },

  async sendBuilderMessage(
    sessionId: string,
    message: string,
    state?: PersistBuilderMessageInput,
  ): Promise<BuilderSessionResponse> {
    const token = requireToken();
    if (USE_MOCKS) return mockApi.sendBuilderMessage(token, sessionId, message, state);
    return http<BuilderSessionResponse>(
      `${STOREHAUSE_API_PREFIX}/storefront-builder/sessions/${sessionId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          message,
          ...(state?.brand_color ? { brand_color: state.brand_color } : {}),
          ...(state?.media_updates ? { media_updates: state.media_updates } : {}),
          ...(state ?? {}),
        }),
      },
    );
  },

  async clearBuilderChat(sessionId: string): Promise<BuilderSessionResponse> {
    const token = requireToken();
    if (USE_MOCKS) return mockApi.clearBuilderChat(token, sessionId);
    return http<BuilderSessionResponse>(
      `${STOREHAUSE_API_PREFIX}/storefront-builder/sessions/${sessionId}/clear`,
      { method: "POST" },
    );
  },

  async selectBuilderTemplate(
    sessionId: string,
    templateId: StorefrontTemplateId,
    source: "merchant_selected" | "ai_selected" = "merchant_selected",
  ): Promise<BuilderSessionResponse> {
    const token = requireToken();
    if (USE_MOCKS) return mockApi.selectBuilderTemplate(token, sessionId, templateId, source);
    return http<BuilderSessionResponse>(
      `${STOREHAUSE_API_PREFIX}/storefront-builder/sessions/${sessionId}/select-template`,
      { method: "POST", body: JSON.stringify({ template_id: templateId, source }) },
    );
  },

  async generateBuilderDraft(
    sessionId: string,
    draft?: PersistBuilderDraftInput,
  ): Promise<BuilderSessionResponse> {
    const token = requireToken();
    if (USE_MOCKS) return mockApi.generateBuilderDraft(token, sessionId, draft);
    return http<BuilderSessionResponse>(
      `${STOREHAUSE_API_PREFIX}/storefront-builder/sessions/${sessionId}/generate`,
      { method: "POST", body: JSON.stringify(draft ?? {}) },
    );
  },

  async applyBuilderChatEdit(
    sessionId: string,
    instruction: string,
    edit?: PersistBuilderEditInput,
  ): Promise<BuilderSessionResponse> {
    const token = requireToken();
    if (USE_MOCKS) return mockApi.applyBuilderChatEdit(token, sessionId, instruction);
    return http<BuilderSessionResponse>(
      `${STOREHAUSE_API_PREFIX}/storefront-builder/sessions/${sessionId}/edit`,
      { method: "POST", body: JSON.stringify({ instruction, ...(edit ?? {}) }) },
    );
  },

  async getProducts(): Promise<StoreProduct[]> {
    requireToken();
    if (USE_MOCKS) return mockApi.getProducts(requireToken());
    const res = await http<{ data: StoreProduct[] }>(`${STOREHAUSE_API_PREFIX}/products`);
    return res.data;
  },

  async createProduct(body: Omit<StoreProduct, "id"> & { id?: string }): Promise<StoreProduct> {
    requireToken();
    if (USE_MOCKS) return mockApi.createProduct(requireToken(), body);
    const res = await http<{ product: StoreProduct }>(`${STOREHAUSE_API_PREFIX}/products`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.product;
  },

  async updateProduct(productId: string, body: Partial<StoreProduct>): Promise<StoreProduct> {
    requireToken();
    if (USE_MOCKS) return mockApi.updateProduct(requireToken(), productId, body);
    const res = await http<{ product: StoreProduct }>(`${STOREHAUSE_API_PREFIX}/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return res.product;
  },

  async duplicateProduct(productId: string): Promise<StoreProduct> {
    requireToken();
    if (USE_MOCKS) return mockApi.duplicateProduct(requireToken(), productId);
    const res = await http<{ product: StoreProduct }>(
      `${STOREHAUSE_API_PREFIX}/products/${productId}/duplicate`,
      { method: "POST" },
    );
    return res.product;
  },

  async deleteProduct(productId: string): Promise<void> {
    requireToken();
    if (USE_MOCKS) return mockApi.deleteProduct(requireToken(), productId);
    await http(`${STOREHAUSE_API_PREFIX}/products/${productId}`, { method: "DELETE" });
  },

  async importProducts(products: StoreProduct[]): Promise<ProductImportReport> {
    requireToken();
    if (USE_MOCKS) return mockApi.importProducts(requireToken(), products);
    return http<ProductImportReport>(`${STOREHAUSE_API_PREFIX}/products/import`, {
      method: "POST",
      body: JSON.stringify({ products }),
    });
  },
};

export { ApiError };
export const isUsingMocks = USE_MOCKS;
