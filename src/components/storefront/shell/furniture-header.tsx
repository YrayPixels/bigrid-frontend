"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Search, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/storefront/cart-context";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { furnitureHardwareNavItems } from "@/lib/storefront/furniture-hardware-defaults";
import { StorefrontCustomerAccountControl } from "@/components/storefront/shell/storefront-customer-account-control";
import { StorefrontLink } from "@/components/storefront/theme/storefront-link";
import { cn } from "@/lib/utils";

const furnitureNavItems = [{ label: "Home", href: "/" }, ...furnitureHardwareNavItems];

export function FurnitureHeader() {
  const { store } = useStorefront();
  const { mode } = useStorefrontTheme();
  const { itemCount } = useCart();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const brandLabel = store.business_name.toUpperCase().slice(0, 5).padEnd(5, " ");

  return (
    <header className="mx-3 mt-3 flex min-h-14 flex-col rounded-2xl bg-[#1c1812] px-4 text-[#f7f3eb] md:mx-6 md:mt-6 md:px-6">
      <div className="flex h-14 items-center justify-between gap-4">
        <button
          type="button"
          aria-label="Menu"
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#f7f3eb]/30 hover:bg-[#f7f3eb]/10 lg:hidden"
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
        <nav className="hidden min-w-0 flex-1 items-center gap-6 text-sm lg:flex">
          {furnitureHardwareNavItems.map((item) => {
            const active =
              mode !== "edit" &&
              (pathname === item.href || pathname.startsWith(`${item.href}/`));
            return (
              <StorefrontLink
                key={item.href}
                href={item.href}
                className={cn("transition hover:opacity-80", active ? "opacity-100" : "opacity-70")}
              >
                {item.label}
              </StorefrontLink>
            );
          })}
        </nav>
        <StorefrontLink
          href="/"
          className="shrink-0 text-lg font-semibold tracking-[0.35em] md:text-xl"
          style={{ fontFamily: "var(--font-modern-sans)" }}
        >
          {brandLabel}
        </StorefrontLink>
        <div className="flex flex-1 items-center justify-end gap-2 text-sm md:gap-4">
          <button type="button" className="hidden items-center gap-1.5 opacity-90 hover:opacity-100 md:flex">
            <span className="inline-block h-3 w-4 rounded-sm bg-gradient-to-b from-red-500 via-white to-blue-600" />
            USD $ <ChevronDown className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Search"
            className="flex size-9 items-center justify-center rounded-full hover:bg-[#f7f3eb]/10"
          >
            <Search className="size-4" />
          </button>
          <StorefrontCustomerAccountControl
            variant="icon"
            className="hidden size-9 items-center justify-center rounded-full text-[#f7f3eb] hover:bg-[#f7f3eb]/10 sm:inline-flex"
            iconClassName="size-4"
          />
          {mode === "edit" ? (
            <span className="relative flex size-9 items-center justify-center rounded-full">
              <ShoppingBag className="size-4" />
            </span>
          ) : (
            <Link
              href="/cart"
              className="relative flex size-9 items-center justify-center rounded-full hover:bg-[#f7f3eb]/10"
              aria-label="Cart"
            >
              <ShoppingBag className="size-4" />
              {itemCount > 0 ? (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#c43d2f] px-1 text-[9px] font-bold">
                  {itemCount}
                </span>
              ) : null}
            </Link>
          )}
        </div>
      </div>
      {mobileOpen ? (
        <nav className="border-t border-[#f7f3eb]/15 py-4 lg:hidden">
          <div className="flex flex-col gap-2">
            {furnitureNavItems.map((item) => (
              <StorefrontLink
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl px-3 py-2 text-sm hover:bg-[#f7f3eb]/10"
              >
                {item.label}
              </StorefrontLink>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
