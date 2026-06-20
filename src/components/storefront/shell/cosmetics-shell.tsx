"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { StorefrontLink } from "@/components/storefront/theme/storefront-link";
import { useCart } from "@/lib/storefront/cart-context";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { STOREFRONT_FOOTER_LINKS } from "@/lib/storefront/template";
import { cn } from "@/lib/utils";

const defaultCosmeticsNavItems = [
  { href: "/products", label: "Product" },
  { href: "/", label: "Features" },
  { href: "/faq", label: "Reviews" },
  { href: "/about", label: "About us" },
];

export function CosmeticsShell({ children }: { children: React.ReactNode }) {
  const { store, storefront } = useStorefront();
  const { itemCount } = useCart();
  const { theme, mode } = useStorefrontTheme();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const brandName = store.business_name;
  const navItems = storefront.navigation?.length ? storefront.navigation : defaultCosmeticsNavItems;

  return (
    <div className={`${theme.pageBg} min-h-screen ${theme.pageText}`}>
      <header
        className="sticky top-0 z-40 backdrop-blur-md"
        style={{ backgroundColor: `${theme.palette.background}f2` }}
      >
        <div className="mx-auto grid min-h-20 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6">
          <StorefrontLink href="/" className="min-w-0">
            <span
              className="font-display text-lg font-bold uppercase tracking-[0.16em]"
              style={{ color: theme.palette.primary }}
            >
              {brandName}
              <sup className="ml-0.5 text-[8px] tracking-normal">TM</sup>
            </span>
          </StorefrontLink>

          <nav className="hidden items-center gap-11 lg:flex">
            {navItems.map((item, index) => {
              const active =
                mode !== "edit" &&
                (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)));
              return (
                <StorefrontLink
                  key={`${item.href}-${item.label}`}
                  href={item.href}
                  className={cn(
                    "text-[10px] font-bold tracking-[0.02em] text-[#172012] transition hover:text-[#748442]",
                    active ? "" : "opacity-75",
                  )}
                  style={{ color: active ? theme.palette.primary : theme.palette.text }}
                >
                  {item.label}
                </StorefrontLink>
              );
            })}
          </nav>

          <div className="flex items-center justify-end gap-5" style={{ color: theme.palette.text }}>
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
            className="border-t border-black/10 px-4 py-4 lg:hidden"
            style={{ backgroundColor: theme.palette.background }}
          >
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => (
                <StorefrontLink
                  key={`mobile-${item.href}-${item.label}`}
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

      <footer className="border-t" style={{ borderColor: theme.palette.border, backgroundColor: theme.palette.text }}>
        <div
          className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between"
          style={{ color: theme.palette.background }}
        >
          <div>
            <div className="font-display text-xl font-semibold uppercase tracking-[0.12em]">
              {brandName}
            </div>
            <p className="mt-2 max-w-sm text-xs leading-5 opacity-65">
              {store.description || "Botanical skincare, clean formulas, and everyday glow essentials."}
            </p>
          </div>
          <div className="flex flex-wrap gap-5 text-xs font-medium opacity-65">
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
