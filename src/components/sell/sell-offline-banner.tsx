"use client";

import { useEffect, useState } from "react";
import { CloudOff, Download, Wifi } from "lucide-react";
import { usePosOffline } from "@/lib/pos-offline/context";
import { Button } from "@/components/ui/button";

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

export function SellOfflineBanner() {
  const { online, pendingCount, cacheEmpty, refreshCatalogFromNetwork } = usePosOffline();
  const [installEvent, setInstallEvent] = useInstallPrompt();

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
            onClick={() => void refreshCatalogFromNetwork()}
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
