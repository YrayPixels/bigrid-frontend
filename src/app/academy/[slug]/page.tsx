import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { relatedFromPaths, SeoLongformPage } from "@/components/seo/seo-longform-page";
import { ACADEMY_GUIDES, getAcademyGuide } from "@/lib/seo/pages";

export function generateStaticParams() {
  return ACADEMY_GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getAcademyGuide(slug);
  if (!guide) return {};

  return {
    title: guide.metaTitle,
    description: guide.metaDescription,
    alternates: { canonical: `/academy/${guide.slug}` },
    openGraph: {
      title: guide.metaTitle,
      description: guide.metaDescription,
      url: `/academy/${guide.slug}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: guide.metaTitle,
      description: guide.metaDescription,
    },
  };
}

export default async function AcademyGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getAcademyGuide(slug);
  if (!guide) notFound();

  return (
    <SeoLongformPage
      path={`/academy/${guide.slug}`}
      breadcrumb={[
        { name: "Academy", path: "/academy" },
        { name: guide.title, path: `/academy/${guide.slug}` },
      ]}
      h1={guide.h1}
      intro={guide.intro}
      sections={guide.sections}
      faqs={guide.faqs}
      related={relatedFromPaths(guide.relatedPaths)}
      takeaways={guide.takeaways}
      conclusion={guide.conclusion}
      datePublished={guide.datePublished}
      readTimeMinutes={guide.readTimeMinutes}
      ctaLabel={guide.ctaLabel}
    />
  );
}
