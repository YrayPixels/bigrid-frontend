"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { History, LogOut, ShoppingBag } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api/client";
import type { StoreLocation } from "@/lib/api/types";
import { SellCartProvider, useSellCart } from "@/lib/sell-cart";
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
  const [locations, setLocations] = useState<StoreLocation[]>([]);
  const [storeName, setStoreName] = useState("Sell");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && user.can_sell === false) {
      router.replace(user.can_access_admin ? "/admin" : "/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [locs, catalog] = await Promise.all([
          api.getLocations(),
          api.getPosCatalog(),
        ]);
        if (cancelled) return;
        setLocations(locs);
        setStoreName(catalog.store.name);
        if (!locationId) {
          const preferred =
            locs.find((l) => l.id === user.default_location_id) ||
            locs.find((l) => l.is_default) ||
            locs[0];
          if (preferred) setLocationId(preferred.id);
        }
      } catch {
        // Catalog/locations load errors surface on the sell page itself.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, locationId, setLocationId]);

  if (loading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-100 text-sm text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh w-full flex-col bg-zinc-100 text-zinc-900">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold tracking-tight sm:text-base">
                {storeName}
              </p>
              <p className="truncate text-xs text-zinc-500 sm:text-sm">{user.name}</p>
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
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col">{children}</main>
    </div>
  );
}

export default function SellLayout({ children }: { children: ReactNode }) {
  return (
    <SellCartProvider>
      <SellShellInner>{children}</SellShellInner>
    </SellCartProvider>
  );
}
