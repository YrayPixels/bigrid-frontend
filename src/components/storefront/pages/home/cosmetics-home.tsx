"use client";

import type { Store, StorefrontContent } from "@/lib/api/types";
import { HomePageRenderer } from "@/components/storefront/blocks/page-renderer";

export function CosmeticsHome({
  storefront,
  store,
}: {
  store: Store;
  storefront: StorefrontContent;
}) {
  return <HomePageRenderer store={store} storefront={storefront} />;
}
