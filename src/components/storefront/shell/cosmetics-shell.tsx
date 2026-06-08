"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { StorefrontLink } from "@/components/storefront/theme/storefront-link";
import { useCart } from "@/lib/storefront/cart-context";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { STOREFRONT_FOOTER_LINKS, STOREFRONT_NAV_ITEMS } from "@/lib/storefront/template";
import { cn } from "@/lib/utils";

const cosmeticsNavItems = [
  { href: "/products", label: "Product" },
  { href: "/about", label: "Features" },
  { href: "/faq", label: "Reviews" },
  { href: "/about", label: "About us" },
];

export function CosmeticsShell({ children }: { children: React.ReactNode }) {
  const { store } = useStorefront();
  const { itemCount } = useCart();
  const { theme, mode } = useStorefrontTheme();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className={`${theme.pageBg} min-h-screen ${theme.pageText}`}>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md">
        <div className="mx-auto grid min-h-20 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6">
          <StorefrontLink href="/" className="min-w-0">
            <span className="font-display text-lg font-bold uppercase tracking-[0.16em] text-[#748442]">
              {store.business_name}
              <sup className="ml-0.5 text-[8px] tracking-normal">TM</sup>
            </span>
          </StorefrontLink>

          <nav className="hidden items-center gap-11 lg:flex">
            {cosmeticsNavItems.map((item) => {
              const active =
                mode !== "edit" &&
                (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)));
              return (
                <StorefrontLink
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-[10px] font-bold tracking-[0.02em] text-[#172012] transition hover:text-[#748442]",
                    active ? "text-[#748442]" : "text-[#172012]/75",
                  )}
                >
                  {item.label}
                </StorefrontLink>
              );
            })}
          </nav>

          <div className="flex items-center justify-end gap-5 text-[#172012]">
            <button type="button" className="hidden place-items-center sm:grid" aria-label="Search">
              <Search className="h-4 w-4" />
            </button>
            {mode === "edit" ? (
              <span className="relative grid place-items-center">
                <ShoppingBag className="h-4 w-4" />
              </span>
            ) : (
              <Link href="/cart" className="relative grid place-items-center" aria-label="Cart">
                <ShoppingBag className="h-4 w-4" />
                {itemCount > 0 ? (
                  <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[#748442] px-1 text-[9px] font-bold text-white">
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
          <div className="border-t border-black/10 bg-white px-4 py-4 lg:hidden">
            <nav className="flex flex-col gap-2">
              {STOREFRONT_NAV_ITEMS.map((item) => (
                <StorefrontLink
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-2 text-sm font-semibold uppercase tracking-[0.1em]"
                >
                  {item.label}
                </StorefrontLink>
              ))}
            </nav>
          </div>
        ) : null}
      </header>

      <main>{children}</main>

      <footer className="border-t border-[#e2e6d9] bg-[#172012]">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 text-white sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-display text-xl font-semibold uppercase tracking-[0.12em]">
              {store.business_name}
            </div>
            <p className="mt-2 max-w-sm text-xs leading-5 text-white/65">
              Botanical skincare, clean formulas, and everyday glow essentials.
            </p>
          </div>
          <div className="flex flex-wrap gap-5 text-xs font-medium text-white/65">
            {STOREFRONT_FOOTER_LINKS.map((item) =>
              mode === "edit" ? (
                <span key={item.href}>{item.label}</span>
              ) : (
                <Link key={item.href} href={item.href} className="hover:text-white">
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
