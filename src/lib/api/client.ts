import { mockApi } from "./mocks";
import type {
  AuthResponse,
  CreateStoreInput,
  Store,
  StorefrontContent,
  StorefrontTemplateId,
  UpdateStorefrontInput,
  User,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
const STOREHAUSE_API_PREFIX = "/storehause";
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true" || !API_BASE;
const TOKEN_KEY = "storehaus_auth_token";

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

  async generateStorefront(
    storeId: string,
    storefrontTemplateId?: StorefrontTemplateId,
  ): Promise<StorefrontContent> {
    const token = requireToken();
    const body = {
      store_id: storeId,
      ...(storefrontTemplateId ? { storefront_template_id: storefrontTemplateId } : {}),
    };
    const res = USE_MOCKS
      ? await mockApi.generateStorefront(token, body)
      : await http<{ generation_id: string; storefront: StorefrontContent }>(
          `${STOREHAUSE_API_PREFIX}/ai/storefront/generate`,
          { method: "POST", body: JSON.stringify(body) },
        );
    return res.storefront;
  },

  async getStorefront(storeId: string): Promise<StorefrontContent | null> {
    const token = requireToken();
    const res = USE_MOCKS
      ? await mockApi.getStorefront(token, storeId)
      : await http<{ storefront: StorefrontContent | null }>(
          `${STOREHAUSE_API_PREFIX}/ai/storefront/${storeId}`,
        );
    return res.storefront;
  },

  async updateStorefront(storeId: string, body: UpdateStorefrontInput): Promise<StorefrontContent> {
    const token = requireToken();
    const res = USE_MOCKS
      ? await mockApi.updateStorefront(token, storeId, body)
      : await http<{ storefront: StorefrontContent }>(
          `${STOREHAUSE_API_PREFIX}/ai/storefront/${storeId}`,
          { method: "PATCH", body: JSON.stringify(body) },
        );
    return res.storefront;
  },
};

export { ApiError };
export const isUsingMocks = USE_MOCKS;
