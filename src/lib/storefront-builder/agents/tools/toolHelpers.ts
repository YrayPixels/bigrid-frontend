import { api } from "@/lib/api/client";
import type { StoreProduct } from "@/lib/api/types";

export function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function requireConfirm(args: Record<string, unknown>): boolean {
  return args.confirm === true;
}

function matchProductByName(
  products: StoreProduct[],
  productName: string,
): { product: StoreProduct | null; error?: string } {
  const needle = productName.toLowerCase();
  const exact = products.filter((item) => item.name.toLowerCase() === needle);
  if (exact.length === 1) return { product: exact[0] };
  if (exact.length > 1) {
    return { product: null, error: `Multiple products named "${productName}". Which one did you mean?` };
  }
  const fuzzy = products.filter((item) => item.name.toLowerCase().includes(needle));
  if (fuzzy.length === 1) return { product: fuzzy[0] };
  if (fuzzy.length > 1) {
    const names = fuzzy
      .slice(0, 5)
      .map((item) => item.name)
      .join(", ");
    return {
      product: null,
      error: `I found a few products that match "${productName}" (${names}). Which one should I update?`,
    };
  }
  return { product: null, error: `I couldn't find a product named "${productName}". Which product did you mean?` };
}

/** Resolve a product from the website draft catalog by id or unique name. */
export function resolveStorefrontProduct(
  products: StoreProduct[] | undefined,
  productId?: string,
  productName?: string,
): { product: StoreProduct | null; index: number; error?: string } {
  const list = Array.isArray(products) ? products : [];
  if (productId) {
    const index = list.findIndex((item) => item.id === productId);
    if (index >= 0) return { product: list[index], index };
    return { product: null, index: -1, error: `Product id not found: ${productId}` };
  }
  if (productName) {
    const matched = matchProductByName(list, productName);
    if (!matched.product) return { product: null, index: -1, error: matched.error };
    const index = list.findIndex((item) => item.id === matched.product!.id);
    return { product: matched.product, index };
  }
  return { product: null, index: -1, error: "Provide product_id or product_name." };
}

/** Resolve a live catalog product by id, or unique name match. */
export async function resolveLiveProduct(
  productId?: string,
  productName?: string,
): Promise<{ product: StoreProduct | null; products: StoreProduct[]; error?: string }> {
  const products = await api.getProducts();
  if (productId) {
    const product = products.find((item) => item.id === productId) ?? null;
    return product
      ? { product, products }
      : { product: null, products, error: `Product id not found: ${productId}` };
  }
  if (productName) {
    const matched = matchProductByName(products, productName);
    return { product: matched.product, products, error: matched.error };
  }
  return { product: null, products, error: "Provide product_id or product_name." };
}

export function syncStorefrontProduct(
  storefrontProducts: StoreProduct[] | undefined,
  updated: StoreProduct,
): StoreProduct[] | undefined {
  if (!Array.isArray(storefrontProducts)) return storefrontProducts;
  return storefrontProducts.map((item) => (item.id === updated.id ? { ...item, ...updated } : item));
}
