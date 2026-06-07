"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/storefront/cart-context";
import { useStorefront } from "@/lib/storefront/store-context";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
];

const footerLinks = [
  { href: "/privacy-policy", label: "Privacy policy" },
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
];

export function StoreShell({ children }: { children: React.ReactNode }) {
  const { store, storefront } = useStorefront();
  const { itemCount } = useCart();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const brandColor = store.brand_color;
  const chosenTemplate = store.storefront_template_id;
  const templateId =
    storefront.template?.id ??
    (chosenTemplate && chosenTemplate !== "ai_pick" ? chosenTemplate : "classic");

  if (templateId === "fashion_lookbook") {
    const fashionNavItems = [
      { href: "/", label: "Home" },
      { href: "/products", label: "Products" },
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/faq", label: "FAQ" },
    ];

    return (
      <div className="min-h-screen bg-white text-[#111111]">
        <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur">
          <div className="bg-[#050505] px-4 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
            Free shipping on orders over 100
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
                {fashionNavItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      "text-[11px] font-bold uppercase tracking-[0.12em] transition-colors hover:text-[#111111]",
                      pathname === item.href ||
                        (item.href !== "/" && pathname.startsWith(item.href))
                        ? "text-[#111111]"
                        : "text-[#555555]",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <Link
              href="/"
              className="[font-family:var(--font-editorial)] text-xl font-bold uppercase tracking-[0.18em]"
            >
              {store.business_name}
            </Link>

            <div className="flex items-center justify-end gap-4">
              <Link
                href="/cart"
                className="relative text-[11px] font-bold uppercase tracking-[0.12em]"
                aria-label="Cart"
              >
                Cart ({itemCount})
                {itemCount > 0 ? (
                  <span
                    className="absolute -right-3 -top-2 h-2 w-2 rounded-full"
                    style={{ backgroundColor: brandColor }}
                  />
                ) : null}
              </Link>
            </div>
          </div>

          {mobileOpen ? (
            <div className="border-t border-black/10 bg-white px-4 py-4 lg:hidden">
              <nav className="flex flex-col gap-3">
                {fashionNavItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-sm font-bold uppercase tracking-[0.12em]"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          ) : null}
        </header>

        <main>{children}</main>

        <footer className="bg-[#050505] px-4 py-10 text-white sm:px-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="[font-family:var(--font-editorial)] text-xl font-bold uppercase tracking-[0.18em]">
                {store.business_name}
              </div>
              <p className="mt-2 text-sm text-white/65">
                {store.subdomain_host ?? store.primary_domain}
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-white/65">
              {footerLinks.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-white">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            {store.logo_url ? (
              <img
                src={store.logo_url}
                alt={store.business_name}
                className="h-9 w-9 rounded-lg object-cover"
              />
            ) : (
              <div
                className="grid h-9 w-9 place-items-center rounded-lg text-sm font-bold text-white"
                style={{ backgroundColor: brandColor }}
              >
                {store.business_name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <span className="truncate font-display text-lg font-semibold">
              {store.business_name}
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-foreground",
                  pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href))
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/cart"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background hover:bg-secondary"
              aria-label="Cart"
            >
              <ShoppingBag className="h-4 w-4" />
              {itemCount > 0 ? (
                <span
                  className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold text-white"
                  style={{ backgroundColor: brandColor }}
                >
                  {itemCount}
                </span>
              ) : null}
            </Link>
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
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-sm font-medium text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        ) : null}
      </header>

      <main>{children}</main>

      <footer className="mt-16 border-t border-border bg-card">
        <div className="flex w-full flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="font-display text-lg font-semibold">{store.business_name}</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {store.subdomain_host ?? store.primary_domain}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {footerLinks.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
