import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { relatedFromPaths, SeoLongformPage } from "@/components/seo/seo-longform-page";
import { getIndustry, SEO_CITIES, SEO_INDUSTRIES } from "@/lib/seo/pages";

export function generateStaticParams() {
  return SEO_INDUSTRIES.map((industry) => ({ slug: industry.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) return {};

  return {
    title: industry.metaTitle,
    description: industry.metaDescription,
    alternates: { canonical: `/industries/${industry.slug}` },
    openGraph: {
      title: industry.metaTitle,
      description: industry.metaDescription,
      url: `/industries/${industry.slug}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: industry.metaTitle,
      description: industry.metaDescription,
    },
  };
}

export default async function IndustryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const industry = getIndustry(slug);
  if (!industry) notFound();

  const cityLinks = SEO_CITIES.map((city) => ({
    href: `/industries/${industry.slug}/${city.slug}`,
    label: `${industry.name} in ${city.name}`,
  }));

  const discoverLinks = SEO_CITIES.slice(0, 4).map((city) => ({
    href: `/discover/${industry.slug}/${city.slug}`,
    label: `Best ${industry.pluralLabel} in ${city.name}`,
  }));

  return (
    <SeoLongformPage
      path={`/industries/${industry.slug}`}
      breadcrumb={[
        { name: "Industries", path: "/industries" },
        { name: industry.name, path: `/industries/${industry.slug}` },
      ]}
      h1={industry.h1}
      intro={industry.intro}
      sections={[
        ...industry.sections,
        {
          heading: `Where ${industry.pluralLabel} launch with Bizgrid`,
          body: [
            `Customers search with city intent — “${industry.pluralLabel} in Lagos”, “${industry.name.toLowerCase()} website Abuja”, and similar. That is why Bizgrid publishes local landing pages for major African markets.`,
            `Each city page explains local buying habits, fulfilment expectations, and a one-week launch checklist. Pair those with discover directories that link to live Bizgrid storefronts.`,
            `Start with the city closest to your customers, publish your store, then expand. Internal links between industry, city, and discover pages help both shoppers and search engines understand the topic cluster.`,
          ],
        },
        {
          heading: "What to sell first",
          body: [
            `Begin with what already moves: ${industry.whatToSell.join("; ")}. A tight catalog with clear photos beats a thin list of incomplete products.`,
            "Add FAQs for delivery, payment, and the questions you repeat daily in WhatsApp. Then enable Paystack checkout so serious buyers can pay without another invoice chase.",
          ],
        },
      ]}
      faqs={industry.faqs}
      related={[
        ...cityLinks.slice(0, 4),
        ...discoverLinks,
        ...relatedFromPaths([
          "/solutions/ai-website-builder",
          "/solutions/ecommerce-website-builder",
          "/academy",
        ]),
      ]}
    />
  );
}
