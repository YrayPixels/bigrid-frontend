import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/landing-page";
import { JsonLd } from "@/lib/seo/json-ld";
import { PLATFORM_FAQS } from "@/lib/seo/platform-faqs";
import { faqSchema } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/site-seo";

export const metadata: Metadata = {
  title: "AI Website Builder for African Businesses | Bizgrid",
  description:
    "Describe your shop and get a live storefront. Bizgrid helps African sellers build with AI, take Paystack payments, manage orders, and grow on WhatsApp.",
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    url: SITE_URL,
  },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={faqSchema(PLATFORM_FAQS)} />
      <LandingPage />
    </>
  );
}
