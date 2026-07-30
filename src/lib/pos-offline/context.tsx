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
import {
  isBrowserOnline,
  listUnsyncedPendingOrders,
  type PosOfflineCatalog,
} from "@/lib/pos-offline/db";
import { readPosOfflineCache, warmPosOfflineCache } from "@/lib/pos-offline/sync-catalog";
import { startPosOrderSyncLoop } from "@/lib/pos-offline/sync-orders";

type PosOfflineContextValue = {
  online: boolean;
  ready: boolean;
  storeId: string | null;
  catalog: PosOfflineCatalog | null;
  pendingCount: number;
  cacheEmpty: boolean;
  refreshPendingCount: () => Promise<void>;
  refreshCatalogFromNetwork: () => Promise<void>;
};

const PosOfflineContext = createContext<PosOfflineContextValue | null>(null);

export function PosOfflineProvider({ children }: { children: ReactNode }) {
  const [online, setOnline] = useState(true);
  const [ready, setReady] = useState(false);
  const [catalog, setCatalog] = useState<PosOfflineCatalog | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(async () => {
    const rows = await listUnsyncedPendingOrders(catalog?.store_id);
    setPendingCount(rows.filter((row) => !row.server_order_id).length);
  }, [catalog?.store_id]);

  const refreshCatalogFromNetwork = useCallback(async () => {
    const next = await warmPosOfflineCache({ storeId: catalog?.store_id });
    setCatalog(next);
  }, [catalog?.store_id]);

  useEffect(() => {
    setOnline(isBrowserOnline());
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cached = await readPosOfflineCache();
        if (!cancelled && cached) setCatalog(cached);

        if (isBrowserOnline()) {
          try {
            const warmed = await warmPosOfflineCache({
              storeId: cached?.store_id,
            });
            if (!cancelled) setCatalog(warmed);
          } catch {
            if (!cancelled && !cached) {
              toast.message("Could not download catalog for offline use");
            }
          }
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void refreshPendingCount();
  }, [refreshPendingCount, catalog?.store_id]);

  useEffect(() => {
    if (!ready) return;
    return startPosOrderSyncLoop({
      storeId: catalog?.store_id,
      onResult: (result) => {
        void refreshPendingCount();
        if (result.synced > 0) {
          toast.success(
            result.synced === 1
              ? "1 offline sale synced"
              : `${result.synced} offline sales synced`,
          );
        }
        if (result.failed > 0) {
          toast.error(
            result.errors[0]?.message ||
              `${result.failed} offline sale(s) need attention`,
          );
        }
      },
    });
  }, [ready, catalog?.store_id, refreshPendingCount]);

  const value = useMemo<PosOfflineContextValue>(
    () => ({
      online,
      ready,
      storeId: catalog?.store_id ?? null,
      catalog,
      pendingCount,
      cacheEmpty: ready && !catalog,
      refreshPendingCount,
      refreshCatalogFromNetwork,
    }),
    [
      online,
      ready,
      catalog,
      pendingCount,
      refreshPendingCount,
      refreshCatalogFromNetwork,
    ],
  );

  return (
    <PosOfflineContext.Provider value={value}>{children}</PosOfflineContext.Provider>
  );
}

export function usePosOffline() {
  const ctx = useContext(PosOfflineContext);
  if (!ctx) throw new Error("usePosOffline must be used within PosOfflineProvider");
  return ctx;
}
