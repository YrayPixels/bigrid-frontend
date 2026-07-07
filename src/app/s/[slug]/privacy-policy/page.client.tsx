"use client";

import { ContentPageView } from "@/components/storefront/pages/content-page-view";
import { useStorefront } from "@/lib/storefront/store-context";

export default function PrivacyPolicyPageClient() {
  const { storefront } = useStorefront();
  const page = storefront.pages?.privacy_policy;

  return (
    <ContentPageView
      title={page?.title ?? "Privacy policy"}
      body={
        page?.body ??
        "This storefront uses Bizgrid platform defaults for privacy and data handling."
      }
    />
  );
}

