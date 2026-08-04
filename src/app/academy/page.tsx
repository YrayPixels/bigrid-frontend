import type { Metadata } from "next";
import Link from "next/link";
import { MarketingChrome } from "@/components/seo/marketing-chrome";
import { JsonLd } from "@/lib/seo/json-ld";
import { ACADEMY_CATEGORIES, ACADEMY_GUIDES } from "@/lib/seo/pages";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/site-seo";

export const metadata: Metadata = {
  title: "AI Business Academy | Bizgrid",
  description:
    "Practical guides for African sellers: starting online, Paystack payments, WhatsApp selling, and AI for small businesses.",
  alternates: { canonical: "/academy" },
  openGraph: {
    title: "AI Business Academy | Bizgrid",
    description:
      "Practical guides for African sellers: starting online, Paystack payments, WhatsApp selling, and AI for small businesses.",
    url: "/academy",
    type: "website",
  },
};

export default function AcademyIndexPage() {
  return (
    <MarketingChrome currentPath="/academy">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Academy", url: `${SITE_URL}/academy` },
        ])}
      />

      <main className="px-6 py-14">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            AI Business Academy
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">
            Practical long-form guides for African sellers: payments, WhatsApp, AI storefronts, and
            platform decisions — written to rank and to help you ship the next prepaid order.
          </p>

          <section className="mt-12">
            <h2 className="font-display text-2xl font-semibold">Topics</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ACADEMY_CATEGORIES.map((category) => (
                <div
                  key={category.slug}
                  className="rounded-2xl border border-border bg-canvas-raised p-5"
                >
                  <h3 className="font-display text-lg font-semibold">{category.name}</h3>
                  <p className="mt-2 text-sm text-ink-soft">{category.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-16">
            <h2 className="font-display text-2xl font-semibold">Guides</h2>
            <ul className="mt-6 divide-y divide-border border-y border-border">
              {ACADEMY_GUIDES.map((guide) => (
                <li key={guide.slug}>
                  <Link
                    href={`/academy/${guide.slug}`}
                    className="group flex flex-col gap-2 py-6 transition-colors hover:text-primary"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <span className="font-medium">{guide.title}</span>
                      <span className="shrink-0 text-sm text-ink-soft group-hover:text-primary">
                        {guide.readTimeMinutes
                          ? `${guide.readTimeMinutes} min read`
                          : "Read guide"}
                      </span>
                    </div>
                    <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">
                      {guide.metaDescription}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-14 rounded-2xl border border-border bg-gradient-mesh p-8">
            <h2 className="font-display text-2xl font-semibold">Ready to apply what you learn?</h2>
            <p className="mt-3 max-w-xl text-ink-soft">
              Generate a live storefront with AI, connect Paystack, and start selling.
            </p>
            <Link
              href="/signup"
              className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90"
            >
              Start free
            </Link>
          </div>
        </div>
      </main>
    </MarketingChrome>
  );
}
