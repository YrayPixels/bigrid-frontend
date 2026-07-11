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
    const needle = productName.toLowerCase();
    const matches = products.filter((item) => item.name.toLowerCase() === needle);
    if (matches.length === 1) return { product: matches[0], products };
    if (matches.length > 1) {
      return {
        product: null,
        products,
        error: `Multiple products named "${productName}". Pass product_id.`,
      };
    }
    const fuzzy = products.filter((item) => item.name.toLowerCase().includes(needle));
    if (fuzzy.length === 1) return { product: fuzzy[0], products };
    return {
      product: null,
      products,
      error: fuzzy.length
        ? `Ambiguous name "${productName}". Pass product_id.`
        : `No product named "${productName}". Call list_products first.`,
    };
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
