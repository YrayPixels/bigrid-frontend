import type { StoreProduct } from "@/lib/api/types";

export function normalizeProductSearchQuery(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

export function productMatchesSearch(
  product: StoreProduct,
  query: string | null | undefined,
): boolean {
  const normalized = normalizeProductSearchQuery(query).toLowerCase();
  if (!normalized) return true;

  const haystack = [
    product.name,
    product.description,
    product.category,
    product.brand,
    product.sku,
    product.barcode,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return normalized.split(" ").every((token) => haystack.includes(token));
}

export function filterProductsBySearch(
  products: StoreProduct[],
  query: string | null | undefined,
  limit?: number,
): StoreProduct[] {
  const matches = products.filter((product) => productMatchesSearch(product, query));
  if (limit == null || limit <= 0) return matches;
  return matches.slice(0, limit);
}
