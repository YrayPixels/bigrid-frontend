"use client";

import { ContentPageView } from "@/components/storefront/pages/content-page-view";
import { useStorefront } from "@/lib/storefront/store-context";

export default function ContactPage() {
  const { storefront } = useStorefront();
  const page = storefront.pages?.contact;

  if (!page) {
    return <ContentPageView title="Contact us" body="Reach out to the store owner for support." />;
  }

  const details = [
    page.email ? `Email: ${page.email}` : null,
    page.phone ? `Phone: ${page.phone}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <ContentPageView title={page.title} body={[page.body, details].filter(Boolean).join("\n\n")} />
  );
}
