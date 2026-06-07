"use client";

import { ContentPage } from "@/components/storefront/content-page";
import { useStorefront } from "@/lib/storefront/store-context";

export default function PrivacyPolicyPage() {
  const { storefront } = useStorefront();
  const page = storefront.pages?.privacy_policy;

  return (
    <ContentPage
      title={page?.title ?? "Privacy policy"}
      body={
        page?.body ??
        "This storefront uses Storehaus platform defaults for privacy and data handling."
      }
    />
  );
}
