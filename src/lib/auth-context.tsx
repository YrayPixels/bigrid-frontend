"use client";

import { createContext, useContext, useEffect, useState, Suspense, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { api, getToken, setToken } from "@/lib/api/client";
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

function ImpersonationHandler({ onToken }: { onToken: (token: string) => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const token = searchParams.get("impersonate_token");
    if (token) {
      onToken(token);
      const url = new URL(window.location.href);
      url.searchParams.delete("impersonate_token");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [searchParams, onToken]);
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
      setLoading(false);
      return;
    }
    try {
      const freshUser = await api.me();
      setUser(freshUser);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImpersonation = (token: string) => {
    setToken(token);
    setImpersonating(true);
    void refresh();
  };

  useEffect(() => {
    void refresh();
  }, []);

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
        <ImpersonationHandler onToken={handleImpersonation} />
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
