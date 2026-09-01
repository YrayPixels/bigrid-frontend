"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { BizgridLogo } from "@/components/bizgrid-logo";
import { LandingNav } from "@/components/marketing/landing-nav";
import {
  LANDING_MOODS,
  LandingPreviewPrompt,
  type LandingMood,
} from "@/components/marketing/landing-preview-prompt";
import { PLATFORM_FAQS } from "@/lib/seo/platform-faqs";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    num: "01 / Website",
    title: "Build your store by chat",
    body: "Describe what you sell and the look you want. Bizgrid designs a storefront you can preview, refine in plain language, and publish when you’re ready.",
  },
  {
    num: "02 / Sell",
    title: "Catalog, orders & Paystack",
    body: "Add products and discounts, manage orders from one dashboard, and take payment with Paystack — earnings settle to your bank.",
  },
  {
    num: "03 / Grow",
    title: "Marketing that follows up",
    body: "Draft posts with AI, connect WhatsApp and social channels, and recover abandoned carts so more browsers become buyers.",
  },
] as const;

const PLANS = [
  {
    name: "Starter",
    price: "₦5,000",
    description: "Launch your first storefront and start selling.",
    features: [
      "14-day free trial",
      "2.5% service fee per online order",
      "1 storefront",
      "Unlimited payment processing",
      "SMS & WhatsApp units included",
    ],
    highlighted: false,
  },
  {
    name: "Growth",
    price: "₦15,000",
    description: "For brands selling more and needing a custom domain.",
    features: [
      "14-day free trial",
      "2.5% service fee per online order",
      "Up to 3 storefronts",
      "Unlimited payment processing",
      "1 custom domain",
    ],
    highlighted: true,
  },
  {
    name: "Scale",
    price: "₦30,000",
    description: "Higher volume, more stores, and room to expand.",
    features: [
      "14-day free trial",
      "2.5% service fee per online order",
      "Up to 10 storefronts",
      "Unlimited payment processing",
      "Up to 5 custom domains",
    ],
    highlighted: false,
  },
] as const;

const SHOWCASE_SHOPS = [
  {
    name: "Sable & Stitch",
    category: "FASHION",
    image: "/landing/shop-leather.jpg",
    alt: "Fashion storefront example",
  },
  {
    name: "Forma Studio",
    category: "HOME & OBJECTS",
    image: "/landing/shop-ceramic.jpg",
    alt: "Home goods storefront example",
  },
] as const;

export function LandingPage() {
  const [mood, setMood] = useState<LandingMood | null>(null);
  const [keepStore, setKeepStore] = useState<{ shopName: string } | null>(null);

  return (
    <div
      className={cn(
        "relative min-h-screen bg-canvas font-sans text-ink selection:bg-primary/20",
        keepStore && "pb-24 lg:pb-0",
      )}
    >
      {LANDING_MOODS.map((item) => (
        <div
          key={item.id}
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-500 ease-out"
          style={{
            opacity: mood?.id === item.id ? 1 : 0,
            background: `radial-gradient(ellipse 100% 80% at 50% 0%, ${item.wash} 0%, transparent 62%), radial-gradient(ellipse 80% 60% at 85% 85%, ${item.accent} 0%, transparent 55%), ${item.base}`,
          }}
        />
      ))}

      <LandingNav mood={mood} keepStore={keepStore} />

      <div className="relative z-10 pt-14 sm:pt-[4.5rem]">
        <main>
          <LandingPreviewPrompt
            mood={mood}
            onMoodChange={setMood}
            onKeepStoreChange={setKeepStore}
          />

        <section id="platform" className="mx-auto max-w-6xl border-t border-border px-4 py-16 sm:px-6 sm:py-24">
          <div className="mb-10 max-w-2xl sm:mb-14">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
              Everything to open and run your shop
            </h2>
            <p className="mt-4 text-lg text-ink-soft">
              From first draft to paid orders — without hiring a developer or stitching five tools together.
            </p>
          </div>
          <div className="grid gap-12 md:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.num} className="space-y-4">
                <span className="font-mono text-[10px] font-bold tracking-widest text-primary uppercase">
                  {feature.num}
                </span>
                <h3 className="font-display text-2xl font-semibold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-ink-soft">{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="showcase" className="relative overflow-hidden bg-gradient-hero py-16 text-white sm:py-24">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,oklch(1_0_0/0.1),transparent_45%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,oklch(0.35_0.08_260/0.3),transparent_50%)]" />
          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-8 flex flex-col gap-3 sm:mb-12 sm:gap-4 md:flex-row md:items-end md:justify-between">
              <h2 className="font-display text-3xl leading-none font-bold sm:text-5xl">Storefront examples</h2>
              <p className="max-w-[32ch] text-sm text-white/70">
                Fashion, beauty, home, and more — pick a template, then make it yours in chat.
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-2">
              {SHOWCASE_SHOPS.map((shop) => (
                <div key={shop.name} className="group">
                  <div className="aspect-video w-full overflow-hidden rounded-lg border border-white/10 bg-white/5 shadow-elevated">
                    <Image
                      src={shop.image}
                      alt={shop.alt}
                      width={1280}
                      height={832}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-display text-xl font-semibold">{shop.name}</span>
                    <span className="font-mono text-xs text-accent">{shop.category}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl border-t border-border px-4 py-16 sm:px-6 sm:py-24">
          <div className="mb-10 max-w-2xl sm:mb-14">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Simple pricing, 14-day trial</h2>
            <p className="mt-4 text-lg text-ink-soft">
              Every plan includes a 14-day free trial. A 2.5% service fee is added to online orders
              at checkout and paid by your customer. Upgrade for more storefronts, custom domains,
              and messaging units.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={
                  "flex flex-col rounded-2xl border p-6 " +
                  (plan.highlighted
                    ? "border-primary bg-card shadow-elevated"
                    : "border-border bg-canvas-raised")
                }
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-display text-xl font-semibold">{plan.name}</h3>
                  {plan.highlighted ? (
                    <span className="font-mono text-[10px] tracking-widest text-primary uppercase">Popular</span>
                  ) : null}
                </div>
                <p className="mt-4 font-display text-3xl font-bold tracking-tight">
                  {plan.price}
                  <span className="text-sm font-medium text-ink-soft">/mo</span>
                </p>
                <p className="mt-2 text-sm text-ink-soft">{plan.description}</p>
                <ul className="mt-6 flex-1 space-y-2 text-sm text-ink-soft">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <span className="text-primary" aria-hidden>
                        ·
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={
                    "mt-8 inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition " +
                    (plan.highlighted
                      ? "bg-primary text-primary-foreground hover:opacity-90"
                      : "border border-border bg-card hover:bg-muted")
                  }
                >
                  Start 14-day trial
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-6xl border-t border-border px-4 py-16 sm:px-6 sm:py-24">
          <div className="mb-8 max-w-2xl sm:mb-10">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Questions sellers ask</h2>
            <p className="mt-4 text-lg text-ink-soft">
              Straight answers about pricing, Paystack, WhatsApp, and launching without code.
            </p>
          </div>
          <div className="mx-auto grid max-w-3xl gap-3">
            {PLATFORM_FAQS.map((faq) => (
              <details
                key={faq.question}
                className="rounded-2xl border border-border bg-canvas-raised p-5"
              >
                <summary className="cursor-pointer font-medium">{faq.question}</summary>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-canvas-raised px-4 py-10 sm:px-6 sm:py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-10 md:flex-row md:gap-12">
          <div className="space-y-4">
            <BizgridLogo size={28} showWordmark wordmarkClassName="text-xl font-bold tracking-tight" />
            <p className="max-w-[34ch] text-sm text-ink-soft">
              AI storefronts for sellers who want to open shop online — without the agency bill.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-12 sm:grid-cols-4 sm:gap-10">
            <div className="space-y-3">
              <span className="font-mono text-[10px] text-ink-soft uppercase">Product</span>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/solutions/ai-website-builder" className="transition-colors hover:text-primary">
                    AI website builder
                  </Link>
                </li>
                <li>
                  <Link href="/solutions/whatsapp-commerce" className="transition-colors hover:text-primary">
                    WhatsApp commerce
                  </Link>
                </li>
                <li>
                  <a href="#pricing" className="transition-colors hover:text-primary">
                    Pricing
                  </a>
                </li>
                <li>
                  <Link href="/stores" className="transition-colors hover:text-primary">
                    Stores
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <span className="font-mono text-[10px] text-ink-soft uppercase">Industries</span>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/industries" className="transition-colors hover:text-primary">
                    All industries
                  </Link>
                </li>
                <li>
                  <Link href="/industries/furniture" className="transition-colors hover:text-primary">
                    Furniture
                  </Link>
                </li>
                <li>
                  <Link href="/industries/pharmacies" className="transition-colors hover:text-primary">
                    Pharmacies
                  </Link>
                </li>
                <li>
                  <Link href="/industries/beauty-brands" className="transition-colors hover:text-primary">
                    Cosmetics & Beauty
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <span className="font-mono text-[10px] text-ink-soft uppercase">Learn</span>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/academy" className="transition-colors hover:text-primary">
                    AI Business Academy
                  </Link>
                </li>
                <li>
                  <Link href="/compare/bizgrid-vs-shopify" className="transition-colors hover:text-primary">
                    Bizgrid vs Shopify
                  </Link>
                </li>
                <li>
                  <Link
                    href="/solutions/shopify-alternative-africa"
                    className="transition-colors hover:text-primary"
                  >
                    Shopify alternative
                  </Link>
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <span className="font-mono text-[10px] text-ink-soft uppercase">Company</span>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="mailto:support@bizgrid.ai" className="transition-colors hover:text-primary">
                    Contact
                  </a>
                </li>
                <li>
                  <Link href="/terms" className="transition-colors hover:text-primary">
                    Terms of service
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="transition-colors hover:text-primary">
                    Privacy policy
                  </Link>
                </li>
                <li>
                  <Link href="/delete-date" className="transition-colors hover:text-primary">
                    Delete your data
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mx-auto mt-12 border-t border-border pt-8 font-mono text-[10px] text-ink-soft">
          <span>© {new Date().getFullYear()} Bizgrid</span>
        </div>
      </footer>
      </div>
    </div>
  );
}
