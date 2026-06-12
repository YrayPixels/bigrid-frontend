import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Sparkles, Store, Wand2, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Storehaus - AI-powered storefronts for small businesses",
  description:
    "Tell us about your business. Our AI builds your storefront, writes your copy, and handles the rest. Launch in minutes, not weeks.",
  openGraph: {
    title: "Storehaus - AI-powered storefronts",
    description: "Tell us about your business. Our AI builds your storefront in minutes.",
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-canvas/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-hero text-primary-foreground">
              <Store className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">Storehaus</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-md px-4 py-2 text-sm font-medium text-ink-soft hover:text-ink"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1 rounded-md bg-ink px-4 py-2 text-sm font-medium text-background hover:bg-ink/90"
            >
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh opacity-80" />
        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-28 sm:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-ink-soft shadow-soft">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Phase 1 MVP - AI Storefront Generator
            </span>
            <h1 className="mt-6 flex flex-col items-center gap-1 font-display text-5xl font-bold leading-[1.1] tracking-tight sm:gap-2 sm:text-6xl">
              <span>Launch your online store.</span>
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                The AI does the rest.
              </span>
            </h1>
            <p className="mt-6 text-lg text-ink-soft">
              Tell us about your business in 60 seconds. We generate your homepage, write your
              marketing copy, and set up your storefront automatically. No designers, no developers,
              no hassle.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-elevated hover:opacity-90"
              >
                Create your store <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-6 py-3 text-sm font-semibold text-ink hover:bg-secondary"
              >
                I already have an account
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-canvas-raised">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-20 sm:grid-cols-3">
          <Feature
            icon={<Wand2 className="h-5 w-5" />}
            title="AI website builder"
            body="Hero, about, value props, and SEO metadata generated from your business details."
          />
          <Feature
            icon={<Zap className="h-5 w-5" />}
            title="Live in minutes"
            body="No drag-and-drop builders. Sign up, answer a few questions, and your store is ready."
          />
          <Feature
            icon={<Store className="h-5 w-5" />}
            title="Built for merchants"
            body="Products, payments, delivery and analytics are on the roadmap, all in one place."
          />
        </div>
      </section>

      <footer className="border-t border-border/60 bg-canvas">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8 text-xs text-ink-soft">
          <span>© {new Date().getFullYear()} Storehaus</span>
          <span>MVP preview - running on mock API</span>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
      <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-ink-soft">{body}</p>
    </div>
  );
}
