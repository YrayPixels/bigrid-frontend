"use client";

import { FaqPageView } from "@/components/storefront/pages/faq-page-view";
import { useStorefront } from "@/lib/storefront/store-context";

export default function FaqPage() {
  const { storefront } = useStorefront();
  const page = storefront.pages?.faq;

  return (
    <FaqPageView title={page?.title ?? "Frequently asked questions"} items={page?.items ?? []} />
  );
}
