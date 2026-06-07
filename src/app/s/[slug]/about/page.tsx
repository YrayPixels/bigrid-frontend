"use client";

import { ContentPageView } from "@/components/storefront/pages/content-page-view";
import { useStorefront } from "@/lib/storefront/store-context";

export default function AboutPage() {
  const { storefront } = useStorefront();
  const page = storefront.pages?.about ?? storefront.about;

  return <ContentPageView title={page.title} body={page.body} />;
}
