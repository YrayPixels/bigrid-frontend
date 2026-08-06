"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { History, LogOut, Settings, ShoppingBag } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getToken } from "@/lib/api/client";
import { SellProviders } from "@/components/sell/sell-providers";
import { SellOfflineBanner } from "@/components/sell/sell-offline-banner";
import { usePosOffline } from "@/lib/pos-offline/context";
import { registerPosServiceWorker } from "@/lib/pos-offline/register-sw";
import { useSellCart } from "@/lib/sell-cart";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function SellShellInner({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { locationId, setLocationId } = useSellCart();
  const { catalog, online } = usePosOffline();
  const locations = catalog?.locations ?? [];
  const storeName = catalog?.store.name || "Bizgrid";
  const storeLogo = catalog?.store.logo_url?.trim() || null;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      // Offline with a stored token: stay on Sell instead of bouncing to /login
      // (login is not available offline). Auth restores from the local user cache.
      const offlineWithSession =
        typeof navigator !== "undefined" && !navigator.onLine && Boolean(getToken());
      if (!offlineWithSession) router.replace("/login");
      return;
    }
    if (user.can_sell === false) {
      router.replace(user.can_access_admin ? "/admin" : "/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    registerPosServiceWorker();
  }, []);

  useEffect(() => {
    if (!user || !catalog || locationId) return;
    const preferred =
      locations.find((l) => l.id === user.default_location_id) ||
      locations.find((l) => l.is_default) ||
      locations[0];
    if (preferred) setLocationId(preferred.id);
  }, [user, catalog, locationId, locations, setLocationId]);

  if (loading || !user) {
    const offlineWaiting =
      !loading &&
      !user &&
      typeof navigator !== "undefined" &&
      !navigator.onLine &&
      Boolean(getToken());
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-zinc-100 px-6 text-center text-sm text-zinc-500">
        <p>{offlineWaiting ? "Offline" : "Loading…"}</p>
        {offlineWaiting ? (
          <p className="max-w-sm text-xs text-zinc-400">
            Open Sell once while online so your session and catalog can be cached for offline use.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh w-full flex-col bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {storeLogo ? (
                <div className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-zinc-200">
                  <Image
                    src={storeLogo}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="40px"
                    unoptimized
                  />
                </div>
              ) : null}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-tight sm:text-base">
                  {storeName}
                  {!online ? (
                    <span className="ml-2 text-xs font-normal text-amber-700">Offline</span>
                  ) : null}
                </p>
                <p className="truncate text-xs text-zinc-500 sm:text-sm">{user.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              {locations.length > 1 ? (
                <div className="mr-1 hidden min-w-[11rem] sm:block lg:min-w-[14rem]">
                  <Select
                    value={locationId ?? undefined}
                    onValueChange={(value) => setLocationId(value)}
                  >
                    <SelectTrigger className="h-10 bg-white">
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <Button
                variant="ghost"
                size="icon"
                asChild
                className={pathname.startsWith("/sell/sales") ? "bg-zinc-100" : ""}
              >
                <Link href="/sell/sales" aria-label="Today's sales">
                  <History className="size-5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                asChild
                className={pathname === "/sell" ? "bg-zinc-100" : ""}
              >
                <Link href="/sell" aria-label="Sell">
                  <ShoppingBag className="size-5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                asChild
                className={pathname === "/sell/settings" ? "bg-zinc-100" : ""}
              >
                <Link href="/sell/settings" aria-label="Settings">
                  <Settings className="size-5" />
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Sign out"
                onClick={async () => {
                  await signOut();
                  router.replace("/login");
                }}
              >
                <LogOut className="size-5" />
              </Button>
            </div>
          </div>
          {locations.length > 1 ? (
            <div className="sm:hidden">
              <Select
                value={locationId ?? undefined}
                onValueChange={(value) => setLocationId(value)}
              >
                <SelectTrigger className="h-10 w-full bg-white">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      </header>
      <SellOfflineBanner />
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col">{children}</main>
    </div>
  );
}

export default function SellLayoutClient({ children }: { children: ReactNode }) {
  return (
    <SellProviders>
      <SellShellInner>{children}</SellShellInner>
    </SellProviders>
  );
}
