import type { StoreCategory, StoreProduct } from "@/lib/api/types";

export function categoryLabel(category: StoreCategory) {
  return category.parent_name ? `${category.parent_name} / ${category.name}` : category.name;
}

/** Resolve `?category_id=` / `?category=` values that may be an id or a slug. */
export function resolveCategoryIdFromQuery(
  raw: string | null | undefined,
  categories: StoreCategory[],
): string | null {
  if (!raw) return null;
  const needle = raw.trim();
  if (!needle) return null;

  const byId = categories.find((category) => category.id === needle);
  if (byId) return byId.id;

  const bySlug = categories.find(
    (category) => category.slug.toLowerCase() === needle.toLowerCase(),
  );
  if (bySlug) return bySlug.id;

  return null;
}

export function sortCatalogProducts(
  products: StoreProduct[],
  sortBy: "newest" | "price-low" | "price-high",
  catalogOrder: StoreProduct[],
): StoreProduct[] {
  const orderIndex = new Map(catalogOrder.map((product, index) => [product.id, index]));

  return [...products].sort((a, b) => {
    if (sortBy === "price-low") return a.price - b.price;
    if (sortBy === "price-high") return b.price - a.price;
    return (orderIndex.get(a.id) ?? 0) - (orderIndex.get(b.id) ?? 0);
  });
}

export function productCountForCategory(products: StoreProduct[], category: StoreCategory) {
  return products.filter((product) => productMatchesCategoryFilter(product, category.id, [category])).length;
}

export function productMatchesCategoryFilter(
  product: StoreProduct,
  selectedCategoryId: string | null,
  categories: StoreCategory[],
): boolean {
  if (!selectedCategoryId) return true;

  const selected = categories.find((category) => category.id === selectedCategoryId);
  if (!selected) return true;

  if (selected.id.startsWith("legacy:")) {
    return product.category?.toLowerCase() === selected.name.toLowerCase();
  }

  if (product.category_id) {
    return product.category_id === selectedCategoryId;
  }

  return product.category?.toLowerCase() === selected.name.toLowerCase();
}

/** Categories to show in storefront filters — API list trimmed to categories with products, or derived from catalog. */
export function resolveStorefrontFilterCategories(
  apiCategories: StoreCategory[] | undefined,
  products: StoreProduct[],
): StoreCategory[] {
  const fromApi = apiCategories ?? [];
  const withProducts = fromApi.filter((category) => productCountForCategory(products, category) > 0);
  if (withProducts.length) return withProducts;

  const seen = new Map<string, StoreCategory>();

  for (const product of products) {
    if (product.category_id) {
      if (!seen.has(product.category_id)) {
        seen.set(product.category_id, {
          id: product.category_id,
          name: product.category ?? "Category",
          slug: product.category_id,
        });
      }
      continue;
    }

    if (!product.category) continue;

    const key = `legacy:${product.category.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.set(key, {
        id: key,
        name: product.category,
        slug: product.category.toLowerCase().replace(/\s+/g, "-"),
      });
    }
  }

  return Array.from(seen.values());
}
