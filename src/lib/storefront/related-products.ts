import type { StoreCategory, StoreProduct } from "@/lib/api/types";
import { productMatchesCategoryFilter } from "@/lib/storefront/category-filters";

export function relatedProductsFor(
  product: StoreProduct,
  catalog: StoreProduct[],
  categories: StoreCategory[] = [],
  limit = 4,
): StoreProduct[] {
  const others = catalog.filter(
    (item) => item.id !== product.id && (item.status ?? "active") === "active",
  );

  const categoryId = product.category_id ?? null;
  if (categoryId || product.category) {
    const sameCategory = others.filter((item) =>
      categoryId
        ? productMatchesCategoryFilter(item, categoryId, categories)
        : item.category?.toLowerCase() === product.category?.toLowerCase(),
    );
    if (sameCategory.length) return sameCategory.slice(0, limit);
  }

  return others.slice(0, limit);
}
