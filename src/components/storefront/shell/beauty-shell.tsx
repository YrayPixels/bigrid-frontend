"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/storefront/cart-context";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { STOREFRONT_FOOTER_LINKS, STOREFRONT_NAV_ITEMS } from "@/lib/storefront/template";
import { StorefrontLink } from "@/components/storefront/theme/storefront-link";
import { cn } from "@/lib/utils";

export function BeautyShell({ children }: { children: React.ReactNode }) {
  const { store } = useStorefront();
  const { theme, mode } = useStorefrontTheme();
  const { itemCount } = useCart();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={`${theme.pageBg} min-h-screen ${theme.pageText}`}>
      <header
        className="sticky top-0 z-40 backdrop-blur-md"
        style={{ backgroundColor: `${theme.palette.accent}f2`, color: theme.palette.text }}
      >
        <div className="relative mx-auto grid min-h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6">
          <nav className="hidden items-center gap-12 lg:flex">
            {STOREFRONT_NAV_ITEMS.slice(1, 3).map((item) => (
              <StorefrontLink
                key={item.href}
                href={item.href}
                className="text-[9px] font-bold uppercase tracking-[0.12em] transition hover:opacity-70"
              >
                {item.label}
              </StorefrontLink>
            ))}
          </nav>

          <StorefrontLink href="/" className="flex min-w-0 items-center justify-center gap-2">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.business_name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span
                className="grid h-8 w-8 place-items-center rounded-full text-xs font-semibold"
                style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
              >
                {store.business_name.slice(0, 1)}
              </span>
            )}
            <span className="truncate font-display text-lg font-bold uppercase tracking-[0.22em]">
              {store.business_name}
            </span>
          </StorefrontLink>

          <div className="flex items-center justify-end gap-5">
            <nav className="hidden items-center gap-10 lg:flex">
              {STOREFRONT_NAV_ITEMS.slice(3, 5).map((item) => {
              const active =
                mode !== "edit" &&
                (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)));
              return (
                <StorefrontLink
                  key={item.href}
                  href={item.href}
                  className={cn(
                      "text-[9px] font-bold uppercase tracking-[0.12em] transition hover:opacity-70",
                      active ? "opacity-100" : "opacity-75",
                  )}
                >
                  {item.label}
                </StorefrontLink>
              );
            })}
            </nav>
            <button type="button" className="hidden place-items-center sm:grid" aria-label="Search">
              <Search className="h-3.5 w-3.5" />
            </button>
            {mode === "edit" ? (
              <span className="relative grid place-items-center">
                <ShoppingBag className="h-3.5 w-3.5" />
              </span>
            ) : (
              <Link href="/cart" className="relative grid place-items-center" aria-label="Cart">
                <ShoppingBag className="h-3.5 w-3.5" />
                {itemCount > 0 ? (
                  <span
                    className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold"
                    style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
                  >
                    {itemCount}
                  </span>
                ) : null}
              </Link>
            )}
            <button
              type="button"
              className="grid place-items-center lg:hidden"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div
            className="border-t px-4 py-4 lg:hidden"
            style={{ backgroundColor: theme.palette.accent, borderColor: `${theme.palette.text}1a` }}
          >
            <nav className="flex flex-col gap-2">
              {STOREFRONT_NAV_ITEMS.map((item) => (
                <StorefrontLink
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-full px-4 py-2 text-sm font-semibold"
                >
                  {item.label}
                </StorefrontLink>
              ))}
            </nav>
          </div>
        ) : null}
      </header>

      <main>{children}</main>

      <footer className={`border-t ${theme.borderColor}`} style={{ backgroundColor: theme.palette.text, color: theme.palette.background }}>
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-display text-xl font-semibold">{store.business_name}</div>
            <p className="mt-2 max-w-sm text-xs leading-5 opacity-65">
              Beauty rituals, curated essentials, and customer favourites in one polished storefront.
            </p>
          </div>
          <div className="flex flex-wrap gap-5 text-xs font-medium opacity-65">
            {STOREFRONT_FOOTER_LINKS.map((item) =>
              mode === "edit" ? (
                <span key={item.href}>{item.label}</span>
              ) : (
                <Link key={item.href} href={item.href} className="hover:opacity-100">
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
