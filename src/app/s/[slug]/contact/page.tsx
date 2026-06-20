"use client";

import { PageRenderer } from "@/components/storefront/blocks/page-renderer";
import { useStorefront } from "@/lib/storefront/store-context";

export default function ContactPage() {
  const { store, storefront } = useStorefront();
  return <PageRenderer page="contact" store={store} storefront={storefront} />;
}
