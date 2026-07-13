import type { StoreDiscount, StoreProduct } from "@/lib/api/types";

export type PricedUnit = {
  unitPrice: number;
  compareAtPrice: number | null;
  discountLabel: string | null;
};

function isDiscountActive(discount: StoreDiscount, now = Date.now()): boolean {
  if (discount.status !== "active") return false;
  if (discount.starts_at && new Date(discount.starts_at).getTime() > now) return false;
  if (discount.ends_at && new Date(discount.ends_at).getTime() < now) return false;
  if (discount.type === "seasonal" && !discount.starts_at && !discount.ends_at) return false;
  return true;
}

function appliesToProduct(discount: StoreDiscount, productId: string): boolean {
  const ids = discount.product_ids ?? [];
  if (!ids.length) return true;
  return ids.includes(productId);
}

function discountAmount(amount: number, discount: StoreDiscount): number {
  const value = Math.max(0, discount.discount_value);
  if (discount.discount_type === "percent") {
    return Math.round(((amount * Math.min(100, value)) / 100) * 100) / 100;
  }
  return Math.round(Math.min(amount, value) * 100) / 100;
}

export function productUnitPrice(
  product: StoreProduct,
  discounts: StoreDiscount[] = [],
): PricedUnit {
  if (typeof product.effective_price === "number") {
    return {
      unitPrice: product.effective_price,
      compareAtPrice: product.compare_at_price ?? null,
      discountLabel: product.discount_label ?? null,
    };
  }

  const regular = product.price;
  const sale =
    product.sale_price != null && product.sale_price >= 0 && product.sale_price < regular
      ? product.sale_price
      : null;
  const unit = sale ?? regular;
  const label: string | null = sale != null ? "Sale" : null;

  let best = unit;
  let bestLabel = label;
  for (const discount of discounts) {
    if (!isDiscountActive(discount)) continue;
    if (discount.type !== "product" && discount.type !== "seasonal") continue;
    if (!appliesToProduct(discount, product.id)) continue;
    const candidate = Math.max(0, Math.round((unit - discountAmount(unit, discount)) * 100) / 100);
    if (candidate < best) {
      best = candidate;
      bestLabel = discount.name;
    }
  }

  return {
    unitPrice: best,
    compareAtPrice: best < regular ? regular : null,
    discountLabel: best < regular ? bestLabel : null,
  };
}

export function cartThresholdDiscount(
  subtotal: number,
  discounts: StoreDiscount[] = [],
): { amount: number; label: string | null } {
  let bestAmount = 0;
  let bestLabel: string | null = null;

  for (const discount of discounts) {
    if (!isDiscountActive(discount)) continue;
    if (discount.type !== "cart_threshold") continue;
    const min = discount.min_subtotal ?? 0;
    if (subtotal < min) continue;
    const amount = discountAmount(subtotal, discount);
    if (amount > bestAmount) {
      bestAmount = amount;
      bestLabel = discount.name;
    }
  }

  return {
    amount: Math.round(Math.min(bestAmount, Math.max(0, subtotal)) * 100) / 100,
    label: bestLabel,
  };
}

export function mergeProductPerks(product: StoreProduct, storePerks?: string[] | null): string[] {
  const productPerks = (product.perks ?? []).map((perk) => perk.trim()).filter(Boolean);
  const globalPerks = (storePerks ?? []).map((perk) => perk.trim()).filter(Boolean);
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const perk of [...globalPerks, ...productPerks]) {
    const key = perk.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(perk);
  }
  return merged;
}
