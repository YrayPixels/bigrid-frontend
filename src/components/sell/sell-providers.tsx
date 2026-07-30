"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PosOfflineProvider, usePosOffline } from "@/lib/pos-offline/context";
import { SellCartProvider } from "@/lib/sell-cart";

function SellCartBridge({ children }: { children: ReactNode }) {
  const { storeId } = usePosOffline();
  return <SellCartProvider storeId={storeId}>{children}</SellCartProvider>;
}

export function SellProviders({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Avoid SSR/localStorage mismatches for cart + IDB.
  if (!mounted) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-100 text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <PosOfflineProvider>
      <SellCartBridge>{children}</SellCartBridge>
    </PosOfflineProvider>
  );
}
