import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { relatedFromPaths, SeoLongformPage } from "@/components/seo/seo-longform-page";
import {
  buildIndustryCitySections,
  getCity,
  getIndustry,
  SEO_CITIES,
  SEO_INDUSTRIES,
} from "@/lib/seo/pages";

export function generateStaticParams() {
  return SEO_INDUSTRIES.flatMap((industry) =>
    SEO_CITIES.map((city) => ({
      slug: industry.slug,
      city: city.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; city: string }>;
}): Promise<Metadata> {
  const { slug, city: citySlug } = await params;
  const industry = getIndustry(slug);
  const city = getCity(citySlug);
  if (!industry || !city) return {};

  const metaTitle = `${industry.name} Website Builder ${city.name} | Bizgrid`;
  const metaDescription = `Build a ${industry.name.toLowerCase()} website in ${city.name}, ${city.country}. AI storefronts, Paystack payments, and WhatsApp selling with Bizgrid.`;

  return {
    title: metaTitle,
    description: metaDescription,
    alternates: { canonical: `/industries/${industry.slug}/${city.slug}` },
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      url: `/industries/${industry.slug}/${city.slug}`,
      type: "article",
    },
  };
}

export default async function IndustryCityPage({
  params,
}: {
  params: Promise<{ slug: string; city: string }>;
}) {
  const { slug, city: citySlug } = await params;
  const industry = getIndustry(slug);
  const city = getCity(citySlug);
  if (!industry || !city) notFound();

  const { intro, sections } = buildIndustryCitySections(industry, city);
  const h1 = `${industry.name} Website Builder in ${city.name}`;

  return (
    <SeoLongformPage
      path={`/industries/${industry.slug}/${city.slug}`}
      breadcrumb={[
        { name: "Industries", path: "/industries" },
        { name: industry.name, path: `/industries/${industry.slug}` },
        { name: city.name, path: `/industries/${industry.slug}/${city.slug}` },
      ]}
      h1={h1}
      intro={intro}
      sections={sections}
      faqs={industry.faqs}
      related={relatedFromPaths([
        `/discover/${industry.slug}/${city.slug}`,
        `/industries/${industry.slug}`,
        "/solutions/ai-website-builder",
        "/stores",
      ])}
    />
  );
}
