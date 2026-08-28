import type { StoreProduct } from "@/lib/api/types";
import {
  cartLineKey,
  cartLineUnitPrice,
  defaultSelectedOptions,
  type SelectedOptions,
} from "@/lib/storefront/cart-line";
import type { CartLine } from "@/lib/storefront/cart-context";

const CART_PREFIX = "storehaus_cart_";

function storageKey(storeId: string) {
  return `${CART_PREFIX}${storeId}`;
}

function lineIdentity(line: CartLine) {
  return cartLineKey(line.product.id, line.selectedOptions);
}

function resolveOptions(
  product: StoreProduct,
  selectedOptions?: SelectedOptions,
): SelectedOptions | undefined {
  const groups = product.variants ?? [];
  if (!groups.length) return undefined;
  if (selectedOptions && Object.keys(selectedOptions).length > 0) {
    return selectedOptions;
  }
  const defaults = defaultSelectedOptions(groups);
  return Object.keys(defaults).length > 0 ? defaults : undefined;
}

function normalizeLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const lines: CartLine[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const line = entry as CartLine;
    if (!line.product?.id || typeof line.quantity !== "number") continue;
    const selectedOptions =
      line.selectedOptions && typeof line.selectedOptions === "object"
        ? Object.fromEntries(
            Object.entries(line.selectedOptions).filter(
              ([name, value]) => typeof name === "string" && typeof value === "string",
            ),
          )
        : undefined;
    lines.push({
      product: line.product,
      quantity: line.quantity,
      ...(selectedOptions && Object.keys(selectedOptions).length > 0 ? { selectedOptions } : {}),
    });
  }
  return lines;
}

export function readStoreCart(storeId: string): CartLine[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(storageKey(storeId));
  if (!raw) return [];
  try {
    return normalizeLines(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeStoreCart(storeId: string, lines: CartLine[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(storeId), JSON.stringify(lines));
}

export function addToStoreCart(
  storeId: string,
  product: StoreProduct,
  quantity = 1,
  selectedOptions?: SelectedOptions,
): CartLine[] {
  const options = resolveOptions(product, selectedOptions);
  const key = cartLineKey(product.id, options);
  const current = readStoreCart(storeId);
  const existing = current.find((line) => lineIdentity(line) === key);

  const next = existing
    ? current.map((line) =>
        lineIdentity(line) === key ? { ...line, quantity: line.quantity + quantity } : line,
      )
    : [...current, { product, quantity, selectedOptions: options }];

  writeStoreCart(storeId, next);
  return next;
}

export type PlatformStoreCart = {
  store_id: string;
  lines: CartLine[];
};

export function readAllPlatformCarts(): PlatformStoreCart[] {
  if (typeof window === "undefined") return [];

  const carts: PlatformStoreCart[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(CART_PREFIX)) continue;
    const storeId = key.slice(CART_PREFIX.length);
    const lines = readStoreCart(storeId);
    if (lines.length > 0) {
      carts.push({ store_id: storeId, lines });
    }
  }
  return carts;
}

export function summarizePlatformCartLines(lines: CartLine[]) {
  return {
    item_count: lines.reduce((sum, line) => sum + line.quantity, 0),
    subtotal: lines.reduce(
      (sum, line) => sum + cartLineUnitPrice(line.product, line.selectedOptions) * line.quantity,
      0,
    ),
    currency: lines[0]?.product.currency ?? null,
    lines: lines.map((line) => ({
      product_id: line.product.id,
      name: line.product.name,
      quantity: line.quantity,
      unit_price: cartLineUnitPrice(line.product, line.selectedOptions),
      selected_options: line.selectedOptions ?? null,
    })),
  };
}

export function checkoutPathForStore(storeSlug: string): string {
  return `/s/${storeSlug}/checkout`;
}

export function cartPathForStore(storeSlug: string): string {
  return `/s/${storeSlug}/cart`;
}
