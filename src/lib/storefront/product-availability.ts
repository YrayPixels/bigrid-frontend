import type { StoreProduct } from "@/lib/api/types";

export function isProductInStock(product: StoreProduct): boolean {
  if (product.in_stock === false) return false;
  if (typeof product.stock_quantity === "number" && product.stock_quantity <= 0) return false;
  return true;
}

export function productAvailabilityError(product: StoreProduct): string | null {
  if (!isProductInStock(product)) return "This product is out of stock.";
  return null;
}

export function maxPurchaseQuantity(product: StoreProduct): number | null {
  if (typeof product.stock_quantity === "number" && product.stock_quantity > 0) {
    return product.stock_quantity;
  }
  return null;
}
