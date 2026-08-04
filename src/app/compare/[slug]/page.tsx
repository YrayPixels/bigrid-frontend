import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { relatedFromPaths, SeoLongformPage } from "@/components/seo/seo-longform-page";
import { COMPARISON_PAGES, getComparisonPage } from "@/lib/seo/pages";

export function generateStaticParams() {
  return COMPARISON_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getComparisonPage(slug);
  if (!page) return {};

  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: `/compare/${page.slug}` },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url: `/compare/${page.slug}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: page.metaTitle,
      description: page.metaDescription,
    },
  };
}

export default async function ComparePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getComparisonPage(slug);
  if (!page) notFound();

  return (
    <SeoLongformPage
      path={`/compare/${page.slug}`}
      breadcrumb={[
        { name: "Compare", path: "/compare/bizgrid-vs-shopify" },
        { name: page.title, path: `/compare/${page.slug}` },
      ]}
      h1={page.h1}
      intro={page.intro}
      sections={page.sections}
      faqs={page.faqs}
      related={relatedFromPaths(page.relatedPaths)}
      takeaways={page.takeaways}
      conclusion={page.conclusion}
      datePublished={page.datePublished}
      readTimeMinutes={page.readTimeMinutes}
      ctaLabel={page.ctaLabel}
    />
  );
}
