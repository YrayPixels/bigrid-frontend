import type { StoreCategory, StoreProduct } from "@/lib/api/types";

export function categoryLabel(category: StoreCategory) {
  return category.name;
}

export type StorefrontCategoryTreeNode = {
  category: StoreCategory;
  children: StoreCategory[];
};

/** Nest storefront categories under their parents for filter UIs. */
export function buildStorefrontCategoryTree(categories: StoreCategory[]): StorefrontCategoryTreeNode[] {
  const childrenByParent = new Map<string, StoreCategory[]>();
  const roots: StoreCategory[] = [];
  const byId = new Map(categories.map((category) => [category.id, category]));

  for (const category of categories) {
    if (category.parent_id && byId.has(category.parent_id)) {
      const siblings = childrenByParent.get(category.parent_id) ?? [];
      siblings.push(category);
      childrenByParent.set(category.parent_id, siblings);
    } else {
      roots.push(category);
    }
  }

  const sortByOrder = (a: StoreCategory, b: StoreCategory) =>
    (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name);

  return roots.sort(sortByOrder).map((category) => ({
    category,
    children: (childrenByParent.get(category.id) ?? []).sort(sortByOrder),
  }));
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

/** IDs that should match when a category (or its parent) is selected. */
export function categoryMatchIds(
  selectedCategoryId: string | null,
  categories: StoreCategory[],
): Set<string> {
  const matchIds = new Set<string>();
  if (!selectedCategoryId) return matchIds;

  matchIds.add(selectedCategoryId);
  for (const category of categories) {
    if (category.parent_id === selectedCategoryId) {
      matchIds.add(category.id);
    }
  }
  return matchIds;
}

function categoryHasDirectProducts(products: StoreProduct[], category: StoreCategory): boolean {
  if (category.id.startsWith("legacy:")) {
    return products.some(
      (product) => product.category?.toLowerCase() === category.name.toLowerCase(),
    );
  }

  return products.some((product) => {
    if (product.category_id === category.id) return true;
    if (!product.category_id && product.category?.toLowerCase() === category.name.toLowerCase()) {
      return true;
    }
    return false;
  });
}

/** Product count for a category, including products in its subcategories. */
export function productCountForCategory(
  products: StoreProduct[],
  category: StoreCategory,
  categories: StoreCategory[],
) {
  return products.filter((product) =>
    productMatchesCategoryFilter(product, category.id, categories),
  ).length;
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

  const matchIds = categoryMatchIds(selectedCategoryId, categories);

  if (product.category_id) {
    return matchIds.has(product.category_id);
  }

  if (!product.category) return false;

  return categories.some(
    (category) =>
      matchIds.has(category.id) &&
      category.name.toLowerCase() === product.category!.toLowerCase(),
  );
}

/**
 * Categories to show in storefront filters — includes parents of matching
 * subcategories so the filter can nest children under their parents.
 */
export function resolveStorefrontFilterCategories(
  apiCategories: StoreCategory[] | undefined,
  products: StoreProduct[],
): StoreCategory[] {
  const fromApi = apiCategories ?? [];
  if (fromApi.length) {
    const byId = new Map(fromApi.map((category) => [category.id, category]));
    const withOwnProducts = fromApi.filter((category) =>
      categoryHasDirectProducts(products, category),
    );
    const included = new Map<string, StoreCategory>();

    for (const category of withOwnProducts) {
      included.set(category.id, category);
      if (category.parent_id) {
        const parent = byId.get(category.parent_id);
        if (parent) included.set(parent.id, parent);
      }
    }

    if (included.size) {
      return Array.from(included.values()).sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name),
      );
    }
  }

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
