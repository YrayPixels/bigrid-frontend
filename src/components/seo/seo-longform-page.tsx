import Link from "next/link";
import type { ReactNode } from "react";
import { MarketingChrome } from "@/components/seo/marketing-chrome";
import { JsonLd } from "@/lib/seo/json-ld";
import {
  articleSchema,
  breadcrumbSchema,
  faqSchema,
  type FaqItem,
} from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/site-seo";

export type LongformSection = {
  heading: string;
  body: string[];
  bullets?: string[];
};

const LINK_PATTERN = /\[([^\]]+)\]\((\/[^)\s]+)\)/g;

function headingId(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function GuideTocLinks({
  sections,
  conclusion,
  faqs,
}: {
  sections: LongformSection[];
  conclusion?: { heading?: string; body: string[] };
  faqs?: FaqItem[];
}) {
  return (
    <ol className="mt-3 space-y-2.5 text-sm">
      {sections.map((section) => (
        <li key={section.heading}>
          <a
            href={`#${headingId(section.heading)}`}
            className="text-primary hover:underline"
          >
            {section.heading}
          </a>
        </li>
      ))}
      {conclusion ? (
        <li>
          <a
            href={`#${headingId(conclusion.heading || "What to do next")}`}
            className="text-primary hover:underline"
          >
            {conclusion.heading || "What to do next"}
          </a>
        </li>
      ) : null}
      {faqs && faqs.length > 0 ? (
        <li>
          <a href="#faqs" className="text-primary hover:underline">
            Frequently asked questions
          </a>
        </li>
      ) : null}
    </ol>
  );
}
export function RichParagraph({ text }: { text: string }) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const pattern = new RegExp(LINK_PATTERN.source, "g");

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    nodes.push(
      <Link
        key={`${match[2]}-${match.index}`}
        href={match[2]}
        className="font-medium text-primary underline-offset-2 hover:underline"
      >
        {match[1]}
      </Link>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return <>{nodes.length > 0 ? nodes : text}</>;
}

export function SeoLongformPage({
  path,
  breadcrumb,
  h1,
  intro,
  sections,
  faqs,
  related,
  datePublished,
  takeaways,
  conclusion,
  readTimeMinutes,
  ctaLabel = "Start free trial",
}: {
  path: string;
  breadcrumb: { name: string; path: string }[];
  h1: string;
  intro: string;
  sections: LongformSection[];
  faqs?: FaqItem[];
  related?: { href: string; label: string }[];
  datePublished?: string;
  takeaways?: string[];
  conclusion?: { heading?: string; body: string[] };
  readTimeMinutes?: number;
  ctaLabel?: string;
}) {
  const absoluteUrl = `${SITE_URL}${path}`;
  const crumbs = [
    { name: "Home", url: SITE_URL },
    ...breadcrumb.map((item) => ({
      name: item.name,
      url: item.path.startsWith("http") ? item.path : `${SITE_URL}${item.path}`,
    })),
  ];
  const showToc = sections.length >= 4;

  return (
    <MarketingChrome currentPath={path}>
      <JsonLd data={breadcrumbSchema(crumbs)} />
      <JsonLd
        data={articleSchema({
          headline: h1,
          description: intro,
          url: absoluteUrl,
          datePublished,
        })}
      />
      {faqs && faqs.length > 0 ? <JsonLd data={faqSchema(faqs)} /> : null}

      <main className="px-6 py-14">
        <article className={`mx-auto ${showToc ? "max-w-5xl" : "max-w-3xl"}`}>
          <header className={showToc ? "max-w-3xl" : undefined}>
            <nav aria-label="Breadcrumb" className="mb-8 text-sm text-ink-soft">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href="/" className="hover:text-ink">
                    Home
                  </Link>
                </li>
                {breadcrumb.map((item) => (
                  <li key={item.path} className="flex items-center gap-2">
                    <span aria-hidden>/</span>
                    <Link href={item.path} className="hover:text-ink">
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ol>
            </nav>

            <h1 className="font-display text-4xl font-bold tracking-tight text-balance md:text-5xl">
              {h1}
            </h1>
            <p className="mt-5 text-lg text-pretty text-ink-soft">
              <RichParagraph text={intro} />
            </p>

            {(readTimeMinutes || datePublished) && (
              <p className="mt-4 text-sm text-ink-soft">
                {readTimeMinutes ? `${readTimeMinutes} min read` : null}
                {readTimeMinutes && datePublished ? " · " : null}
                {datePublished ? `Updated ${datePublished}` : null}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90"
              >
                {ctaLabel}
              </Link>
              <Link
                href="/stores"
                className="rounded-full border border-border bg-card/60 px-6 py-3 text-sm font-medium transition hover:bg-muted"
              >
                Browse stores
              </Link>
            </div>
          </header>

          <div
            className={
              showToc
                ? "mt-12 md:mt-14 md:grid md:grid-cols-[minmax(0,42rem)_14rem] md:items-start md:justify-between md:gap-x-12 lg:gap-x-16"
                : "mt-12"
            }
          >
            <div className={showToc ? "min-w-0 md:order-1" : undefined}>
              {takeaways && takeaways.length > 0 ? (
                <aside className="rounded-2xl border border-border bg-canvas-raised p-6">
                  <h2 className="font-display text-lg font-semibold tracking-tight">
                    Key takeaways
                  </h2>
                  <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-ink-soft">
                    {takeaways.map((item) => (
                      <li key={item.slice(0, 64)}>
                        <RichParagraph text={item} />
                      </li>
                    ))}
                  </ul>
                </aside>
              ) : null}

              {showToc ? (
                <nav
                  aria-label="Table of contents"
                  className="mt-10 border-t border-border pt-8 md:hidden"
                >
                  <h2 className="font-display text-lg font-semibold tracking-tight">
                    In this guide
                  </h2>
                  <GuideTocLinks
                    sections={sections}
                    conclusion={conclusion}
                    faqs={faqs}
                  />
                </nav>
              ) : null}

              <div className={`space-y-12 ${takeaways?.length || showToc ? "mt-14" : ""}`}>
                {sections.map((section) => (
                  <section key={section.heading} id={headingId(section.heading)}>
                    <h2 className="font-display text-2xl font-semibold tracking-tight scroll-mt-24">
                      {section.heading}
                    </h2>
                    <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-ink-soft">
                      {section.body.map((paragraph) => (
                        <p key={paragraph.slice(0, 48)}>
                          <RichParagraph text={paragraph} />
                        </p>
                      ))}
                    </div>
                    {section.bullets && section.bullets.length > 0 ? (
                      <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-ink-soft">
                        {section.bullets.map((item) => (
                          <li key={item.slice(0, 64)}>
                            <RichParagraph text={item} />
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </section>
                ))}
              </div>

              {conclusion ? (
                <section
                  id={headingId(conclusion.heading || "What to do next")}
                  className="mt-16 rounded-2xl border border-border bg-gradient-mesh p-8"
                >
                  <h2 className="font-display text-2xl font-semibold tracking-tight scroll-mt-24">
                    {conclusion.heading || "What to do next"}
                  </h2>
                  <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-ink-soft">
                    {conclusion.body.map((paragraph) => (
                      <p key={paragraph.slice(0, 48)}>
                        <RichParagraph text={paragraph} />
                      </p>
                    ))}
                  </div>
                  <Link
                    href="/signup"
                    className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90"
                  >
                    {ctaLabel}
                  </Link>
                </section>
              ) : null}

              {faqs && faqs.length > 0 ? (
                <section id="faqs" className="mt-16 border-t border-border pt-12">
                  <h2 className="font-display text-2xl font-semibold tracking-tight scroll-mt-24">
                    Frequently asked questions
                  </h2>
                  <div className="mt-6 space-y-4">
                    {faqs.map((faq) => (
                      <details
                        key={faq.question}
                        className="group rounded-2xl border border-border bg-canvas-raised p-5"
                      >
                        <summary className="cursor-pointer list-none font-medium text-ink">
                          {faq.question}
                        </summary>
                        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                          <RichParagraph text={faq.answer} />
                        </p>
                      </details>
                    ))}
                  </div>
                </section>
              ) : null}

              {related && related.length > 0 ? (
                <section className="mt-16 border-t border-border pt-12">
                  <h2 className="font-display text-2xl font-semibold tracking-tight">
                    Keep reading
                  </h2>
                  <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                    {related.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="text-sm text-primary hover:underline"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>

            {showToc ? (
              <nav
                aria-label="Table of contents"
                className="hidden md:sticky md:top-24 md:order-2 md:block md:self-start"
              >
                <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
                  In this guide
                </h2>
                <div className="border-l border-border pl-4">
                  <GuideTocLinks
                    sections={sections}
                    conclusion={conclusion}
                    faqs={faqs}
                  />
                </div>
              </nav>
            ) : null}
          </div>
        </article>
      </main>
    </MarketingChrome>
  );
}

const PATH_LABELS: Record<string, string> = {
  "/academy": "AI Business Academy",
  "/academy/how-to-start-an-online-business-in-nigeria":
    "How to Start an Online Business in Nigeria",
  "/academy/shopify-vs-bizgrid": "Shopify vs Bizgrid",
  "/academy/best-website-builder-in-africa": "Best Website Builder in Africa",
  "/academy/how-to-accept-payments-with-paystack":
    "How to Accept Payments with Paystack",
  "/academy/selling-on-whatsapp": "Selling on WhatsApp",
  "/academy/how-to-sell-without-instagram": "How to Sell Without Instagram",
  "/academy/ai-for-small-businesses": "AI for Small Businesses",
  "/academy/how-to-build-an-ecommerce-store-in-10-minutes":
    "Build an Ecommerce Store in 10 Minutes",
  "/solutions/ai-website-builder": "AI Website Builder",
  "/solutions/ecommerce-website-builder": "Ecommerce Website Builder",
  "/solutions/free-online-store": "Free Online Store",
  "/solutions/website-builder-for-nigeria": "Website Builder for Nigeria",
  "/solutions/website-builder-for-africa": "Website Builder for Africa",
  "/solutions/shopify-alternative-africa": "Shopify Alternative for Africa",
  "/solutions/paystack-store-builder": "Paystack Store Builder",
  "/solutions/whatsapp-commerce": "WhatsApp Commerce",
  "/solutions/small-business-website": "Small Business Website",
  "/compare/bizgrid-vs-shopify": "Bizgrid vs Shopify",
  "/compare/bizgrid-vs-wix": "Bizgrid vs Wix",
  "/compare/bizgrid-vs-wordpress": "Bizgrid vs WordPress",
  "/compare/bizgrid-vs-woocommerce": "Bizgrid vs WooCommerce",
  "/compare/bizgrid-vs-ecwid": "Bizgrid vs Ecwid",
  "/industries": "All Industries",
  "/industries/fashion-stores": "Fashion Stores",
  "/industries/fashion-stores/lagos": "Fashion Stores in Lagos",
  "/industries/furniture": "Furniture Stores",
  "/industries/pharmacies": "Pharmacies",
  "/industries/beauty-brands": "Cosmetics & Beauty",
  "/industries/restaurants": "Restaurant Websites",
  "/industries/electronics": "Electronics Stores",
  "/industries/bakeries": "Bakeries",
  "/industries/grocery-stores": "Grocery Stores",
  "/industries/barbers": "Barbers",
  "/discover/fashion-stores/lagos": "Discover Fashion in Lagos",
  "/stores": "Browse Stores",
};

export function relatedFromPaths(paths: string[] | undefined): { href: string; label: string }[] {
  if (!paths) return [];
  return paths
    .filter((path) => path !== "/signup" && !path.startsWith("/#"))
    .map((path) => ({
      href: path,
      label:
        PATH_LABELS[path] ??
        path
          .split("/")
          .filter(Boolean)
          .pop()!
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" "),
    }));
}
