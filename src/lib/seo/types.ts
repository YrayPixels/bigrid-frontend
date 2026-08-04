export type FaqItem = { question: string; answer: string };

export type CityDef = {
  slug: string;
  name: string;
  country: "Nigeria" | "Kenya" | "Ghana";
  /** Short local context used on industry/city and discover pages */
  marketNote: string;
  sellingNote: string;
};

export type SeoSection = {
  heading: string;
  body: string[];
  /** Optional bullet list rendered under the body paragraphs */
  bullets?: string[];
};

export type SeoPageContent = {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  intro: string;
  sections: SeoSection[];
  faqs?: FaqItem[];
  relatedPaths?: string[];
  ctaLabel?: string;
  /** Short “what you’ll learn” bullets shown near the top */
  takeaways?: string[];
  /** Closing section before FAQs — next steps / wrap-up */
  conclusion?: {
    heading?: string;
    body: string[];
  };
  /** Optional display date for article chrome */
  datePublished?: string;
  readTimeMinutes?: number;
};
