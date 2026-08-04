import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { relatedFromPaths, SeoLongformPage } from "@/components/seo/seo-longform-page";
import { getIntentPage, INTENT_PAGES } from "@/lib/seo/pages";

export function generateStaticParams() {
  return INTENT_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = getIntentPage(slug);
  if (!page) return {};

  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: `/solutions/${page.slug}` },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url: `/solutions/${page.slug}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: page.metaTitle,
      description: page.metaDescription,
    },
  };
}

export default async function SolutionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = getIntentPage(slug);
  if (!page) notFound();

  return (
    <SeoLongformPage
      path={`/solutions/${page.slug}`}
      breadcrumb={[
        { name: "Solutions", path: "/solutions/ai-website-builder" },
        { name: page.title, path: `/solutions/${page.slug}` },
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
