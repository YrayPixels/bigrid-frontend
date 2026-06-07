"use client";

import { ContentPage } from "@/components/storefront/content-page";
import { useStorefront } from "@/lib/storefront/store-context";

export default function ContactPage() {
  const { storefront } = useStorefront();
  const page = storefront.pages?.contact;

  if (!page) {
    return <ContentPage title="Contact us" body="Reach out to the store owner for support." />;
  }

  const details = [
    page.email ? `Email: ${page.email}` : null,
    page.phone ? `Phone: ${page.phone}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <ContentPage title={page.title} body={[page.body, details].filter(Boolean).join("\n\n")} />
  );
}
