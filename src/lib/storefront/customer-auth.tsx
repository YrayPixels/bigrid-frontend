"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

export type CustomerAccount = {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  email_verified_at: string | null;
  stores: Array<{ id: string; name: string; slug: string }>;
};

type CustomerAuthCtx = {
  customer: CustomerAccount | null;
  loading: boolean;
  token: string | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  getGoogleSignInUrl: (returnUrl?: string) => string | null;
  signInWithGoogle: (returnUrl?: string) => void;
};

const CUSTOMER_TOKEN_KEY = "storehause_customer_token";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true" || !API_BASE;

const CustomerAuthContext = createContext<CustomerAuthCtx | undefined>(undefined);

export function getCustomerToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CUSTOMER_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setCustomerToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
    else window.localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  } catch {
    // private mode
  }
}

async function exchangeCustomerCode(code: string): Promise<{ token: string; customer: CustomerAccount }> {
  const res = await fetch(`${API_BASE}/storehause/customer/auth/exchange-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message ?? "Could not complete sign-in.");
  }
  return data as { token: string; customer: CustomerAccount };
}

async function fetchCustomerMe(token: string, storeSlug: string): Promise<CustomerAccount> {
  const url = new URL(`${API_BASE}/storehause/customer/auth/me`);
  if (storeSlug) url.searchParams.set("store_slug", storeSlug);
  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message ?? "Session expired.");
  }
  return data.customer as CustomerAccount;
}

export function CustomerAuthProvider({
  storeSlug,
  children,
}: {
  storeSlug: string;
  children: ReactNode;
}) {
  const [customer, setCustomer] = useState<CustomerAccount | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const getGoogleSignInUrl = useCallback(
    (returnUrl?: string) => {
      if (USE_MOCKS) return null;
      const url = new URL(`${API_BASE}/storehause/customer/auth/google`);
      url.searchParams.set("store_slug", storeSlug);
      const ret =
        returnUrl ??
        (typeof window !== "undefined"
          ? (() => {
              const current = new URL(window.location.href);
              current.searchParams.delete("customer_auth_code");
              current.searchParams.delete("customer_auth_error");
              return current.toString();
            })()
          : "");
      if (ret) url.searchParams.set("return_url", ret);
      return url.toString();
    },
    [storeSlug],
  );

  const signInWithGoogle = useCallback(
    (returnUrl?: string) => {
      const url = getGoogleSignInUrl(returnUrl);
      if (!url) {
        toast.error("Google sign-in is not available right now.");
        return;
      }
      window.location.href = url;
    },
    [getGoogleSignInUrl],
  );

  const refresh = useCallback(async () => {
    const existing = getCustomerToken();
    if (!existing) {
      setTokenState(null);
      setCustomer(null);
      setLoading(false);
      return;
    }
    setTokenState(existing);
    try {
      const me = await fetchCustomerMe(existing, storeSlug);
      setCustomer(me);
    } catch {
      setCustomerToken(null);
      setTokenState(null);
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, [storeSlug]);

  const signOut = useCallback(async () => {
    const existing = getCustomerToken();
    if (existing && !USE_MOCKS) {
      try {
        await fetch(`${API_BASE}/storehause/customer/auth/logout`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${existing}`,
          },
        });
      } catch {
        // ignore
      }
    }
    setCustomerToken(null);
    setTokenState(null);
    setCustomer(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const boot = async () => {
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      const authError = params.get("customer_auth_error");
      const authCode = params.get("customer_auth_code");

      if (authError) {
        toast.error(authError);
        const url = new URL(window.location.href);
        url.searchParams.delete("customer_auth_error");
        window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      }

      if (authCode && !USE_MOCKS) {
        try {
          const result = await exchangeCustomerCode(authCode);
          if (cancelled) return;
          setCustomerToken(result.token);
          setTokenState(result.token);
          setCustomer(result.customer);
          // Soft-attach this store after exchange.
          try {
            const me = await fetchCustomerMe(result.token, storeSlug);
            if (!cancelled) setCustomer(me);
          } catch {
            // keep exchanged customer
          }
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Could not complete sign-in.");
        } finally {
          const url = new URL(window.location.href);
          url.searchParams.delete("customer_auth_code");
          // keep try_on=1 so CTA can auto-open
          window.history.replaceState({}, "", url.pathname + url.search + url.hash);
          if (!cancelled) setLoading(false);
        }
        return;
      }

      await refresh();
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [refresh, storeSlug]);

  const value = useMemo(
    () => ({
      customer,
      loading,
      token,
      refresh,
      signOut,
      getGoogleSignInUrl,
      signInWithGoogle,
    }),
    [customer, loading, token, refresh, signOut, getGoogleSignInUrl, signInWithGoogle],
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth(): CustomerAuthCtx {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  return ctx;
}

/** Safe for preview/editor surfaces that omit CustomerAuthProvider. */
export function useCustomerAuthOptional(): CustomerAuthCtx | null {
  return useContext(CustomerAuthContext) ?? null;
}
