"use client";

import { createContext, useContext, useEffect, useState, Suspense, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, getToken, onAuthLogout, setToken } from "@/lib/api/client";
import { cacheAuthUser, readCachedAuthUser } from "@/lib/auth-user-cache";
import { prefetchMerchantWorkspace } from "@/hooks/use-merchant-queries";
import { postAuthPath, type User } from "@/lib/api/types";

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
  onAuthCode,
  onImpersonateToken,
  onImpersonateCode,
  onError,
}: {
  onAuthToken: (token: string) => void;
  onAuthCode: (code: string) => void;
  onImpersonateToken: (token: string) => void;
  onImpersonateCode: (code: string) => void;
  onError: (message: string) => void;
}) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const authCode = searchParams.get("auth_code");
    if (authCode) {
      onAuthCode(authCode);
      const url = new URL(window.location.href);
      url.searchParams.delete("auth_code");
      window.history.replaceState({}, "", url.pathname + url.search);
      return;
    }

    const authToken = searchParams.get("auth_token");
    if (authToken) {
      onAuthToken(authToken);
      const url = new URL(window.location.href);
      url.searchParams.delete("auth_token");
      window.history.replaceState({}, "", url.pathname + url.search);
      return;
    }

    const impersonateCode = searchParams.get("impersonate_code");
    if (impersonateCode) {
      onImpersonateCode(impersonateCode);
      const url = new URL(window.location.href);
      url.searchParams.delete("impersonate_code");
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
  }, [searchParams, onAuthToken, onAuthCode, onImpersonateToken, onImpersonateCode, onError]);
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
      cacheAuthUser(null);
      setUser(null);
      setImpersonating(false);
      setLoading(false);
      return;
    }
    // Restore last session immediately so Sell can open while offline.
    const cached = readCachedAuthUser();
    if (cached) {
      setUser(cached);
      setImpersonating(Boolean(cached.impersonating));
      setLoading(false);
    }
    try {
      const freshUser = await api.me();
      cacheAuthUser(freshUser);
      setUser(freshUser);
      setImpersonating(Boolean(freshUser.impersonating));
    } catch {
      if (!cached) {
        setUser(null);
        setImpersonating(false);
      }
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
      cacheAuthUser(freshUser);
      setUser(freshUser);
      setImpersonating(Boolean(freshUser.impersonating) || impersonation);
      if (!impersonation) {
        toast.success(`Welcome${freshUser.name ? `, ${freshUser.name.split(" ")[0]}` : ""}!`);
        router.replace(postAuthPath(freshUser));
      }
      prefetchMerchantWorkspace(qc, freshUser);
    } catch {
      setToken(null);
      cacheAuthUser(null);
      setUser(null);
      setImpersonating(false);
      if (!impersonation) {
        toast.error("Could not complete sign-in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuthCode = async (code: string) => {
    setLoading(true);
    try {
      const result = await api.exchangeAuthCode(code);
      await handleAuthToken(result.token, false);
    } catch (err) {
      setLoading(false);
      toast.error(err instanceof Error ? err.message : "Could not complete sign-in. Please try again.");
    }
  };

  const handleImpersonateCode = async (code: string) => {
    setLoading(true);
    try {
      const result = await api.exchangeAuthCode(code);
      await handleAuthToken(result.token, true);
    } catch (err) {
      setLoading(false);
      toast.error(err instanceof Error ? err.message : "Could not complete impersonation.");
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
      cacheAuthUser(null);
      setUser(null);
      setImpersonating(false);
      setLoading(false);
      qc.clear();
      router.replace("/login");
    });
  }, [qc, router]);

  const signOut = async () => {
    // Clear local session and leave admin routes immediately so sign-out never
    // gets stuck behind a slow/failed logout request or an admin-layout spinner.
    cacheAuthUser(null);
    setUser(null);
    setImpersonating(false);
    qc.clear();
    void api.logout();
    router.replace("/login");
  };

  const setUserPersisted = (next: User | null) => {
    cacheAuthUser(next);
    setUser(next);
  };

  return (
    <Ctx.Provider value={{ user, loading, refresh, signOut, setUser: setUserPersisted, impersonating }}>
      <Suspense fallback={null}>
        <AuthCallbackHandler
          onAuthToken={handleGoogleAuth}
          onAuthCode={handleAuthCode}
          onImpersonateToken={handleImpersonation}
          onImpersonateCode={handleImpersonateCode}
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
