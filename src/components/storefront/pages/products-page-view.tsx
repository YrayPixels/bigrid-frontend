"use client";

import { useStorefront } from "@/lib/storefront/store-context";
import { PageContainer } from "@/components/storefront/theme/page-container";
import { PageTitle } from "@/components/storefront/theme/page-title";
import { ProductCardThemed } from "@/components/storefront/theme/product-card-themed";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

export function ProductsPageView() {
  const { store, storefront } = useStorefront();
  const { theme, mode } = useStorefrontTheme();
  const products = (storefront.products ?? []).filter(
    (product) => mode === "edit" || (product.status ?? "active") === "active",
  );

  return (
    <PageContainer>
      <PageTitle title="Products" subtitle={`Shop the full catalog from ${store.business_name}.`} />
      <div className={`mt-10 grid gap-6 ${theme.productGridCols}`}>
        {products.map((product, index) => (
          <ProductCardThemed
            key={product.id}
            product={product}
            imagePath={`products.${index}.image_url`}
          />
        ))}
      </div>
    </PageContainer>
  );
}
