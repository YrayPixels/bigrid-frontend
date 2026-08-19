import { mockApi } from "./mocks";
import { truncateBuilderUserMessage } from "@/lib/storefront-builder/builder-message-limits";
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
  StoreCategory,
  CreateCategoryInput,
  UpdateCategoryInput,
  StoreOrder,
  StoreOrdersResponse,
  StoreOrderStatus,
  StoreCustomer,
  StoreCustomersResponse,
  StoreProduct,
  TryOnSession,
  ProductImportReport,
  StorefrontContent,
  StorefrontDraftResponse,
  StorefrontPublishState,
  PublishStorefrontResponse,
  StorefrontTemplateId,
  StorefrontTemplateOption,
  UpdateStoreInput,
  UpdateStorefrontInput,
  StorePaymentSettings,
  StoreDomainsResponse,
  StoreDomain,
  UpdateStorePaymentSettingsInput,
  PosCatalogResponse,
  PosCatalogSyncResponse,
  PosLookupResponse,
  CreatePosOrderInput,
  StoreLocation,
  MerchantStaffMember,
  CreateStaffInput,
  UpdateStaffInput,
  BillingCheckoutResponse,
  BillingPortalResponse,
  BillingSubscriptionResponse,
  BillingAddOnPack,
  SubscriptionPlanId,
  MarketingChatResponse,
  MarketingStatus,
  AbandonedRecoveryResponse,
  AbandonedRecoveryDraft,
  AbandonedRecoverySendResponse,
  AbandonedRecoverySourceType,
  ConnectWhatsAppInput,
  ConnectTikTokInput,
  CustomerConversationSummary,
  CustomerConversationDetail,
  PublishTikTokVideoInput,
  UpdateMessagingSettingsInput,
  SocialPost,
  SocialPostStatus,
  CreateSocialPostInput,
  UpdateSocialPostInput,
  AdAccount,
  AdCampaign,
  MarketingAudience,
  MarketingPerformance,
  BestTimeToPost,
  SaveAdCampaignInput,
  User,
  VendorChatSessionSummary,
  LiveChatSessionDetail,
  DealieChatMode,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
const STOREHAUSE_API_PREFIX = "/storehause";
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
const TOKEN_KEY = "storehaus_auth_token";
const AUTH_LOGOUT_EVENT = "storehaus-auth-logout";

export type PersistBuilderMessageInput = {
  business_profile?: BuilderBusinessProfile;
  status?: BuilderSessionStatus;
  assistant_message?: string;
  assistant_payload?: Record<string, unknown>;
  selected_template_id?: StorefrontTemplateId | null;
  storefront_snapshot?: StorefrontContent | null;
  brand_color?: string;
  color_label?: string;
  logo_url?: string | null;
  media_updates?: Partial<
    Record<"media.hero_image_url" | "media.hero_video_url" | "media.about_image_url", string>
  >;
  apply_stock_images?: boolean;
};

export type PersistBuilderDraftInput = {
  storefront?: StorefrontContent;
  selected_template_id?: StorefrontTemplateId | null;
  skip_assistant_message?: boolean;
  business_profile?: BuilderBusinessProfile;
};

export type PersistBuilderEditInput = {
  storefront: StorefrontContent;
  changed_paths?: string[];
  assistant_message?: string;
};

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(TOKEN_KEY);
  // Keep middleware companion cookie in sync for existing sessions.
  if (token && !document.cookie.includes("storehaus_auth_present=1")) {
    document.cookie = "storehaus_auth_present=1; path=/; max-age=31536000; SameSite=Lax";
  }
  return token;
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;

  const previous = window.localStorage.getItem(TOKEN_KEY);
  if (token) {
    window.localStorage.setItem(TOKEN_KEY, token);
    document.cookie = "storehaus_auth_present=1; path=/; max-age=31536000; SameSite=Lax";
  } else {
    window.localStorage.removeItem(TOKEN_KEY);
    document.cookie = "storehaus_auth_present=; path=/; max-age=0";
  }

  // Only invalidate AI config when the auth identity actually changes.
  if (previous !== token) {
    void import("@/lib/platform-ai-config").then((m) => m.clearPlatformAiConfigCache());
  }
}

function emitLogoutEvent() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));
}

export function onAuthLogout(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(AUTH_LOGOUT_EVENT, listener);
  return () => window.removeEventListener(AUTH_LOGOUT_EVENT, listener);
}

class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function apiErrorMessage(data: unknown, fallback = "Request failed"): string {
  if (!data || typeof data !== "object") return fallback;
  const payload = data as { message?: unknown; errors?: Record<string, unknown> };
  if (payload.errors && typeof payload.errors === "object") {
    for (const value of Object.values(payload.errors)) {
      if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) {
        return value[0];
      }
      if (typeof value === "string" && value.trim()) {
        return value;
      }
    }
  }
  return typeof payload.message === "string" && payload.message.trim()
    ? payload.message
    : fallback;
}

function apiErrorCode(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const code = (data as { code?: unknown }).code;
  return typeof code === "string" && code.trim() ? code : undefined;
}

async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch (err) {
    console.error(`[API Network Error] ${path}:`, err);
    throw new ApiError(0, "Network connection error. Please ensure the backend server is running.");
  }
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    logoutIfUnauthorized(res.status, token);
    throw new ApiError(res.status, apiErrorMessage(data), apiErrorCode(data));
  }
  return data as T;
}

async function httpForm<T>(path: string, body: FormData): Promise<T> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
    });
  } catch (err) {
    console.error(`[API Network Error] ${path}:`, err);
    throw new ApiError(0, "Network connection error. Please ensure the backend server is running.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    logoutIfUnauthorized(res.status, token);
    throw new ApiError(res.status, apiErrorMessage(data), apiErrorCode(data));
  }
  return data as T;
}

function logoutIfUnauthorized(status: number, requestToken: string | null) {
  if (status !== 401) return;
  // A 401 from an older in-flight request must not wipe a token issued after it started.
  if (getToken() !== requestToken) return;
  setToken(null);
  emitLogoutEvent();
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

  async login(body: { email: string; password: string; remember?: boolean }): Promise<AuthResponse> {
    const res = USE_MOCKS
      ? await mockApi.login(body)
      : await http<AuthResponse>(`${STOREHAUSE_API_PREFIX}/auth/login`, {
          method: "POST",
          body: JSON.stringify(body),
        });
    setToken(res.token);
    return res;
  },

  async demoLogin(): Promise<AuthResponse> {
    if (USE_MOCKS) {
      return mockApi.login({
        email: "demo@bizgrid.shop",
        password: "demo",
        remember: true,
      });
    }
    const res = await http<AuthResponse>(`${STOREHAUSE_API_PREFIX}/auth/demo-login`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    setToken(res.token);
    return res;
  },

  async requestPasswordReset(body: { email: string }): Promise<{ message: string }> {
    if (USE_MOCKS) return mockApi.requestPasswordReset(body);
    return http<{ message: string }>(`${STOREHAUSE_API_PREFIX}/auth/request-password-reset`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async resetPasswordWithCode(body: {
    email: string;
    code: string;
    password: string;
  }): Promise<{ message: string }> {
    if (USE_MOCKS) return mockApi.resetPasswordWithCode(body);
    return http<{ message: string }>(`${STOREHAUSE_API_PREFIX}/auth/reset-password-with-code`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async logout(): Promise<void> {
    const token = getToken();
    setToken(null);
    if (!token) return;
    try {
      if (USE_MOCKS) {
        await mockApi.logout(token);
        return;
      }
      await fetch(`${API_BASE}${STOREHAUSE_API_PREFIX}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Best-effort revoke; local session is already cleared.
    }
  },

  async verifyEmail(body: { code: string }): Promise<{ message: string; user: User }> {
    const token = requireToken();
    if (USE_MOCKS) return mockApi.verifyEmail(token, body);
    return http<{ message: string; user: User }>(`${STOREHAUSE_API_PREFIX}/auth/verify-email`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async resendEmailVerification(): Promise<{
    message: string;
    user?: User;
    email_verification_sent?: boolean;
  }> {
    const token = requireToken();
    if (USE_MOCKS) return mockApi.resendEmailVerification(token);
    return http<{ message: string; user?: User; email_verification_sent?: boolean }>(
      `${STOREHAUSE_API_PREFIX}/auth/resend-email-verification`,
      {
        method: "POST",
      },
    );
  },

  async exchangeAuthCode(code: string): Promise<{ token: string; user: User }> {
    if (USE_MOCKS) {
      throw new Error("Exchange code not supported in mock mode");
    }
    return http<{ token: string; user: User }>(`${STOREHAUSE_API_PREFIX}/auth/exchange-code`, {
      method: "POST",
      body: JSON.stringify({ code }),
    });
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

  async getDashboardOverview(locationId: string = "all"): Promise<MerchantDashboardOverview> {
    const token = requireToken();
    if (USE_MOCKS) return mockApi.getDashboardOverview(token);
    const params = new URLSearchParams();
    if (locationId && locationId !== "all") {
      params.set("location_id", locationId);
    }
    const query = params.toString();
    return http<MerchantDashboardOverview>(
      `${STOREHAUSE_API_PREFIX}/dashboard${query ? `?${query}` : ""}`,
    );
  },

  async getStorefrontTemplates(): Promise<StorefrontTemplateOption[]> {
    if (USE_MOCKS) return mockApi.getStorefrontTemplates();

    try {
      const res = await http<{ templates: StorefrontTemplateOption[] }>(
        `${STOREHAUSE_API_PREFIX}/storefront-templates`,
      );
      // Trust the API catalog (active-only). An empty list means none are active —
      // do not refill from the static catalog, which would undo admin deactivation.
      return res.templates;
    } catch (err) {
      console.warn("Falling back to static storefront templates", err);
      return STOREFRONT_TEMPLATE_OPTIONS;
    }
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
      payment_status?: string;
      source?: string;
      location_id?: string;
      search?: string;
      page?: number;
      per_page?: number;
    } = {},
  ): Promise<StoreOrdersResponse> {
    const token = requireToken();
    if (USE_MOCKS) return mockApi.getOrders(token, filters);

    const params = new URLSearchParams();
    if (filters.status && filters.status !== "all") params.set("status", filters.status);
    if (filters.payment_status && filters.payment_status !== "all") {
      params.set("payment_status", filters.payment_status);
    }
    if (filters.source && filters.source !== "all") params.set("source", filters.source);
    if (filters.location_id && filters.location_id !== "all") {
      params.set("location_id", filters.location_id);
    }
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
    body: {
      status: StoreOrderStatus | "fulfilled" | "refunded";
      notes?: string;
      tracking_number?: string | null;
      refund?: boolean;
    },
  ): Promise<{ order: StoreOrder; message: string }> {
    const token = requireToken();
    if (USE_MOCKS) return mockApi.updateOrderStatus(token, orderId, body);
    return http<{ order: StoreOrder; message: string }>(
      `${STOREHAUSE_API_PREFIX}/orders/${orderId}/status`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
  },

  async openOrderInvoice(orderId: string): Promise<void> {
    const token = requireToken();
    const base = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
    const res = await fetch(`${base}${STOREHAUSE_API_PREFIX}/orders/${orderId}/invoice`, {
      headers: {
        Accept: "text/html",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message ?? "Could not load invoice.");
    }
    const html = await res.text();
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
  },

  async getCustomers(filters: {
    search?: string;
    page?: number;
    per_page?: number;
  } = {}): Promise<StoreCustomersResponse> {
    requireToken();
    if (USE_MOCKS) {
      return { data: [], meta: { current_page: 1, last_page: 1, per_page: 15, total: 0 } };
    }
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.per_page) params.set("per_page", String(filters.per_page));
    return http<StoreCustomersResponse>(
      `${STOREHAUSE_API_PREFIX}/customers${params.toString() ? `?${params}` : ""}`,
    );
  },

  async getCustomer(customerId: string): Promise<StoreCustomer> {
    requireToken();
    if (USE_MOCKS) throw { status: 404, message: "Not found" };
    const res = await http<{ customer: StoreCustomer }>(
      `${STOREHAUSE_API_PREFIX}/customers/${customerId}`,
    );
    return res.customer;
  },

  async updateCustomer(
    customerId: string,
    body: { notes?: string | null },
  ): Promise<{ customer: StoreCustomer; message: string }> {
    requireToken();
    if (USE_MOCKS) throw { status: 404, message: "Not found" };
    return http<{ customer: StoreCustomer; message: string }>(
      `${STOREHAUSE_API_PREFIX}/customers/${customerId}`,
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

  async syncDealieCatalog(): Promise<{ message: string; synced?: number }> {
    const token = requireToken();
    if (USE_MOCKS) {
      return { message: "Catalog synced to Dealie AI successfully.", synced: 1 };
    }
    return http<{ message: string; synced?: number }>(
      `${STOREHAUSE_API_PREFIX}/storehause/dealie/sync`,
      { method: "POST" },
    );
  },

  async getStoreDomains(): Promise<StoreDomainsResponse> {
    const token = requireToken();
    if (USE_MOCKS) {
      return mockApi.getStoreDomains(token);
    }
    return http<StoreDomainsResponse>(`${STOREHAUSE_API_PREFIX}/stores/me/domains`);
  },

  async addStoreDomain(hostname: string): Promise<StoreDomain> {
    const token = requireToken();
    if (USE_MOCKS) {
      const res = await mockApi.addStoreDomain(token, hostname);
      return res.domain;
    }
    const res = await http<{ domain: StoreDomain }>(`${STOREHAUSE_API_PREFIX}/stores/me/domains`, {
      method: "POST",
      body: JSON.stringify({ hostname }),
    });
    return res.domain;
  },

  async verifyStoreDomain(domainId: string): Promise<StoreDomain> {
    const token = requireToken();
    if (USE_MOCKS) {
      const res = await mockApi.verifyStoreDomain(token, domainId);
      return res.domain;
    }
    const res = await http<{ domain: StoreDomain }>(
      `${STOREHAUSE_API_PREFIX}/stores/me/domains/${domainId}/verify`,
      { method: "POST" },
    );
    return res.domain;
  },

  async setPrimaryStoreDomain(domainId: string): Promise<StoreDomain> {
    const token = requireToken();
    if (USE_MOCKS) {
      const res = await mockApi.setPrimaryStoreDomain(token, domainId);
      return res.domain;
    }
    const res = await http<{ domain: StoreDomain }>(
      `${STOREHAUSE_API_PREFIX}/stores/me/domains/${domainId}/primary`,
      { method: "PATCH" },
    );
    return res.domain;
  },

  async deleteStoreDomain(domainId: string): Promise<void> {
    const token = requireToken();
    if (USE_MOCKS) {
      await mockApi.deleteStoreDomain(token, domainId);
      return;
    }
    await http<{ message: string }>(`${STOREHAUSE_API_PREFIX}/stores/me/domains/${domainId}`, {
      method: "DELETE",
    });
  },

  async getPaymentSettings(): Promise<StorePaymentSettings> {
    const token = requireToken();
    if (USE_MOCKS) {
      return {
        checkout_enabled: true,
        payouts_configured: false,
        payout_account_name: null,
        payout_bank_name: null,
        payout_account_number: null,
      };
    }
    const res = await http<{ payments: StorePaymentSettings }>(
      `${STOREHAUSE_API_PREFIX}/stores/me/payments`,
    );
    return res.payments;
  },

  async updatePaymentSettings(body: UpdateStorePaymentSettingsInput): Promise<StorePaymentSettings> {
    const token = requireToken();
    if (USE_MOCKS) {
      const me = await mockApi.me(token);
      if (!me.user.email_verified_at) {
        throw {
          status: 403,
          message: "Verify your email before adding payout details.",
          code: "email_unverified",
        };
      }
      return {
        checkout_enabled: true,
        payouts_configured: Boolean(
          body.payout_account_name && body.payout_bank_name && body.payout_account_number,
        ),
        payout_account_name: body.payout_account_name ?? null,
        payout_bank_name: body.payout_bank_name ?? null,
        payout_account_number: body.payout_account_number ?? null,
      };
    }
    const res = await http<{ payments: StorePaymentSettings }>(
      `${STOREHAUSE_API_PREFIX}/stores/me/payments`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );
    return res.payments;
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
    const persistedMessage = truncateBuilderUserMessage(message);
    if (USE_MOCKS) return mockApi.sendBuilderMessage(token, sessionId, persistedMessage, state);
    return http<BuilderSessionResponse>(
      `${STOREHAUSE_API_PREFIX}/storefront-builder/sessions/${sessionId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          message: persistedMessage,
          ...(state?.brand_color ? { brand_color: state.brand_color } : {}),
          ...(state?.media_updates ? { media_updates: state.media_updates } : {}),
          ...(state ?? {}),
        }),
      },
    );
  },

  async saveBuilderSnapshot(
    sessionId: string,
    storefrontSnapshot: StorefrontContent,
    status?: BuilderSessionStatus,
  ): Promise<BuilderSessionResponse> {
    const token = requireToken();
    if (USE_MOCKS) return mockApi.saveBuilderSnapshot(token, sessionId, storefrontSnapshot, status);
    return http<BuilderSessionResponse>(
      `${STOREHAUSE_API_PREFIX}/storefront-builder/sessions/${sessionId}/snapshot`,
      {
        method: "PUT",
        body: JSON.stringify({
          storefront_snapshot: storefrontSnapshot,
          ...(status ? { status } : {}),
        }),
      },
    );
  },

  async saveBuilderProject(
    sessionId: string,
    payload: {
      custom_files: Array<{ path: string; content: string; encoding?: "base64" }>;
      edit_metadata?: { locked_paths?: string[] };
    },
  ): Promise<BuilderSessionResponse> {
    const token = requireToken();
    if (USE_MOCKS) return mockApi.saveBuilderProject(token, sessionId, payload);
    return http<BuilderSessionResponse>(
      `${STOREHAUSE_API_PREFIX}/storefront-builder/sessions/${sessionId}/project`,
      {
        method: "PUT",
        body: JSON.stringify(payload),
      },
    );
  },

  async getBuilderProject(sessionId: string): Promise<{
    custom_files: Array<{ path: string; content: string; encoding?: "base64" }>;
    edit_metadata: { locked_paths: string[] };
    custom_project: {
      storage_key: string;
      revision: number;
      file_count: number;
      updated_at: string;
    } | null;
  }> {
    const token = requireToken();
    if (USE_MOCKS) return mockApi.getBuilderProject(token, sessionId);
    return http(`${STOREHAUSE_API_PREFIX}/storefront-builder/sessions/${sessionId}/project`);
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

  async getCategories(): Promise<StoreCategory[]> {
    requireToken();
    if (USE_MOCKS) return mockApi.getCategories(requireToken());
    const res = await http<{ data: StoreCategory[] }>(`${STOREHAUSE_API_PREFIX}/categories`);
    return res.data;
  },

  async createCategory(body: CreateCategoryInput): Promise<StoreCategory> {
    requireToken();
    if (USE_MOCKS) return mockApi.createCategory(requireToken(), body);
    const res = await http<{ category: StoreCategory }>(`${STOREHAUSE_API_PREFIX}/categories`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.category;
  },

  async updateCategory(categoryId: string, body: UpdateCategoryInput): Promise<StoreCategory> {
    requireToken();
    if (USE_MOCKS) return mockApi.updateCategory(requireToken(), categoryId, body);
    const res = await http<{ category: StoreCategory }>(
      `${STOREHAUSE_API_PREFIX}/categories/${categoryId}`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
    return res.category;
  },

  async deleteCategory(categoryId: string): Promise<void> {
    requireToken();
    if (USE_MOCKS) return mockApi.deleteCategory(requireToken(), categoryId);
    await http(`${STOREHAUSE_API_PREFIX}/categories/${categoryId}`, { method: "DELETE" });
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

  async listTryOnModels(): Promise<{ id: string; name: string; gender: string; image_url: string }[]> {
    requireToken();
    if (USE_MOCKS) {
      return [
        {
          id: "model_amara",
          name: "Amara",
          gender: "female",
          image_url: "https://plugins-media.makeupar.com/smb/blog/post/2024-05-07/b103976d-1b0e-4bed-aab4-9307308b84d7.jpg",
        },
      ];
    }
    const res = await http<{ models: { id: string; name: string; gender: string; image_url: string }[] }>(
      `${STOREHAUSE_API_PREFIX}/try-on/models`,
    );
    return res.models ?? [];
  },

  async createModelLook(body: {
    garment_image_url: string;
    model_id?: string;
    model_image_url?: string;
    garment_category?: string;
    product_id?: string;
  }): Promise<{ session: TryOnSession }> {
    requireToken();
    if (USE_MOCKS) {
      return {
        session: {
          id: "mock-model-look",
          product_id: body.product_id ?? null,
          mode: "clothes",
          status: "success",
          result_url: body.garment_image_url,
          error_code: null,
          error_message: null,
        },
      };
    }
    return http<{ session: TryOnSession }>(`${STOREHAUSE_API_PREFIX}/try-on/model-looks`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async getModelLook(sessionId: string): Promise<{ session: TryOnSession }> {
    requireToken();
    if (USE_MOCKS) {
      return {
        session: {
          id: sessionId,
          product_id: null,
          mode: "clothes",
          status: "success",
          result_url: null,
          error_code: null,
          error_message: null,
        },
      };
    }
    return http<{ session: TryOnSession }>(`${STOREHAUSE_API_PREFIX}/try-on/model-looks/${sessionId}`);
  },

  async listFabricTemplates(): Promise<{ id: string; name: string; thumbnail_url: string | null }[]> {
    requireToken();
    if (USE_MOCKS) {
      return [
        { id: "stub_silk_001", name: "Silk", thumbnail_url: null },
        { id: "stub_linen_001", name: "Linen", thumbnail_url: null },
        { id: "stub_cotton_001", name: "Cotton", thumbnail_url: null },
      ];
    }
    const res = await http<{ templates: { id: string; name: string; thumbnail_url: string | null }[] }>(
      `${STOREHAUSE_API_PREFIX}/try-on/fabric-templates`,
    );
    return res.templates ?? [];
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

  async listDiscounts(): Promise<
    import("./types").StoreDiscount[]
  > {
    requireToken();
    if (USE_MOCKS) return [];
    const res = await http<{ data: import("./types").StoreDiscount[] }>(
      `${STOREHAUSE_API_PREFIX}/discounts`,
    );
    return res.data;
  },

  async createDiscount(
    body: import("./types").CreateStoreDiscountInput,
  ): Promise<import("./types").StoreDiscount> {
    requireToken();
    if (USE_MOCKS) {
      return {
        id: crypto.randomUUID(),
        name: body.name,
        type: body.type,
        discount_type: body.discount_type,
        discount_value: body.discount_value,
        min_subtotal: body.min_subtotal ?? null,
        product_ids: body.product_ids ?? [],
        starts_at: body.starts_at ?? null,
        ends_at: body.ends_at ?? null,
        status: body.status ?? "active",
        priority: body.priority ?? 0,
      };
    }
    const res = await http<{ discount: import("./types").StoreDiscount }>(
      `${STOREHAUSE_API_PREFIX}/discounts`,
      { method: "POST", body: JSON.stringify(body) },
    );
    return res.discount;
  },

  async updateDiscount(
    discountId: string,
    body: import("./types").UpdateStoreDiscountInput,
  ): Promise<import("./types").StoreDiscount> {
    requireToken();
    if (USE_MOCKS) {
      return {
        id: discountId,
        name: body.name ?? "Discount",
        type: body.type ?? "seasonal",
        discount_type: body.discount_type ?? "percent",
        discount_value: body.discount_value ?? 0,
        min_subtotal: body.min_subtotal ?? null,
        product_ids: body.product_ids ?? [],
        starts_at: body.starts_at ?? null,
        ends_at: body.ends_at ?? null,
        status: body.status ?? "active",
        priority: body.priority ?? 0,
      };
    }
    const res = await http<{ discount: import("./types").StoreDiscount }>(
      `${STOREHAUSE_API_PREFIX}/discounts/${discountId}`,
      { method: "PATCH", body: JSON.stringify(body) },
    );
    return res.discount;
  },

  async deleteDiscount(discountId: string): Promise<void> {
    requireToken();
    if (USE_MOCKS) return;
    await http(`${STOREHAUSE_API_PREFIX}/discounts/${discountId}`, { method: "DELETE" });
  },

  async importProducts(products: StoreProduct[]): Promise<ProductImportReport> {
    requireToken();
    if (USE_MOCKS) return mockApi.importProducts(requireToken(), products);
    return http<ProductImportReport>(`${STOREHAUSE_API_PREFIX}/products/import`, {
      method: "POST",
      body: JSON.stringify({ products }),
    });
  },

  async getBillingSubscription(): Promise<BillingSubscriptionResponse> {
    requireToken();
    if (USE_MOCKS) return mockApi.getBillingSubscription(requireToken());
    return http<BillingSubscriptionResponse>(`${STOREHAUSE_API_PREFIX}/billing/subscription`);
  },

  async startBillingCheckout(plan: SubscriptionPlanId): Promise<BillingCheckoutResponse> {
    requireToken();
    if (USE_MOCKS) return mockApi.startBillingCheckout(requireToken(), plan);
    return http<BillingCheckoutResponse>(`${STOREHAUSE_API_PREFIX}/billing/checkout`, {
      method: "POST",
      body: JSON.stringify({ plan }),
    });
  },

  async openBillingPortal(): Promise<BillingPortalResponse> {
    requireToken();
    if (USE_MOCKS) return mockApi.openBillingPortal(requireToken());
    return http<BillingPortalResponse>(`${STOREHAUSE_API_PREFIX}/billing/portal`, {
      method: "POST",
    });
  },

  async startBillingTopup(pack: Pick<BillingAddOnPack, "type" | "id">): Promise<BillingCheckoutResponse> {
    requireToken();
    if (USE_MOCKS) return mockApi.startBillingTopup(requireToken(), pack);
    return http<BillingCheckoutResponse>(`${STOREHAUSE_API_PREFIX}/billing/topup`, {
      method: "POST",
      body: JSON.stringify({ type: pack.type, pack_id: pack.id }),
    });
  },

  async getMarketingStatus(): Promise<MarketingStatus> {
    requireToken();
    return http<MarketingStatus>(`${STOREHAUSE_API_PREFIX}/marketing/status`);
  },

  async connectFacebookMarketing(): Promise<{ authorization_url: string; state: string }> {
    requireToken();
    return http<{ authorization_url: string; state: string }>(
      `${STOREHAUSE_API_PREFIX}/marketing/facebook/connect`,
    );
  },

  async disconnectFacebookMarketing(connectionId?: string): Promise<MarketingStatus & { message: string }> {
    requireToken();
    const query = connectionId ? `?connection_id=${encodeURIComponent(connectionId)}` : "";
    return http<MarketingStatus & { message: string }>(
      `${STOREHAUSE_API_PREFIX}/marketing/facebook/disconnect${query}`,
      { method: "DELETE" },
    );
  },

  async sendMarketingChat(
    message: string,
    recentMessages?: Array<{ role: "user" | "assistant"; content: string }>,
  ): Promise<MarketingChatResponse> {
    requireToken();
    return http<MarketingChatResponse>(`${STOREHAUSE_API_PREFIX}/marketing/chat`, {
      method: "POST",
      body: JSON.stringify({
        message,
        ...(recentMessages?.length ? { recent_messages: recentMessages } : {}),
      }),
    });
  },

  async listMarketingPosts(params?: {
    status?: SocialPostStatus;
    limit?: number;
  }): Promise<{ posts: SocialPost[] }> {
    requireToken();
    const query = new URLSearchParams();
    if (params?.status) query.set("status", params.status);
    if (params?.limit) query.set("limit", String(params.limit));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return http<{ posts: SocialPost[] }>(`${STOREHAUSE_API_PREFIX}/marketing/posts${suffix}`);
  },

  async listScheduledPosts(): Promise<{ posts: SocialPost[] }> {
    requireToken();
    return http<{ posts: SocialPost[] }>(`${STOREHAUSE_API_PREFIX}/marketing/posts/scheduled`);
  },

  async getMarketingAudience(): Promise<MarketingAudience> {
    requireToken();
    return http<MarketingAudience>(`${STOREHAUSE_API_PREFIX}/marketing/audience`);
  },

  async refreshMarketingAudience(): Promise<MarketingAudience & { message: string }> {
    requireToken();
    return http<MarketingAudience & { message: string }>(
      `${STOREHAUSE_API_PREFIX}/marketing/audience/refresh`,
      { method: "POST" },
    );
  },

  async getBestTimeToPost(provider?: string): Promise<BestTimeToPost> {
    requireToken();
    const suffix = provider ? `?provider=${encodeURIComponent(provider)}` : "";
    return http<BestTimeToPost>(`${STOREHAUSE_API_PREFIX}/marketing/best-time${suffix}`);
  },

  async getMarketingPerformance(windowDays?: number): Promise<MarketingPerformance> {
    requireToken();
    const suffix = windowDays ? `?window_days=${windowDays}` : "";
    return http<MarketingPerformance>(`${STOREHAUSE_API_PREFIX}/marketing/performance${suffix}`);
  },

  async createMarketingPost(input: CreateSocialPostInput): Promise<{ message: string; post: SocialPost }> {
    requireToken();
    return http<{ message: string; post: SocialPost }>(`${STOREHAUSE_API_PREFIX}/marketing/posts`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async updateMarketingPost(
    postId: string,
    input: UpdateSocialPostInput,
  ): Promise<{ message: string; post: SocialPost }> {
    requireToken();
    return http<{ message: string; post: SocialPost }>(
      `${STOREHAUSE_API_PREFIX}/marketing/posts/${encodeURIComponent(postId)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    );
  },

  async deleteMarketingPost(postId: string): Promise<{ message: string }> {
    requireToken();
    return http<{ message: string }>(
      `${STOREHAUSE_API_PREFIX}/marketing/posts/${encodeURIComponent(postId)}`,
      { method: "DELETE" },
    );
  },

  async publishMarketingPost(
    postId: string,
  ): Promise<MarketingStatus & { message: string; post: SocialPost; external_url: string | null }> {
    requireToken();
    return http<MarketingStatus & { message: string; post: SocialPost; external_url: string | null }>(
      `${STOREHAUSE_API_PREFIX}/marketing/posts/${encodeURIComponent(postId)}/publish`,
      { method: "POST" },
    );
  },

  async scheduleMarketingPost(
    postId: string,
    scheduledFor: string,
  ): Promise<{ message: string; post: SocialPost }> {
    requireToken();
    return http<{ message: string; post: SocialPost }>(
      `${STOREHAUSE_API_PREFIX}/marketing/posts/${encodeURIComponent(postId)}/schedule`,
      { method: "POST", body: JSON.stringify({ scheduled_for: scheduledFor }) },
    );
  },

  async unscheduleMarketingPost(postId: string): Promise<{ message: string; post: SocialPost }> {
    requireToken();
    return http<{ message: string; post: SocialPost }>(
      `${STOREHAUSE_API_PREFIX}/marketing/posts/${encodeURIComponent(postId)}/unschedule`,
      { method: "POST" },
    );
  },

  async connectInstagramMarketing(): Promise<MarketingStatus & { message: string }> {
    requireToken();
    return http<MarketingStatus & { message: string }>(
      `${STOREHAUSE_API_PREFIX}/marketing/instagram/connect`,
      { method: "POST" },
    );
  },

  async disconnectInstagramMarketing(): Promise<MarketingStatus & { message: string }> {
    requireToken();
    return http<MarketingStatus & { message: string }>(
      `${STOREHAUSE_API_PREFIX}/marketing/instagram/disconnect`,
      { method: "DELETE" },
    );
  },

  async listAdAccounts(): Promise<{ accounts: AdAccount[] }> {
    requireToken();
    return http<{ accounts: AdAccount[] }>(`${STOREHAUSE_API_PREFIX}/marketing/ads/accounts`);
  },

  async selectAdAccount(adAccountId: string): Promise<MarketingStatus & { message: string }> {
    requireToken();
    return http<MarketingStatus & { message: string }>(`${STOREHAUSE_API_PREFIX}/marketing/ads/account`, {
      method: "POST",
      body: JSON.stringify({ ad_account_id: adAccountId }),
    });
  },

  async disconnectAdAccount(): Promise<MarketingStatus & { message: string }> {
    requireToken();
    return http<MarketingStatus & { message: string }>(`${STOREHAUSE_API_PREFIX}/marketing/ads/account`, {
      method: "DELETE",
    });
  },

  async listAdCampaigns(): Promise<{ campaigns: AdCampaign[] }> {
    requireToken();
    return http<{ campaigns: AdCampaign[] }>(`${STOREHAUSE_API_PREFIX}/marketing/ads/campaigns`);
  },

  async createAdCampaign(input: SaveAdCampaignInput): Promise<{ message: string; campaign: AdCampaign }> {
    requireToken();
    return http<{ message: string; campaign: AdCampaign }>(
      `${STOREHAUSE_API_PREFIX}/marketing/ads/campaigns`,
      { method: "POST", body: JSON.stringify(input) },
    );
  },

  async updateAdCampaign(
    campaignId: string,
    input: Partial<SaveAdCampaignInput>,
  ): Promise<{ message: string; campaign: AdCampaign }> {
    requireToken();
    return http<{ message: string; campaign: AdCampaign }>(
      `${STOREHAUSE_API_PREFIX}/marketing/ads/campaigns/${encodeURIComponent(campaignId)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    );
  },

  async launchAdCampaign(campaignId: string): Promise<{ message: string; campaign: AdCampaign }> {
    requireToken();
    return http<{ message: string; campaign: AdCampaign }>(
      `${STOREHAUSE_API_PREFIX}/marketing/ads/campaigns/${encodeURIComponent(campaignId)}/launch`,
      { method: "POST" },
    );
  },

  async setAdCampaignState(
    campaignId: string,
    active: boolean,
  ): Promise<{ message: string; campaign: AdCampaign }> {
    requireToken();
    return http<{ message: string; campaign: AdCampaign }>(
      `${STOREHAUSE_API_PREFIX}/marketing/ads/campaigns/${encodeURIComponent(campaignId)}/state`,
      { method: "POST", body: JSON.stringify({ active }) },
    );
  },

  async archiveAdCampaign(campaignId: string): Promise<{ message: string }> {
    requireToken();
    return http<{ message: string }>(
      `${STOREHAUSE_API_PREFIX}/marketing/ads/campaigns/${encodeURIComponent(campaignId)}`,
      { method: "DELETE" },
    );
  },

  async completeWhatsAppEmbeddedSignup(input: {
    code: string;
    waba_id?: string | null;
    phone_number_id?: string | null;
  }): Promise<MarketingStatus & { message: string }> {
    requireToken();
    return http<MarketingStatus & { message: string }>(
      `${STOREHAUSE_API_PREFIX}/marketing/whatsapp/embedded-signup`,
      { method: "POST", body: JSON.stringify(input) },
    );
  },

  async connectWhatsAppMarketing(input: ConnectWhatsAppInput): Promise<MarketingStatus & { message: string }> {
    requireToken();
    return http<MarketingStatus & { message: string }>(`${STOREHAUSE_API_PREFIX}/marketing/whatsapp/connect`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async disconnectWhatsAppMarketing(): Promise<MarketingStatus & { message: string }> {
    requireToken();
    return http<MarketingStatus & { message: string }>(`${STOREHAUSE_API_PREFIX}/marketing/whatsapp/disconnect`, {
      method: "DELETE",
    });
  },

  async connectTikTokMarketing(input: ConnectTikTokInput): Promise<MarketingStatus & { message: string }> {
    requireToken();
    return http<MarketingStatus & { message: string }>(`${STOREHAUSE_API_PREFIX}/marketing/tiktok/connect`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async disconnectTikTokMarketing(): Promise<MarketingStatus & { message: string }> {
    requireToken();
    return http<MarketingStatus & { message: string }>(`${STOREHAUSE_API_PREFIX}/marketing/tiktok/disconnect`, {
      method: "DELETE",
    });
  },

  async connectTikTokCreatorMarketing(): Promise<{ authorization_url: string; state: string }> {
    requireToken();
    return http<{ authorization_url: string; state: string }>(
      `${STOREHAUSE_API_PREFIX}/marketing/tiktok/creator/connect`,
    );
  },

  async disconnectTikTokCreatorMarketing(): Promise<MarketingStatus & { message: string }> {
    requireToken();
    return http<MarketingStatus & { message: string }>(
      `${STOREHAUSE_API_PREFIX}/marketing/tiktok/creator/disconnect`,
      { method: "DELETE" },
    );
  },

  async publishTikTokVideo(input: PublishTikTokVideoInput): Promise<
    MarketingStatus & { message: string; post: SocialPost | null }
  > {
    requireToken();
    return http<MarketingStatus & { message: string; post: SocialPost | null }>(
      `${STOREHAUSE_API_PREFIX}/marketing/tiktok/publish`,
      {
        method: "POST",
        body: JSON.stringify(input),
      },
    );
  },

  async updateMessagingSettings(input: UpdateMessagingSettingsInput): Promise<MarketingStatus & { message: string }> {
    requireToken();
    return http<MarketingStatus & { message: string }>(`${STOREHAUSE_API_PREFIX}/marketing/messaging/settings`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  async getConversations(): Promise<{
    conversations: CustomerConversationSummary[];
    whatsapp?: MarketingStatus["whatsapp"];
  }> {
    requireToken();
    return http<{
      conversations: CustomerConversationSummary[];
      whatsapp?: MarketingStatus["whatsapp"];
    }>(`${STOREHAUSE_API_PREFIX}/marketing/conversations`);
  },

  async getConversationDetail(id: string): Promise<CustomerConversationDetail> {
    requireToken();
    return http<CustomerConversationDetail>(
      `${STOREHAUSE_API_PREFIX}/marketing/conversations/${encodeURIComponent(id)}`,
    );
  },

  async sendConversationReply(id: string, text: string): Promise<{ message: string }> {
    requireToken();
    return http<{ message: string }>(
      `${STOREHAUSE_API_PREFIX}/marketing/conversations/${encodeURIComponent(id)}/reply`,
      { method: "POST", body: JSON.stringify({ text }) },
    );
  },

  async getConversationAiDraft(id: string): Promise<{ draft: string }> {
    requireToken();
    return http<{ draft: string }>(
      `${STOREHAUSE_API_PREFIX}/marketing/conversations/${encodeURIComponent(id)}/ai-draft`,
      { method: "POST" },
    );
  },

  async getAbandonedRecoveries(params?: { page?: number; per_page?: number }): Promise<AbandonedRecoveryResponse> {
    requireToken();
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.per_page) query.set("per_page", String(params.per_page));
    const suffix = query.toString() ? `?${query.toString()}` : "";
    return http<AbandonedRecoveryResponse>(`${STOREHAUSE_API_PREFIX}/marketing/abandoned${suffix}`);
  },

  async draftAbandonedRecoveryMessage(input: {
    source_type: AbandonedRecoverySourceType;
    source_id: string;
    channel?: "email" | "whatsapp";
  }): Promise<{ draft: AbandonedRecoveryDraft }> {
    requireToken();
    return http<{ draft: AbandonedRecoveryDraft }>(`${STOREHAUSE_API_PREFIX}/marketing/abandoned/draft-message`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async sendAbandonedRecoveryMessage(input: {
    source_type: AbandonedRecoverySourceType;
    source_id: string;
    channel: "email" | "whatsapp";
    message: string;
    subject?: string;
  }): Promise<AbandonedRecoverySendResponse> {
    requireToken();
    return http<AbandonedRecoverySendResponse>(`${STOREHAUSE_API_PREFIX}/marketing/abandoned/send`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  async getPosCatalog(filters: { search?: string; category_id?: string } = {}): Promise<PosCatalogResponse> {
    requireToken();
    const params = new URLSearchParams();
    if (filters.search) params.set("search", filters.search);
    if (filters.category_id) params.set("category_id", filters.category_id);
    return http<PosCatalogResponse>(
      `${STOREHAUSE_API_PREFIX}/pos/catalog${params.toString() ? `?${params.toString()}` : ""}`,
    );
  },

  async syncPosCatalog(page = 1, perPage = 200): Promise<PosCatalogSyncResponse> {
    requireToken();
    const params = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
    });
    return http<PosCatalogSyncResponse>(`${STOREHAUSE_API_PREFIX}/pos/catalog/sync?${params.toString()}`);
  },

  async lookupPosProduct(
    code: string,
    mode: "exact" | "search" = "exact",
  ): Promise<PosLookupResponse> {
    requireToken();
    const params = new URLSearchParams({ code, mode });
    return http<PosLookupResponse>(`${STOREHAUSE_API_PREFIX}/pos/lookup?${params.toString()}`);
  },

  async getPosPaymentInfo(): Promise<StorePaymentSettings> {
    requireToken();
    const res = await http<{ payments: StorePaymentSettings }>(
      `${STOREHAUSE_API_PREFIX}/pos/payment-info`,
    );
    return res.payments;
  },

  async createPosOrder(body: CreatePosOrderInput): Promise<StoreOrder> {
    requireToken();
    const res = await http<{ order: StoreOrder }>(`${STOREHAUSE_API_PREFIX}/pos/orders`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.order;
  },

  async getPosOrders(filters: { location_id?: string } = {}): Promise<StoreOrder[]> {
    requireToken();
    const params = new URLSearchParams();
    if (filters.location_id) params.set("location_id", filters.location_id);
    const res = await http<{ data: StoreOrder[] }>(
      `${STOREHAUSE_API_PREFIX}/pos/orders${params.toString() ? `?${params.toString()}` : ""}`,
    );
    return res.data;
  },

  async getPosOrder(orderId: string): Promise<StoreOrder> {
    requireToken();
    const res = await http<{ order: StoreOrder }>(`${STOREHAUSE_API_PREFIX}/pos/orders/${orderId}`);
    return res.order;
  },

  async getLocations(): Promise<StoreLocation[]> {
    requireToken();
    const res = await http<{ data: StoreLocation[] }>(`${STOREHAUSE_API_PREFIX}/pos/locations`);
    return res.data;
  },

  async createLocation(body: {
    name: string;
    city?: string | null;
    state?: string | null;
    area?: string | null;
    delivery_fee?: number | null;
    free_shipping_enabled?: boolean;
    free_shipping_min_subtotal?: number | null;
    is_default?: boolean;
  }): Promise<StoreLocation> {
    requireToken();
    const res = await http<{ location: StoreLocation }>(`${STOREHAUSE_API_PREFIX}/locations`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.location;
  },

  async updateLocation(
    locationId: string,
    body: {
      name?: string;
      city?: string | null;
      state?: string | null;
      area?: string | null;
      delivery_fee?: number | null;
      free_shipping_enabled?: boolean;
      free_shipping_min_subtotal?: number | null;
      is_default?: boolean;
    },
  ): Promise<StoreLocation> {
    requireToken();
    const res = await http<{ location: StoreLocation }>(
      `${STOREHAUSE_API_PREFIX}/locations/${locationId}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );
    return res.location;
  },

  async deleteLocation(locationId: string): Promise<void> {
    requireToken();
    await http(`${STOREHAUSE_API_PREFIX}/locations/${locationId}`, { method: "DELETE" });
  },

  async getStaff(): Promise<{
    data: MerchantStaffMember[];
    owner: { id: string; name: string; email: string; role: string };
  }> {
    requireToken();
    return http(`${STOREHAUSE_API_PREFIX}/staff`);
  },

  async createStaff(body: CreateStaffInput): Promise<MerchantStaffMember> {
    requireToken();
    const res = await http<{ staff: MerchantStaffMember }>(`${STOREHAUSE_API_PREFIX}/staff`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.staff;
  },

  async updateStaff(staffId: string, body: UpdateStaffInput): Promise<MerchantStaffMember> {
    requireToken();
    const res = await http<{ staff: MerchantStaffMember }>(
      `${STOREHAUSE_API_PREFIX}/staff/${staffId}`,
      {
        method: "PATCH",
        body: JSON.stringify(body),
      },
    );
    return res.staff;
  },

  async getDealieChatSettings(): Promise<{
    vendor_id: number;
    chat_mode: DealieChatMode;
    chat_mode_config: {
      auto_approve_discount_percent?: number;
      offline_fallback_mode?: "full_ai" | "leave_message";
      sound_alerts?: boolean;
      email_alerts?: boolean;
    };
  }> {
    const dealieApiUrl = process.env.NEXT_PUBLIC_DEALIE_API_URL || "http://localhost:8000";
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await fetch(`${dealieApiUrl}/api/v1/chat/vendor/settings`, { headers });
      if (!res.ok) throw new ApiError(res.status, "Failed to load chat settings");
      return res.json();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      console.warn("Dealie API get settings unreachable, using defaults:", err);
      return {
        vendor_id: 1,
        chat_mode: "full_ai",
        chat_mode_config: {
          auto_approve_discount_percent: 5.0,
          offline_fallback_mode: "full_ai",
          sound_alerts: true,
          email_alerts: true,
        },
      };
    }
  },

  async updateDealieChatSettings(body: {
    chat_mode: DealieChatMode;
    chat_mode_config?: Record<string, unknown>;
  }): Promise<{ status: string; chat_mode: DealieChatMode; chat_mode_config: unknown }> {
    const dealieApiUrl = process.env.NEXT_PUBLIC_DEALIE_API_URL || "http://localhost:8000";
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await fetch(`${dealieApiUrl}/api/v1/chat/vendor/settings`, {
        method: "PUT",
        headers,
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new ApiError(res.status, "Failed to update chat settings");
      return res.json();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      console.warn("Dealie API update settings unreachable:", err);
      return { status: "local_saved", chat_mode: body.chat_mode, chat_mode_config: body.chat_mode_config || {} };
    }
  },

  async getDealieSessions(): Promise<VendorChatSessionSummary[]> {
    const dealieApiUrl = process.env.NEXT_PUBLIC_DEALIE_API_URL || "http://localhost:8000";
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await fetch(`${dealieApiUrl}/api/v1/chat/vendor/sessions`, { headers });
      if (!res.ok) return [];
      const data = await res.json();
      return data.sessions || [];
    } catch (err) {
      console.warn("Dealie API sessions fetch skipped or unreachable:", err);
      return [];
    }
  },

  async getDealieSessionDetail(sessionId: string): Promise<LiveChatSessionDetail | null> {
    const dealieApiUrl = process.env.NEXT_PUBLIC_DEALIE_API_URL || "http://localhost:8000";
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await fetch(`${dealieApiUrl}/api/v1/chat/vendor/sessions/${encodeURIComponent(sessionId)}`, { headers });
      if (!res.ok) return null;
      return res.json();
    } catch (err) {
      console.warn("Dealie API session detail fetch skipped or unreachable:", err);
      return null;
    }
  },

  async sendDealieVendorReply(body: {
    sessionId: string;
    userId: string;
    message: string;
    productId?: number | null;
  }): Promise<{ status: string; message: string }> {
    const dealieApiUrl = process.env.NEXT_PUBLIC_DEALIE_API_URL || "http://localhost:8000";
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await fetch(`${dealieApiUrl}/api/v1/chat/vendor/reply`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          session_id: body.sessionId,
          user_id: body.userId,
          message: body.message,
          product_id: body.productId,
        }),
      });
      if (!res.ok) throw new ApiError(res.status, "Could not deliver reply to buyer");
      return res.json();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, "Dealie service unreachable. Please ensure Dealie server is running.");
    }
  },

  async approveDealieDraft(body: {
    sessionId: string;
    userId: string;
    action: "approve" | "edit" | "reject";
    editedMessage?: string | null;
    overridePrice?: number | null;
  }): Promise<{ status: string; message?: string; deal_token?: string; agreed_price?: number }> {
    const dealieApiUrl = process.env.NEXT_PUBLIC_DEALIE_API_URL || "http://localhost:8000";
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await fetch(`${dealieApiUrl}/api/v1/chat/vendor/approve-draft`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          session_id: body.sessionId,
          user_id: body.userId,
          action: body.action,
          edited_message: body.editedMessage,
          override_price: body.overridePrice,
        }),
      });
      if (!res.ok) throw new ApiError(res.status, "Failed to approve draft");
      return res.json();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, "Dealie service unreachable. Please ensure Dealie server is running.");
    }
  },

  async issueDealieManualDeal(body: {
    sessionId: string;
    userId: string;
    productId: number;
    agreedPrice: number;
  }): Promise<{ status: string; deal_token: string; agreed_price: number }> {
    const dealieApiUrl = process.env.NEXT_PUBLIC_DEALIE_API_URL || "http://localhost:8000";
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await fetch(`${dealieApiUrl}/api/v1/chat/vendor/issue-deal`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          session_id: body.sessionId,
          user_id: body.userId,
          product_id: body.productId,
          agreed_price: body.agreedPrice,
        }),
      });
      if (!res.ok) throw new ApiError(res.status, "Failed to issue deal token");
      return res.json();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, "Dealie service unreachable. Please ensure Dealie server is running.");
    }
  },

  async toggleDealieTakeover(body: {
    sessionId: string;
    userId: string;
    takeover: boolean;
  }): Promise<{ status: string; is_human_takeover: boolean }> {
    const dealieApiUrl = process.env.NEXT_PUBLIC_DEALIE_API_URL || "http://localhost:8000";
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await fetch(`${dealieApiUrl}/api/v1/chat/vendor/takeover`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          session_id: body.sessionId,
          user_id: body.userId,
          takeover: body.takeover,
        }),
      });
      if (!res.ok) throw new ApiError(res.status, "Failed to toggle takeover");
      return res.json();
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(500, "Dealie service unreachable. Please ensure Dealie server is running.");
    }
  },
};

export { ApiError };
export const isUsingMocks = USE_MOCKS;
