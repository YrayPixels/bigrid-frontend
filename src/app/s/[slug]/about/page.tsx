"use client";

import { PageRenderer } from "@/components/storefront/blocks/page-renderer";
import { useStorefront } from "@/lib/storefront/store-context";

export default function AboutPage() {
  const { store, storefront } = useStorefront();
  return <PageRenderer page="about" store={store} storefront={storefront} />;
}
