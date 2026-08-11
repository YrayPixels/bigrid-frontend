"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/storefront/cart-context";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import {
  hairFashionFooterColumns,
  hairFashionNavItems,
} from "@/lib/storefront/hair-fashion-defaults";
import { StorefrontCustomerAccountControl } from "@/components/storefront/shell/storefront-customer-account-control";
import { StorefrontLink } from "@/components/storefront/theme/storefront-link";
import { cn } from "@/lib/utils";

export function HairFashionShell({ children }: { children: React.ReactNode }) {
  const { store, storefront } = useStorefront();
  const { mode } = useStorefrontTheme();
  const { itemCount } = useCart();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navLinks = storefront.navigation?.length ? storefront.navigation : [...hairFashionNavItems];

  return (
    <div className="min-h-screen bg-[#fdf8f3] text-[#1a1410]">
      <header className="border-b border-[#ede4d8] bg-[#fdf8f3]">
        <div className="mx-auto grid max-w-[1400px] grid-cols-3 items-center px-6 py-5 lg:px-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="grid place-items-center lg:hidden"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
            <nav className="hidden items-center gap-8 text-[0.72rem] font-medium uppercase tracking-[0.28em] lg:flex">
              <StorefrontLink href={navLinks[0]?.href ?? "/products"} className="hover:opacity-60">
                {navLinks[0]?.label ?? "Shop"}
              </StorefrontLink>
            </nav>
          </div>
          <StorefrontLink href="/" className="col-start-2 flex flex-col items-center leading-none">
            <span className="font-[family-name:var(--font-script)] text-4xl text-[#1a1410]">
              {store.business_name.split(" ")[0] ?? "Lush"}
            </span>
            <span className="text-[0.6rem] font-medium tracking-[0.4em]">
              {store.business_name.split(" ").slice(1).join(" ") || "ROOTS"}
            </span>
          </StorefrontLink>
          <div className="flex items-center justify-end gap-6 text-[0.72rem] font-medium uppercase tracking-[0.28em]">
            {navLinks.slice(1).map((link) => (
              <StorefrontLink key={link.label} href={link.href} className="hidden hover:opacity-60 lg:inline">
                {link.label}
              </StorefrontLink>
            ))}
            <div className="flex items-center gap-4 pl-2">
              {mode === "edit" ? (
                <span className="hover:opacity-60">
                  <ShoppingBag className="h-4 w-4" />
                </span>
              ) : (
                <Link href="/cart" className="relative hover:opacity-60" aria-label="Cart">
                  <ShoppingBag className="h-4 w-4" />
                  {itemCount > 0 ? (
                    <span className="absolute -right-2 -top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[#1a1410] px-1 text-[9px] font-bold text-white">
                      {itemCount}
                    </span>
                  ) : null}
                </Link>
              )}
              <StorefrontCustomerAccountControl
                variant="icon"
                className="hidden sm:inline-flex"
                iconClassName="h-4 w-4"
              />
              <button type="button" aria-label="Search" className="hover:opacity-60">
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        {mobileOpen ? (
          <nav className="border-t border-[#ede4d8] px-6 py-4 lg:hidden">
            <div className="flex flex-col gap-2">
              {[{ label: "Home", href: "/" }, ...navLinks].map((item) => {
                const active =
                  mode !== "edit" &&
                  (pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href)));
                return (
                  <StorefrontLink
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "rounded px-2 py-2 text-sm uppercase tracking-[0.2em]",
                      active ? "font-semibold" : "opacity-70",
                    )}
                  >
                    {item.label}
                  </StorefrontLink>
                );
              })}
            </div>
          </nav>
        ) : null}
      </header>

      <main>{children}</main>

      <footer className="bg-[#1a1410] pt-16 pb-10 text-white/80">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-6 md:grid-cols-4 lg:px-10">
          <div>
            <div className="flex flex-col leading-none">
              <span className="font-[family-name:var(--font-script)] text-4xl text-white">
                {store.business_name.split(" ")[0] ?? "Lush"}
              </span>
              <span className="text-[0.6rem] font-medium tracking-[0.4em] text-white">
                {store.business_name.split(" ").slice(1).join(" ") || "ROOTS"}
              </span>
            </div>
            <p className="mt-6 text-xs leading-relaxed text-white/60">
              Premium virgin hair extensions and care crafted exclusively for natural textures.
            </p>
          </div>
          {hairFashionFooterColumns.map((column) => (
            <div key={column.title}>
              <h4 className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-white">{column.title}</h4>
              <ul className="mt-5 space-y-3 text-sm text-white/60">
                {column.links.map((item) =>
                  mode === "edit" ? (
                    <li key={item.href}>{item.label}</li>
                  ) : (
                    <li key={item.href}>
                      <Link href={item.href} className="hover:text-white">
                        {item.label}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto mt-12 flex max-w-[1200px] flex-col justify-between gap-3 border-t border-white/10 px-6 pt-8 text-xs text-white/50 md:flex-row lg:px-10">
          <span>© {new Date().getFullYear()} {store.business_name}. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
