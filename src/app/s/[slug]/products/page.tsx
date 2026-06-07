"use client";

import { ProductCard } from "@/components/storefront/product-card";
import { useStorefront } from "@/lib/storefront/store-context";

export default function ProductsPage() {
  const { store, storefront } = useStorefront();
  const products = storefront.products ?? [];

  return (
    <div className="w-full px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-bold tracking-tight">Products</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Shop the full catalog from {store.business_name}.
      </p>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} brandColor={store.brand_color} />
        ))}
      </div>
    </div>
  );
}
