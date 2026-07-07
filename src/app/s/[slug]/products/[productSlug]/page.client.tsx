"use client";

import { useParams } from "next/navigation";
import { ProductDetailPageView } from "@/components/storefront/pages/product-detail-page-view";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

export default function ProductDetailPageClient() {
  const params = useParams<{ productSlug: string }>();
  const { storefront } = useStorefront();
  const { mode } = useStorefrontTheme();
  const product = (storefront.products ?? []).find(
    (entry) =>
      entry.slug === params.productSlug &&
      (mode === "edit" || (entry.status ?? "active") === "active"),
  );

  return <ProductDetailPageView product={product ?? null} />;
}

