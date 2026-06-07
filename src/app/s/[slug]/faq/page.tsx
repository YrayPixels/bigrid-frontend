"use client";

import { StorefrontFaqSection } from "@/components/storefront/pages/storefront-faq-section";
import { useStorefront } from "@/lib/storefront/store-context";

export default function FaqPage() {
  const { storefront } = useStorefront();

  return <StorefrontFaqSection faqPage={storefront.pages?.faq} />;
}
