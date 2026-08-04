import type { Metadata } from "next";
import Link from "next/link";
import { MarketingChrome } from "@/components/seo/marketing-chrome";
import { JsonLd } from "@/lib/seo/json-ld";
import { SEO_CITIES, SEO_INDUSTRIES } from "@/lib/seo/pages";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/site-seo";

export const metadata: Metadata = {
  title: "Industry Website Builders | Bizgrid",
  description:
    "Website builders for fashion, furniture, pharmacy, cosmetics, restaurants, electronics, and more. AI storefronts with Paystack payments for African sellers.",
  alternates: { canonical: "/industries" },
  openGraph: {
    title: "Industry Website Builders | Bizgrid",
    description:
      "Website builders for fashion, furniture, pharmacy, cosmetics, restaurants, electronics, and more. AI storefronts with Paystack payments for African sellers.",
    url: "/industries",
    type: "website",
  },
};

export default function IndustriesIndexPage() {
  return (
    <MarketingChrome currentPath="/industries">
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Industries", url: `${SITE_URL}/industries` },
        ])}
      />

      <main className="px-6 py-14">
        <div className="mx-auto max-w-5xl">
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            Website builders by industry
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink-soft">
            Pick your category to see how Bizgrid helps you publish a storefront, take Paystack
            payments, and sell over WhatsApp — with city pages for major African markets.
          </p>

          <section className="mt-12">
            <h2 className="sr-only">Industries</h2>
            <ul className="divide-y divide-border border-y border-border">
              {SEO_INDUSTRIES.map((industry) => (
                <li key={industry.slug} className="py-7">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="max-w-2xl">
                      <Link
                        href={`/industries/${industry.slug}`}
                        className="font-display text-xl font-semibold hover:text-primary"
                      >
                        {industry.name}
                      </Link>
                      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                        {industry.metaDescription}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
                        {SEO_CITIES.slice(0, 3).map((city) => (
                          <Link
                            key={city.slug}
                            href={`/industries/${industry.slug}/${city.slug}`}
                            className="text-primary hover:underline"
                          >
                            {city.name}
                          </Link>
                        ))}
                        <span className="text-ink-soft/70">+ more cities</span>
                      </div>
                    </div>
                    <Link
                      href={`/industries/${industry.slug}`}
                      className="shrink-0 text-sm font-medium text-primary hover:underline"
                    >
                      View guide →
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-14 rounded-2xl border border-border bg-gradient-mesh p-8">
            <h2 className="font-display text-2xl font-semibold">Don&apos;t see your niche?</h2>
            <p className="mt-3 max-w-xl text-ink-soft">
              Bizgrid works for any catalog business. Describe what you sell in chat and get a live
              storefront — then refine it in plain language.
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
