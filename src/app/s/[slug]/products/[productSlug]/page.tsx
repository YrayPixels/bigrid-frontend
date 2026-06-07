"use client";

import { useParams } from "next/navigation";
import { ProductDetailPageView } from "@/components/storefront/pages/product-detail-page-view";
import { useStorefront } from "@/lib/storefront/store-context";

export default function ProductDetailPage() {
  const params = useParams<{ productSlug: string }>();
  const { storefront } = useStorefront();
  const product = (storefront.products ?? []).find(
    (entry) => entry.slug === params.productSlug && (entry.status ?? "active") === "active",
  );

  return <ProductDetailPageView product={product ?? null} />;
}
