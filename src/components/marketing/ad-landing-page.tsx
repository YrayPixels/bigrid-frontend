"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight, Check } from "lucide-react";
import { BizgridLogo } from "@/components/bizgrid-logo";
import { AD_SIGNUP_HREF } from "@/lib/marketing/ad-signup";
import { trackPlatformEvent } from "@/lib/analytics/platform-events";

const BENEFITS = [
  {
    title: "Build by chat",
    body: "Describe what you sell. Bizgrid designs your storefront — homepage, products, and checkout — in minutes.",
  },
  {
    title: "Sell with Paystack",
    body: "Take payments online, manage orders from one dashboard, and get paid to your bank.",
  },
  {
    title: "Grow on WhatsApp",
    body: "Draft posts with AI, share your store link, and recover abandoned carts automatically.",
  },
] as const;

const STEPS = [
  { num: "1", title: "Start your free trial", body: "Create an account in under a minute — no card required." },
  { num: "2", title: "Describe your shop", body: "Tell us what you sell. AI builds your storefront while you watch." },
  { num: "3", title: "Publish and sell", body: "Add products, connect Paystack, and share your store link." },
] as const;

const PREVIEW_IMAGES = [
  { src: "/landing/preview-candle.jpg", alt: "Candle shop storefront" },
  { src: "/landing/preview-perfume.jpg", alt: "Beauty storefront" },
  { src: "/landing/preview-gallery.jpg", alt: "Product gallery storefront" },
] as const;

const TRUST_POINTS = ["14-day free trial", "No card required", "Paystack payments", "Cancel anytime"] as const;

function trackSignupClick(source: "hero" | "nav" | "sticky" | "footer") {
  trackPlatformEvent("ad_signup_clicked", { source, once: false });
}

export function AdLandingPage() {
  useEffect(() => {
    trackPlatformEvent("ad_landing_viewed", { source: "start" });
  }, []);

  return (
    <div className="relative min-h-screen bg-canvas font-sans text-ink selection:bg-primary/20">
      <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(oklch(0.18_0.03_200/0.03)_1px,transparent_1px),linear-gradient(90deg,oklch(0.18_0.03_200/0.03)_1px,transparent_1px)] bg-[length:48px_48px]" />

      <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/30 bg-canvas/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/" className="flex min-w-0 items-center">
            <BizgridLogo size={32} showWordmark wordmarkClassName="text-xl font-bold tracking-tight" />
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <Link
              href="/login"
              className="px-2 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink sm:px-4"
            >
              Log in
            </Link>
            <Link
              href={AD_SIGNUP_HREF}
              onClick={() => trackSignupClick("nav")}
              className="rounded-full bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90 sm:px-5"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-[4.5rem]">
        {/* Hero */}
        <section className="mx-auto max-w-5xl px-4 pb-12 pt-8 text-center sm:px-6 sm:pb-16 sm:pt-12">
          <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-primary uppercase sm:text-[11px]">
            14-day free trial · No card required
          </p>
          <h1 className="font-display mx-auto mt-3 max-w-3xl text-[1.85rem] leading-[1.08] font-bold tracking-tight text-balance sm:mt-4 sm:text-5xl md:text-[3.25rem]">
            Open your online store in minutes — powered by AI
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-pretty text-ink-soft sm:mt-4 sm:text-base md:text-lg">
            Sign up free, describe what you sell, and Bizgrid builds your storefront with Paystack
            checkout, order management, and WhatsApp tools built in.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:mt-10">
            <Link
              href={AD_SIGNUP_HREF}
              onClick={() => trackSignupClick("hero")}
              className="inline-flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-glow transition hover:opacity-90 sm:w-auto sm:min-w-[240px]"
            >
              Start 14-day free trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/#try-preview"
              className="text-sm font-medium text-ink-soft transition hover:text-primary"
            >
              Or try a free preview first — no account needed
            </Link>
          </div>

          <ul className="mx-auto mt-6 flex max-w-lg flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:mt-8">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-1.5 text-xs text-ink-soft sm:text-sm">
                <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
        </section>

        {/* Preview strip */}
        <section className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex items-end justify-center gap-2 sm:gap-4">
            {PREVIEW_IMAGES.map((preview, index) => (
              <div
                key={preview.src}
                className="relative w-[30%] max-w-[200px] origin-bottom overflow-hidden rounded-lg border border-border bg-card shadow-elevated sm:rounded-xl"
                style={{
                  transform: `rotate(${index === 0 ? -4 : index === 2 ? 4 : 0}deg) translateY(${index === 1 ? -8 : 0}px)`,
                }}
              >
                <Image
                  src={preview.src}
                  alt={preview.alt}
                  width={400}
                  height={260}
                  className="aspect-[5/3] w-full object-cover"
                  priority={index === 1}
                />
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-ink-soft">
            Real storefronts built with Bizgrid — fashion, beauty, home, and more
          </p>
        </section>

        {/* Benefits */}
        <section className="mx-auto max-w-5xl border-t border-border px-4 py-14 sm:px-6 sm:py-20">
          <div className="grid gap-10 sm:grid-cols-3 sm:gap-8">
            {BENEFITS.map((benefit) => (
              <div key={benefit.title} className="text-center sm:text-left">
                <h2 className="font-display text-lg font-semibold sm:text-xl">{benefit.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{benefit.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border bg-canvas-raised/50 px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display text-center text-2xl font-bold tracking-tight sm:text-3xl">
              Up and selling in three steps
            </h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-3">
              {STEPS.map((step) => (
                <div key={step.num} className="text-center">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-bold text-primary">
                    {step.num}
                  </span>
                  <h3 className="font-display mt-3 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-ink-soft">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing teaser */}
        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="rounded-2xl border border-primary/30 bg-card p-6 text-center shadow-elevated sm:p-10">
            <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">
              Simple pricing
            </p>
            <h2 className="font-display mt-2 text-2xl font-bold sm:text-3xl">
              From ₦5,000/mo after your trial
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
              Every plan includes a 14-day free trial, Paystack checkout, and AI storefront builder.
              A 2.5% service fee applies to online orders at checkout.
            </p>
            <Link
              href={AD_SIGNUP_HREF}
              onClick={() => trackSignupClick("footer")}
              className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-8 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Start 14-day free trial
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border px-4 py-8 text-center sm:px-6">
        <p className="text-xs text-ink-soft">
          © {new Date().getFullYear()} Bizgrid ·{" "}
          <Link href="/terms" className="hover:text-primary">
            Terms
          </Link>
          {" · "}
          <Link href="/privacy" className="hover:text-primary">
            Privacy
          </Link>
        </p>
      </footer>

      {/* Sticky mobile CTA */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-canvas/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_oklch(0.2_0.03_200/0.1)] backdrop-blur-md sm:hidden">
        <Link
          href={AD_SIGNUP_HREF}
          onClick={() => trackSignupClick("sticky")}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground"
        >
          Start 14-day free trial
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
