"use client";

import { ContentPage } from "@/components/storefront/content-page";
import { useStorefront } from "@/lib/storefront/store-context";

export default function AboutPage() {
  const { storefront } = useStorefront();
  const page = storefront.pages?.about ?? storefront.about;

  return <ContentPage title={page.title} body={page.body} />;
}
