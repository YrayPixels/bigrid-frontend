import type { StoreProduct } from "@/lib/api/types";

export type SelectedOptions = Record<string, string>;
export type ProductVariantGroup = NonNullable<StoreProduct["variants"]>[number];

export function defaultSelectedOptions(
  variants: ProductVariantGroup[] | undefined | null,
): SelectedOptions {
  if (!variants?.length) return {};
  const selected: SelectedOptions = {};
  for (const group of variants) {
    if (group.options?.[0]) {
      selected[group.name] = group.options[0];
    }
  }
  return selected;
}

export function cartLineKey(productId: string, selectedOptions?: SelectedOptions | null): string {
  if (!selectedOptions || Object.keys(selectedOptions).length === 0) {
    return productId;
  }
  const fingerprint = Object.entries(selectedOptions)
    .filter(([, value]) => Boolean(value))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name}=${value}`)
    .join("|");
  return fingerprint ? `${productId}::${fingerprint}` : productId;
}

export function optionsMatch(
  a?: SelectedOptions | null,
  b?: SelectedOptions | null,
): boolean {
  return cartLineKey("x", a) === cartLineKey("x", b);
}

export function requireVariantSelection(
  product: StoreProduct,
  selectedOptions?: SelectedOptions | null,
): string | null {
  const groups = product.variants ?? [];
  if (!groups.length) return null;
  for (const group of groups) {
    if (!group.options?.length) continue;
    const picked = selectedOptions?.[group.name];
    if (!picked || !group.options.includes(picked)) {
      return `Select a ${group.name.toLowerCase()} before adding to cart.`;
    }
  }
  return null;
}

export function formatSelectedOptions(selectedOptions?: SelectedOptions | null): string {
  if (!selectedOptions) return "";
  return Object.entries(selectedOptions)
    .filter(([, value]) => Boolean(value))
    .map(([name, value]) => `${name}: ${value}`)
    .join(" · ");
}
