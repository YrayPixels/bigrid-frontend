import type { FaqItem } from "@/lib/seo/types";
import { SITE_URL } from "@/lib/site-seo";

export type { FaqItem } from "@/lib/seo/types";

export type BreadcrumbItem = { name: string; url: string };

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Bizgrid",
    url: SITE_URL,
    logo: `${SITE_URL}/bizgridlogo.png`,
    description:
      "AI-powered commerce platform that helps African sellers build storefronts, take payments, and grow online.",
    email: "support@bizgrid.ai",
    sameAs: [],
    areaServed: [
      { "@type": "Country", name: "Nigeria" },
      { "@type": "Country", name: "Kenya" },
      { "@type": "Continent", name: "Africa" },
    ],
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Bizgrid",
    url: SITE_URL,
    description: "AI website and ecommerce storefront builder for African businesses.",
    publisher: { "@type": "Organization", name: "Bizgrid", url: SITE_URL },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/stores?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function faqSchema(faqs: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function articleSchema(input: {
  headline: string;
  description: string;
  url: string;
  datePublished?: string;
  dateModified?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    url: input.url,
    mainEntityOfPage: input.url,
    datePublished: input.datePublished ?? "2026-03-01",
    dateModified: input.dateModified ?? "2026-03-01",
    author: { "@type": "Organization", name: "Bizgrid", url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: "Bizgrid",
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/bizgridlogo.png` },
    },
  };
}

export function softwareApplicationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Bizgrid",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: SITE_URL,
    description:
      "AI website builder and ecommerce platform for African businesses with Paystack payments and WhatsApp commerce.",
    offers: {
      "@type": "Offer",
      price: "5000",
      priceCurrency: "NGN",
      description: "Starter plan from NGN 5,000/month with a 14-day free trial",
    },
  };
}

export function localBusinessSchema(input: {
  name: string;
  description?: string | null;
  url: string;
  logo?: string | null;
  email?: string | null;
  phone?: string | null;
  addressCountry?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: input.name,
    description: input.description || undefined,
    url: input.url,
    image: input.logo || undefined,
    email: input.email || undefined,
    telephone: input.phone || undefined,
    address: input.addressCountry
      ? {
          "@type": "PostalAddress",
          addressCountry: input.addressCountry === "kenya" ? "KE" : "NG",
        }
      : undefined,
  };
}

export function storeWebSiteSchema(input: {
  name: string;
  url: string;
  description?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: input.name,
    url: input.url,
    description: input.description || undefined,
  };
}

export function productSchema(input: {
  name: string;
  description?: string | null;
  url: string;
  image?: string | null;
  sku?: string | null;
  brand?: string | null;
  price: number;
  currency: string;
  availability: "InStock" | "OutOfStock";
  storeName: string;
  storeUrl: string;
  aggregateRating?: { ratingValue: number; reviewCount: number } | null;
}) {
  const offer: Record<string, unknown> = {
    "@type": "Offer",
    url: input.url,
    priceCurrency: input.currency,
    price: input.price,
    availability: `https://schema.org/${input.availability}`,
    seller: {
      "@type": "Organization",
      name: input.storeName,
      url: input.storeUrl,
    },
  };

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: input.name,
    description: input.description || undefined,
    image: input.image || undefined,
    sku: input.sku || undefined,
    brand: {
      "@type": "Brand",
      name: input.brand || input.storeName,
    },
    offers: offer,
  };

  if (input.aggregateRating && input.aggregateRating.reviewCount > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.aggregateRating.ratingValue,
      reviewCount: input.aggregateRating.reviewCount,
    };
  }

  return schema;
}
