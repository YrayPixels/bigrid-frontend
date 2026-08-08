"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/storefront/cart-context";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { StorefrontFaqSection } from "@/components/storefront/pages/storefront-faq-section";
import { STOREFRONT_FOOTER_LINKS, STOREFRONT_NAV_ITEMS } from "@/lib/storefront/template";
import { StorefrontLink } from "@/components/storefront/theme/storefront-link";
import { EditableText } from "@/components/storefront/theme/editable-text";
import { getHomeBlockProps, homeBlockPath } from "@/lib/storefront/home-block-content";
import { getStorefrontUrl } from "@/lib/store-host";
import { cn } from "@/lib/utils";

export function FashionShell({ children }: { children: React.ReactNode }) {
  const { store, storefront } = useStorefront();
  const { theme, mode } = useStorefrontTheme();
  const { itemCount } = useCart();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const showProductsFaq = /\/products\/?$/.test(pathname);
  const announcement =
    getHomeBlockProps<{ announcement?: string }>(storefront, "hero-main").announcement ||
    "Free shipping on orders over 100";

  return (
    <div className={`${theme.pageBg} min-h-screen ${theme.pageText}`}>
      <header
        className={`sticky top-0 z-40 border-b ${theme.borderColor} backdrop-blur`}
        style={{ backgroundColor: `${theme.palette.background}f2` }}
      >
        <div
          className="px-4 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em]"
          style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
        >
          <EditableText
            path={homeBlockPath("hero-main", "announcement")}
            value={announcement}
            as="span"
            className="text-inherit"
            placeholder="Announcement"
          />
        </div>
        <div className="grid min-h-14 grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-5">
            <button
              type="button"
              className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em]"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              <span className="hidden sm:inline">Menu</span>
            </button>
            <nav className="hidden items-center gap-5 lg:flex">
              {STOREFRONT_NAV_ITEMS.map((item) => (
                <StorefrontLink
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "text-[11px] font-bold uppercase tracking-[0.12em] transition-colors",
                    mode === "edit"
                      ? "text-[#555555]"
                      : pathname === item.href ||
                          (item.href !== "/" && pathname.startsWith(item.href))
                        ? "text-[#111111]"
                        : "text-[#555555]",
                  )}
                >
                  {item.label}
                </StorefrontLink>
              ))}
            </nav>
          </div>

          <StorefrontLink
            href="/"
            className="text-xl font-bold uppercase tracking-[0.18em]"
            style={{ fontFamily: theme.displayFont }}
          >
            {store.business_name}
          </StorefrontLink>

          <div className="flex items-center justify-end gap-4">
            {mode === "edit" ? (
              <span className="text-[11px] font-bold uppercase tracking-[0.12em]">
                Cart ({itemCount})
              </span>
            ) : (
              <Link
                href="/cart"
                className="relative text-[11px] font-bold uppercase tracking-[0.12em]"
                aria-label="Cart"
              >
                Cart ({itemCount})
                {itemCount > 0 ? (
                  <span
                    className="absolute -right-3 -top-2 h-2 w-2 rounded-full"
                    style={{ backgroundColor: theme.palette.accent }}
                  />
                ) : null}
              </Link>
            )}
          </div>
        </div>

        {mobileOpen ? (
          <div
            className={`border-t ${theme.borderColor} px-4 py-4 lg:hidden`}
            style={{ backgroundColor: theme.palette.background }}
          >
            <nav className="flex flex-col gap-3">
              {STOREFRONT_NAV_ITEMS.map((item) => (
                <StorefrontLink
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm font-bold uppercase tracking-[0.12em]"
                >
                  {item.label}
                </StorefrontLink>
              ))}
            </nav>
          </div>
        ) : null}
      </header>

      <main>{children}</main>

      {showProductsFaq ? <StorefrontFaqSection faqPage={storefront.pages?.faq} /> : null}

      <footer
        className="px-4 py-10 sm:px-6"
        style={{ backgroundColor: theme.palette.primary, color: theme.palette.background }}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div
              className="text-xl font-bold uppercase tracking-[0.18em]"
              style={{ fontFamily: theme.displayFont }}
            >
              {store.business_name}
            </div>
            <p className="mt-2 text-sm text-white/65">
              {getStorefrontUrl(store.slug)}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-white/65">
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
