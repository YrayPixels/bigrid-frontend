"use client";

import { createContext, useContext, useEffect, useState, Suspense, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, getToken, onAuthLogout, setToken } from "@/lib/api/client";
import { merchantKeys } from "@/lib/query-keys";
import type { User } from "@/lib/api/types";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User | null) => void;
  impersonating: boolean;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

function AuthCallbackHandler({
  onAuthToken,
  onImpersonateToken,
  onError,
}: {
  onAuthToken: (token: string) => void;
  onImpersonateToken: (token: string) => void;
  onError: (message: string) => void;
}) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const authToken = searchParams.get("auth_token");
    if (authToken) {
      onAuthToken(authToken);
      const url = new URL(window.location.href);
      url.searchParams.delete("auth_token");
      window.history.replaceState({}, "", url.pathname + url.search);
      return;
    }

    const impersonateToken = searchParams.get("impersonate_token");
    if (impersonateToken) {
      onImpersonateToken(impersonateToken);
      const url = new URL(window.location.href);
      url.searchParams.delete("impersonate_token");
      window.history.replaceState({}, "", url.pathname + url.search);
      return;
    }

    const authError = searchParams.get("auth_error");
    if (authError) {
      onError(authError);
      const url = new URL(window.location.href);
      url.searchParams.delete("auth_error");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [searchParams, onAuthToken, onImpersonateToken, onError]);
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();

  const refresh = async () => {
    if (!getToken()) {
      setUser(null);
      setImpersonating(false);
      setLoading(false);
      return;
    }
    try {
      const freshUser = await api.me();
      setUser(freshUser);
      setImpersonating(Boolean(freshUser.impersonating));
    } catch {
      setUser(null);
      setImpersonating(false);
    } finally {
      setLoading(false);
    }
  };

  const handleAuthToken = async (token: string, impersonation = false) => {
    setToken(token);
    setImpersonating(impersonation);
    setLoading(true);
    try {
      const freshUser = await api.me();
      setUser(freshUser);
      setImpersonating(Boolean(freshUser.impersonating) || impersonation);
      if (freshUser.has_store) {
        await Promise.all([
          qc.prefetchQuery({
            queryKey: merchantKeys.store.me(),
            queryFn: () => api.getMyStore(),
            staleTime: 5 * 60 * 1000,
          }),
          qc.prefetchQuery({
            queryKey: merchantKeys.dashboard(),
            queryFn: () => api.getDashboardOverview(),
            staleTime: 60 * 1000,
          }),
        ]);
      }
      if (!impersonation) {
        toast.success(`Welcome${freshUser.name ? `, ${freshUser.name.split(" ")[0]}` : ""}!`);
        router.replace(freshUser.has_store ? "/admin" : "/admin/onboarding");
      }
    } catch {
      setToken(null);
      setUser(null);
      setImpersonating(false);
      if (!impersonation) {
        toast.error("Could not complete sign-in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonation = (token: string) => {
    void handleAuthToken(token, true);
  };

  const handleGoogleAuth = (token: string) => {
    void handleAuthToken(token, false);
  };

  const handleAuthError = (message: string) => {
    toast.error(message);
  };

  useEffect(() => {
    void refresh();
    return onAuthLogout(() => {
      setUser(null);
      setImpersonating(false);
      setLoading(false);
      qc.clear();
      router.replace("/login");
    });
  }, [qc, router]);

  const signOut = async () => {
    await api.logout();
    setUser(null);
    setImpersonating(false);
    qc.clear();
    router.push("/login");
  };

  return (
    <Ctx.Provider value={{ user, loading, refresh, signOut, setUser, impersonating }}>
      <Suspense fallback={null}>
        <AuthCallbackHandler
          onAuthToken={handleGoogleAuth}
          onImpersonateToken={handleImpersonation}
          onError={handleAuthError}
        />
      </Suspense>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
