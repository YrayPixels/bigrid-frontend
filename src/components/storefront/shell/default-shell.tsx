"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/storefront/cart-context";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { STOREFRONT_FOOTER_LINKS, STOREFRONT_NAV_ITEMS } from "@/lib/storefront/template";
import { StorefrontLink } from "@/components/storefront/theme/storefront-link";
import { getStorefrontUrl } from "@/lib/store-host";
import { cn } from "@/lib/utils";

export function DefaultShell({ children }: { children: React.ReactNode }) {
  const { store } = useStorefront();
  const { theme, mode } = useStorefrontTheme();
  const { itemCount } = useCart();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={`${theme.pageBg} min-h-screen ${theme.pageText}`}>
      <header
        className={`sticky top-0 z-40 border-b ${theme.borderColor} backdrop-blur`}
        style={{ backgroundColor: `${theme.palette.surface}f2` }}
      >
        <div className="flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <StorefrontLink href="/" className="flex min-w-0 items-center gap-3">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.business_name}
                className="h-9 w-9 rounded-lg object-cover"
              />
            ) : (
              <div
                className="grid h-9 w-9 place-items-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: theme.palette.primary }}
              >
                {store.business_name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span
              className="truncate text-lg font-semibold"
              style={{ fontFamily: theme.displayFont }}
            >
              {store.business_name}
            </span>
          </StorefrontLink>

          <nav className="hidden items-center gap-6 md:flex">
            {STOREFRONT_NAV_ITEMS.map((item) => (
              <StorefrontLink
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-foreground",
                  mode === "edit"
                    ? "text-muted-foreground"
                    : pathname === item.href ||
                      (item.href !== "/" && pathname.startsWith(item.href))
                      ? "text-foreground"
                      : "text-muted-foreground",
                )}
              >
                {item.label}
              </StorefrontLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {mode === "edit" ? (
              <span className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background">
                <ShoppingBag className="h-4 w-4" />
              </span>
            ) : (
              <Link
                href="/cart"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background hover:bg-secondary"
                aria-label="Cart"
              >
                <ShoppingBag className="h-4 w-4" />
                {itemCount > 0 ? (
                  <span
                    className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold text-white"
                    style={{ backgroundColor: theme.palette.primary }}
                  >
                    {itemCount}
                  </span>
                ) : null}
              </Link>
            )}
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background hover:bg-secondary md:hidden"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="border-t border-border px-4 py-4 md:hidden">
            <nav className="flex flex-col gap-3">
              {STOREFRONT_NAV_ITEMS.map((item) => (
                <StorefrontLink
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm font-medium text-foreground"
                >
                  {item.label}
                </StorefrontLink>
              ))}
            </nav>
          </div>
        ) : null}
      </header>

      <main>{children}</main>

      <footer
        className={`mt-16 border-t ${theme.borderColor}`}
        style={{ backgroundColor: theme.palette.surface }}
      >
        <div className="flex w-full flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-lg font-semibold" style={{ fontFamily: theme.displayFont }}>
              {store.business_name}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {getStorefrontUrl(store.slug)}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {STOREFRONT_FOOTER_LINKS.map((item) =>
              mode === "edit" ? (
                <span key={item.href}>{item.label}</span>
              ) : (
                <Link key={item.href} href={item.href} className="hover:text-foreground">
                  {item.label}
                </Link>
              ),
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
