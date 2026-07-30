"use client";

import { useEffect, useState } from "react";
import { CloudOff, Download, RefreshCw, Wifi } from "lucide-react";
import { toast } from "sonner";
import { usePosOffline } from "@/lib/pos-offline/context";
import {
  applyPosPwaUpdate,
  subscribePosPwaUpdate,
} from "@/lib/pos-offline/register-sw";
import { PWA_VERSION } from "@/lib/pos-offline/pwa-version";
import { Button } from "@/components/ui/button";

const SYNC_REMINDER_MS = 4 * 60 * 60 * 1000;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

function useInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return [event, setEvent] as const;
}

function useStaleCatalogSync(syncedAt: string | null | undefined) {
  const [stale, setStale] = useState(false);

  useEffect(() => {
    const check = () => {
      if (!syncedAt) {
        setStale(false);
        return;
      }
      const age = Date.now() - new Date(syncedAt).getTime();
      setStale(Number.isFinite(age) && age >= SYNC_REMINDER_MS);
    };
    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [syncedAt]);

  return stale;
}

function usePwaUpdateAvailable() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    return subscribePosPwaUpdate((state) => {
      setUpdateAvailable(state.updateAvailable);
    });
  }, []);

  return updateAvailable;
}

export function SellOfflineBanner() {
  const { online, pendingCount, cacheEmpty, catalog, refreshCatalogFromNetwork } =
    usePosOffline();
  const [installEvent, setInstallEvent] = useInstallPrompt();
  const catalogStale = useStaleCatalogSync(catalog?.synced_at);
  const updateAvailable = usePwaUpdateAvailable();
  const [syncing, setSyncing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const syncNow = async () => {
    setSyncing(true);
    try {
      await refreshCatalogFromNetwork();
      toast.success("Synced with the web");
    } catch {
      toast.error("Could not sync right now");
    } finally {
      setSyncing(false);
    }
  };

  if (updateAvailable && online) {
    return (
      <div className="border-b border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-950 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2">
          <p>A new Bizgrid Sell update is ready. You’re on v{PWA_VERSION}.</p>
          <Button
            type="button"
            size="sm"
            className="h-8"
            disabled={updating}
            onClick={() => {
              setUpdating(true);
              applyPosPwaUpdate();
            }}
          >
            <RefreshCw className={`mr-1.5 size-3.5 ${updating ? "animate-spin" : ""}`} />
            {updating ? "Updating…" : "Update now"}
          </Button>
        </div>
      </div>
    );
  }

  if (cacheEmpty && online) {
    return (
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2">
          <p>Preparing offline catalog… open Sell once online to cache products.</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-amber-300 bg-white"
            onClick={() => void syncNow()}
            disabled={syncing}
          >
            Retry download
          </Button>
        </div>
      </div>
    );
  }

  if (!online) {
    return (
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2">
          <CloudOff className="size-4 shrink-0" />
          <p>
            Offline — selling from cached catalog.
            {pendingCount > 0
              ? ` ${pendingCount} sale${pendingCount === 1 ? "" : "s"} waiting to sync.`
              : " Sales will sync when you’re back online."}
          </p>
        </div>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="border-b border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-950 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2">
          <Wifi className="size-4 shrink-0" />
          <p>
            Syncing {pendingCount} offline sale{pendingCount === 1 ? "" : "s"}…
          </p>
        </div>
      </div>
    );
  }

  if (catalogStale) {
    return (
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2">
          <p>
            Last sync was over 4 hours ago. Sync with the web to keep products and prices
            up to date.
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 border-amber-300 bg-white"
            onClick={() => void syncNow()}
            disabled={syncing}
          >
            <RefreshCw className={`mr-1.5 size-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing…" : "Sync now"}
          </Button>
        </div>
      </div>
    );
  }

  if (installEvent) {
    return (
      <div className="border-b border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2">
          <p>Install Bizgrid on this device for faster offline access.</p>
          <Button
            type="button"
            size="sm"
            className="h-8"
            onClick={async () => {
              await installEvent.prompt();
              setInstallEvent(null);
            }}
          >
            <Download className="mr-1.5 size-3.5" />
            Install
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
