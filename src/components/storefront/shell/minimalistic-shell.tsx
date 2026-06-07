"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/storefront/cart-context";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { STOREFRONT_FOOTER_LINKS, STOREFRONT_NAV_ITEMS } from "@/lib/storefront/template";
import { cn } from "@/lib/utils";

export function MinimalisticShell({ children }: { children: React.ReactNode }) {
  const { store } = useStorefront();
  const { mode } = useStorefrontTheme();
  const { itemCount } = useCart();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const NavLink = mode === "edit" ? "span" : Link;

  return (
    <div className="min-h-screen bg-[#fbfbdc] text-[#073e3f]">
      <header className="sticky top-0 z-40 border-b border-[#073e3f]/10 bg-[#fbfbdc]/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <NavLink
            {...(mode === "edit" ? {} : { href: "/" })}
            className="flex min-w-0 items-center gap-2"
          >
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.business_name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="h-3 w-3 rounded-full bg-[#073e3f]" />
            )}
            <span className="truncate text-lg font-bold tracking-tight">{store.business_name}</span>
          </NavLink>

          <nav className="hidden rounded-full bg-[#eff5c4]/80 p-1 lg:flex">
            {STOREFRONT_NAV_ITEMS.slice(0, 5).map((item) => (
              <NavLink
                key={item.href}
                {...(mode === "edit" ? {} : { href: item.href })}
                className={cn(
                  "rounded-full px-4 py-2 text-[11px] font-semibold transition",
                  mode !== "edit" &&
                    (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)))
                    ? "bg-[#073e3f] text-[#fbfbdc]"
                    : "text-[#073e3f]/75 hover:text-[#073e3f]",
                )}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="hidden h-9 w-9 place-items-center rounded-full bg-white/75 text-[#073e3f] shadow-sm sm:grid"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </button>
            {mode === "edit" ? (
              <span className="relative grid h-9 w-9 place-items-center rounded-full bg-white/75 text-[#073e3f] shadow-sm">
                <ShoppingBag className="h-4 w-4" />
              </span>
            ) : (
              <Link
                href="/cart"
                className="relative grid h-9 w-9 place-items-center rounded-full bg-white/75 text-[#073e3f] shadow-sm"
                aria-label="Cart"
              >
                <ShoppingBag className="h-4 w-4" />
                {itemCount > 0 ? (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#073e3f] px-1 text-[9px] font-bold text-[#fbfbdc]">
                    {itemCount}
                  </span>
                ) : null}
              </Link>
            )}
            <span className="hidden items-center gap-1 rounded-full bg-[#073e3f] px-3 py-2 text-[11px] font-semibold text-[#fbfbdc] sm:inline-flex">
              Sign in
              <UserRound className="h-3.5 w-3.5" />
            </span>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-full bg-white/75 text-[#073e3f] shadow-sm lg:hidden"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {mobileOpen ? (
          <div className="border-t border-[#073e3f]/10 bg-[#fbfbdc] px-4 py-4 lg:hidden">
            <nav className="flex flex-col gap-2">
              {STOREFRONT_NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.href}
                  {...(mode === "edit"
                    ? {}
                    : { href: item.href, onClick: () => setMobileOpen(false) })}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-[#073e3f]"
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        ) : null}
      </header>

      <main>{children}</main>

      <footer className="border-t border-[#073e3f]/10 bg-[#fbfbdc]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#073e3f]" />
            <span className="font-bold">{store.business_name}</span>
          </div>
          <div className="flex flex-wrap gap-5 text-xs font-medium text-[#073e3f]/70">
            {STOREFRONT_FOOTER_LINKS.map((item) =>
              mode === "edit" ? (
                <span key={item.href}>{item.label}</span>
              ) : (
                <Link key={item.href} href={item.href} className="hover:text-[#073e3f]">
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
