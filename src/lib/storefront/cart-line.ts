import type { StoreProduct } from "@/lib/api/types";

export type SelectedOptions = Record<string, string>;

export type ProductVariantOption = {
  value: string;
  price: number | null;
  image_url: string | null;
};

export type ProductVariantGroup = {
  name: string;
  options: ProductVariantOption[];
};

export function normalizeVariantOption(option: unknown): ProductVariantOption | null {
  if (typeof option === "string") {
    const value = option.trim();
    if (!value) return null;
    return { value, price: null, image_url: null };
  }
  if (!option || typeof option !== "object") return null;
  const row = option as Record<string, unknown>;
  const value = String(row.value ?? row.label ?? row.name ?? "").trim();
  if (!value) return null;
  let price: number | null = null;
  if (row.price != null && row.price !== "") {
    const parsed = Number(row.price);
    if (Number.isFinite(parsed) && parsed >= 0) price = parsed;
  }
  const imageUrl =
    typeof row.image_url === "string" && row.image_url.trim()
      ? row.image_url.trim()
      : null;
  return { value, price, image_url: imageUrl };
}

export function normalizeVariantGroups(variants: unknown): ProductVariantGroup[] {
  if (!Array.isArray(variants)) return [];
  const groups: ProductVariantGroup[] = [];
  for (const group of variants) {
    if (!group || typeof group !== "object") continue;
    const name = String((group as { name?: unknown }).name ?? "").trim();
    const rawOptions = Array.isArray((group as { options?: unknown }).options)
      ? ((group as { options: unknown[] }).options as unknown[])
      : [];
    const options = rawOptions
      .map((option) => normalizeVariantOption(option))
      .filter((option): option is ProductVariantOption => option !== null);
    if (!name || options.length === 0) continue;
    groups.push({ name, options });
  }
  return groups;
}

export function defaultSelectedOptions(
  variants: StoreProduct["variants"] | ProductVariantGroup[] | undefined | null,
): SelectedOptions {
  const groups = normalizeVariantGroups(variants);
  const selected: SelectedOptions = {};
  for (const group of groups) {
    if (group.options[0]) selected[group.name] = group.options[0].value;
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
  const groups = normalizeVariantGroups(product.variants);
  if (!groups.length) return null;
  for (const group of groups) {
    const picked = selectedOptions?.[group.name];
    if (!picked || !group.options.some((option) => option.value === picked)) {
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

export function resolveVariantSelection(
  product: {
    price: number;
    sale_price?: number | null;
    image_url?: string | null;
    variants?: StoreProduct["variants"] | ProductVariantGroup[] | null;
  },
  selectedOptions?: SelectedOptions | null,
): {
  basePrice: number;
  imageUrl: string | null;
  optionPriceApplied: boolean;
} {
  const groups = normalizeVariantGroups(product.variants);
  const sale =
    product.sale_price != null &&
    product.sale_price >= 0 &&
    product.sale_price < product.price
      ? product.sale_price
      : null;
  let basePrice = sale ?? product.price;
  let imageUrl = product.image_url ?? null;
  const absolutePrices: number[] = [];

  for (const group of groups) {
    const picked = selectedOptions?.[group.name];
    if (!picked) continue;
    const option = group.options.find((row) => row.value === picked);
    if (!option) continue;
    if (option.price != null) absolutePrices.push(option.price);
    if (option.image_url) imageUrl = option.image_url;
  }

  if (absolutePrices.length > 0) {
    basePrice = Math.max(...absolutePrices);
  }

  return {
    basePrice,
    imageUrl,
    optionPriceApplied: absolutePrices.length > 0,
  };
}

/** Unit price for cart lines (variant absolute price when set, else catalog effective/sale). */
export function cartLineUnitPrice(
  product: StoreProduct,
  selectedOptions?: SelectedOptions | null,
): number {
  const selection = resolveVariantSelection(product, selectedOptions);
  if (selection.optionPriceApplied) return selection.basePrice;
  if (typeof product.effective_price === "number") return product.effective_price;
  return selection.basePrice;
}
