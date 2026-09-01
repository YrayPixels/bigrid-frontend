import Link from "next/link";
import type { ReactNode } from "react";
import { BizgridLogo } from "@/components/bizgrid-logo";

const NAV_LINKS = [
  { href: "/solutions/ai-website-builder", label: "Platform" },
  { href: "/industries", label: "Industries" },
  { href: "/academy", label: "Academy" },
  { href: "/stores", label: "Stores" },
  { href: "/compare/bizgrid-vs-shopify", label: "Compare" },
] as const;

export function MarketingChrome({
  children,
  currentPath,
}: {
  children: ReactNode;
  currentPath?: string;
}) {
  return (
    <div className="min-h-screen bg-canvas text-ink font-sans selection:bg-primary/20">
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-border bg-canvas/80 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center">
            <BizgridLogo size={36} showWordmark wordmarkClassName="text-2xl font-bold tracking-tight" />
          </Link>
          <div className="hidden gap-6 text-sm font-medium text-ink-soft lg:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  currentPath === link.href
                    ? "text-ink"
                    : "transition-colors hover:text-ink"
                }
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-soft transition hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </nav>

      {children}

      <footer className="border-t border-border bg-canvas-raised px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-12 md:flex-row">
          <div className="space-y-4">
            <BizgridLogo size={28} showWordmark wordmarkClassName="text-xl font-bold tracking-tight" />
            <p className="max-w-[34ch] text-sm text-ink-soft">
              AI storefronts for sellers who want to open shop online — without the agency bill.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-12 sm:grid-cols-4 sm:gap-10">
            <FooterCol
              title="Solutions"
              links={[
                { href: "/solutions/ai-website-builder", label: "AI website builder" },
                { href: "/solutions/ecommerce-website-builder", label: "Ecommerce builder" },
                { href: "/solutions/whatsapp-commerce", label: "WhatsApp commerce" },
                { href: "/solutions/paystack-store-builder", label: "Paystack stores" },
              ]}
            />
            <FooterCol
              title="Industries"
              links={[
                { href: "/industries", label: "All industries" },
                { href: "/industries/fashion-stores", label: "Fashion" },
                { href: "/industries/furniture", label: "Furniture" },
                { href: "/industries/pharmacies", label: "Pharmacies" },
                { href: "/industries/beauty-brands", label: "Cosmetics & Beauty" },
              ]}
            />
            <FooterCol
              title="Learn"
              links={[
                { href: "/academy", label: "AI Business Academy" },
                { href: "/compare/bizgrid-vs-shopify", label: "Bizgrid vs Shopify" },
                { href: "/solutions/shopify-alternative-africa", label: "Shopify alternative" },
                { href: "/stores", label: "Browse stores" },
              ]}
            />
            <FooterCol
              title="Company"
              links={[
                { href: "/login", label: "Log in" },
                { href: "/signup", label: "Get started" },
                { href: "mailto:support@bizgrid.ai", label: "Contact" },
                { href: "/terms", label: "Terms" },
                { href: "/privacy", label: "Privacy" },
                { href: "/delete-date", label: "Delete data" },
              ]}
            />
          </div>
        </div>
        <div className="mx-auto mt-12 border-t border-border pt-8 font-mono text-[10px] text-ink-soft">
          <span>© {new Date().getFullYear()} Bizgrid</span>
        </div>
      </footer>
    </div>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="space-y-3">
      <span className="font-mono text-[10px] text-ink-soft uppercase">{title}</span>
      <ul className="space-y-2 text-sm">
        {links.map((link) => (
          <li key={link.href}>
            {link.href.startsWith("mailto:") ? (
              <a href={link.href} className="transition-colors hover:text-primary">
                {link.label}
              </a>
            ) : (
              <Link href={link.href} className="transition-colors hover:text-primary">
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
