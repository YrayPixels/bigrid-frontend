export type {
  CityDef,
  FaqItem,
  SeoPageContent,
  SeoSection,
} from "@/lib/seo/types";

export { ACADEMY_CATEGORIES, ACADEMY_GUIDES } from "@/lib/seo/content/academy";
export { COMPARISON_PAGES } from "@/lib/seo/content/comparisons";
export { INTENT_PAGES } from "@/lib/seo/content/intent";
export { SEO_INDUSTRIES, type IndustryDef } from "@/lib/seo/content/industries";
export { SEO_CITIES, buildIndustryCitySections } from "@/lib/seo/content/cities";

import { ACADEMY_GUIDES } from "@/lib/seo/content/academy";
import { COMPARISON_PAGES } from "@/lib/seo/content/comparisons";
import { INTENT_PAGES } from "@/lib/seo/content/intent";
import { SEO_INDUSTRIES } from "@/lib/seo/content/industries";
import { SEO_CITIES } from "@/lib/seo/content/cities";

export function getIntentPage(slug: string) {
  return INTENT_PAGES.find((page) => page.slug === slug);
}

export function getComparisonPage(slug: string) {
  return COMPARISON_PAGES.find((page) => page.slug === slug);
}

export function getAcademyGuide(slug: string) {
  return ACADEMY_GUIDES.find((page) => page.slug === slug);
}

export function getIndustry(slug: string) {
  return SEO_INDUSTRIES.find((industry) => industry.slug === slug);
}

export function getCity(slug: string) {
  return SEO_CITIES.find((city) => city.slug === slug);
}

export function allMarketingSeoPaths(): string[] {
  const paths: string[] = ["/academy", "/industries"];

  for (const page of INTENT_PAGES) {
    paths.push(`/solutions/${page.slug}`);
  }
  for (const page of COMPARISON_PAGES) {
    paths.push(`/compare/${page.slug}`);
  }
  for (const guide of ACADEMY_GUIDES) {
    paths.push(`/academy/${guide.slug}`);
  }
  for (const industry of SEO_INDUSTRIES) {
    paths.push(`/industries/${industry.slug}`);
    for (const city of SEO_CITIES) {
      paths.push(`/industries/${industry.slug}/${city.slug}`);
      paths.push(`/discover/${industry.slug}/${city.slug}`);
    }
  }

  return paths;
}
