"use client";

import { PageRenderer } from "@/components/storefront/blocks/page-renderer";
import { useStorefront } from "@/lib/storefront/store-context";

export default function FaqPage() {
  const { store, storefront } = useStorefront();
  return <PageRenderer page="faq" store={store} storefront={storefront} />;
}
