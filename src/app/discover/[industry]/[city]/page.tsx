import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarketingChrome } from "@/components/seo/marketing-chrome";
import { storefrontApi } from "@/lib/api/storefront";
import { JsonLd } from "@/lib/seo/json-ld";
import {
  getCity,
  getIndustry,
  SEO_CITIES,
  SEO_INDUSTRIES,
} from "@/lib/seo/pages";
import { breadcrumbSchema, faqSchema } from "@/lib/seo/schema";
import { getStorefrontBaseUrl, SITE_URL } from "@/lib/site-seo";

export const revalidate = 300;

export function generateStaticParams() {
  return SEO_INDUSTRIES.flatMap((industry) =>
    SEO_CITIES.map((city) => ({
      industry: industry.slug,
      city: city.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ industry: string; city: string }>;
}): Promise<Metadata> {
  const { industry: industrySlug, city: citySlug } = await params;
  const industry = getIndustry(industrySlug);
  const city = getCity(citySlug);
  if (!industry || !city) return {};

  const title = `Best ${industry.name} in ${city.name} | Bizgrid`;
  const description = `Discover ${industry.pluralLabel} in ${city.name} on Bizgrid. Browse live storefronts and start your own ${industry.name.toLowerCase()} website.`;

  return {
    title,
    description,
    alternates: { canonical: `/discover/${industry.slug}/${city.slug}` },
    openGraph: { title, description, url: `/discover/${industry.slug}/${city.slug}` },
  };
}

export default async function DiscoverPage({
  params,
}: {
  params: Promise<{ industry: string; city: string }>;
}) {
  const { industry: industrySlug, city: citySlug } = await params;
  const industry = getIndustry(industrySlug);
  const city = getCity(citySlug);
  if (!industry || !city) notFound();

  let stores: Awaited<ReturnType<typeof storefrontApi.listPublished>> = [];
  try {
    stores = await storefrontApi.listPublished();
  } catch {
    stores = [];
  }

  const path = `/discover/${industry.slug}/${city.slug}`;
  const h1 = `Best ${industry.name} in ${city.name}`;
  const faqs = [
    {
      question: `How do I find ${industry.pluralLabel} in ${city.name}?`,
      answer: `This Bizgrid directory lists published storefronts. Each shop links to a live catalog where you can browse products and checkout.`,
    },
    {
      question: `Can I list my ${industry.name.toLowerCase()} business in ${city.name}?`,
      answer: `Yes. Create a Bizgrid storefront, publish it, and it becomes discoverable through the platform stores directory and industry pages.`,
    },
    ...industry.faqs.slice(0, 2),
  ];

  return (
    <MarketingChrome>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", url: SITE_URL },
          { name: "Industries", url: `${SITE_URL}/industries` },
          { name: industry.name, url: `${SITE_URL}/industries/${industry.slug}` },
          { name: city.name, url: `${SITE_URL}${path}` },
        ])}
      />
      <JsonLd data={faqSchema(faqs)} />

      <main className="px-6 py-14">
        <div className="mx-auto max-w-3xl">
          <nav aria-label="Breadcrumb" className="mb-8 text-sm text-ink-soft">
            <ol className="flex flex-wrap items-center gap-2">
              <li>
                <Link href="/" className="hover:text-ink">
                  Home
                </Link>
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden>/</span>
                <Link href="/industries" className="hover:text-ink">
                  Industries
                </Link>
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden>/</span>
                <Link href={`/industries/${industry.slug}`} className="hover:text-ink">
                  {industry.name}
                </Link>
              </li>
              <li className="flex items-center gap-2">
                <span aria-hidden>/</span>
                <span>{city.name}</span>
              </li>
            </ol>
          </nav>

          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">{h1}</h1>
          <p className="mt-4 text-lg text-ink-soft">
            {city.marketNote}
          </p>
          <p className="mt-3 text-ink-soft">
            Browse live {industry.pluralLabel} on Bizgrid that shoppers in {city.name}, {city.country}{" "}
            can order from. Each listing links to a real catalog with prepaid checkout — not a screenshot
            thread. Want to be listed? Publish your {industry.name.toLowerCase()} storefront in minutes.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90"
            >
              List your store
            </Link>
            <Link
              href={`/industries/${industry.slug}/${city.slug}`}
              className="rounded-full border border-border px-6 py-3 text-sm font-medium transition hover:bg-muted"
            >
              Build a {industry.name.toLowerCase()} site
            </Link>
          </div>

          <section className="mt-12 space-y-4 text-[15px] leading-relaxed text-ink-soft">
            <h2 className="font-display text-2xl font-semibold text-ink">
              Why {city.name} shoppers use directories like this
            </h2>
            <p>{city.sellingNote}</p>
            <p>
              {industry.cityHook} If you run {industry.pluralLabel} in {city.name}, a published Bizgrid
              storefront makes you easier to find, compare, and pay — without forcing every customer through
              a private chat before they see prices.
            </p>
          </section>

          <h2 className="mt-14 font-display text-2xl font-semibold text-ink">
            Featured {industry.pluralLabel} on Bizgrid
          </h2>

          {stores.length === 0 ? (
            <p className="mt-6 text-sm text-ink-soft">
              No published stores in the index yet. Be the first {industry.name.toLowerCase()} brand in{" "}
              {city.name} on Bizgrid — describe your shop, publish products, and share your link.
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-border border-y border-border">
              {stores.map((store) => (
                <li key={store.slug}>
                  <a
                    href={getStorefrontBaseUrl(store.slug)}
                    className="flex items-baseline justify-between gap-4 py-4 transition-colors hover:text-primary"
                  >
                    <span className="font-medium">{store.business_name || store.slug}</span>
                    <span className="shrink-0 text-sm text-ink-soft">{city.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}

          <section className="mt-14 space-y-4 text-[15px] leading-relaxed text-ink-soft">
            <h2 className="font-display text-2xl font-semibold text-ink">
              How to get your {industry.name.toLowerCase()} listed for {city.name}
            </h2>
            <p>
              1) Create a Bizgrid account and generate your storefront from a short description. 2) Add the
              products customers already ask for. 3) Publish FAQs about delivery in {city.name}. 4) Enable
              Paystack checkout. 5) Keep the store published so it can appear across Bizgrid discover and
              stores pages.
            </p>
            <p>
              Prefer a guided walkthrough? Read the {industry.name.toLowerCase()} website builder guide for{" "}
              {city.name}, or start with the AI website builder overview.
            </p>
            <p>
              <Link href={`/industries/${industry.slug}/${city.slug}`} className="text-primary hover:underline">
                {industry.name} website builder in {city.name}
              </Link>
              {" · "}
              <Link href="/solutions/ai-website-builder" className="text-primary hover:underline">
                AI website builder
              </Link>
            </p>
          </section>

          <section className="mt-16 border-t border-border pt-12">
            <h2 className="font-display text-2xl font-semibold">FAQ</h2>
            <div className="mt-6 space-y-4">
              {faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="rounded-2xl border border-border bg-canvas-raised p-5"
                >
                  <summary className="cursor-pointer font-medium">{faq.question}</summary>
                  <p className="mt-3 text-sm text-ink-soft">{faq.answer}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </main>
    </MarketingChrome>
  );
}
