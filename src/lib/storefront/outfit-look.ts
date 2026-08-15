import type { ShoppingLook, ShoppingLookItem, Store, StoreProduct } from "@/lib/api/types";
import { getTryOnMode, isTryOnEligible, type TryOnMode } from "@/lib/storefront/try-on";

export type CartOutfit = {
  id: string;
  name: string;
  result_url?: string | null;
};

const OUTFIT_PREVIEW_PREFIX = "storehause:outfit-preview:";

export function lookItemUnitPrice(product: StoreProduct): number {
  return Number(product.effective_price ?? product.sale_price ?? product.price ?? 0);
}

export function lookItemsTotal(items: ShoppingLookItem[]): number {
  return items.reduce((sum, item) => sum + lookItemUnitPrice(item.product), 0);
}

export function selectedLookItems(look: ShoppingLook, selectedIds: string[]): ShoppingLookItem[] {
  const selected = new Set(selectedIds);
  const items = look.items.filter((item) => selected.has(item.product_id));
  return items.length > 0 ? items : look.items;
}

export function tryOnEligibleLookItems(
  store: Store,
  items: ShoppingLookItem[],
): ShoppingLookItem[] {
  return items.filter((item) => isTryOnEligible(store, item.product) && canLayerInOutfit(item.product));
}

export function canLayerInOutfit(product: StoreProduct): boolean {
  const mode = getTryOnMode(product);
  return mode !== "nail" && mode !== "watch";
}

const LAYER_RANK: Record<string, number> = {
  "clothes:full_body": 10,
  "clothes:auto": 12,
  "fabric": 14,
  "clothes:upper_body": 20,
  "clothes:lower_body": 25,
  "clothes:outerwear": 30,
  "clothes:shoes": 40,
  "shoes": 42,
  "bag": 50,
  "hat": 60,
  "necklace": 70,
};

function layerKey(product: StoreProduct): string {
  const mode = getTryOnMode(product);
  if (mode === "clothes") {
    const category = product.try_on?.garment_category ?? "auto";
    return `clothes:${category}`;
  }
  return mode;
}

export function orderOutfitTryOnItems(items: ShoppingLookItem[]): ShoppingLookItem[] {
  return [...items].sort((a, b) => {
    const rankA = LAYER_RANK[layerKey(a.product)] ?? 90;
    const rankB = LAYER_RANK[layerKey(b.product)] ?? 90;
    if (rankA !== rankB) return rankA - rankB;
    return 0;
  });
}

export function outfitPhotoTip(items: ShoppingLookItem[]): string {
  const modes = new Set(items.map((item) => getTryOnMode(item.product)));
  if (modes.has("clothes") || modes.has("shoes") || modes.has("fabric")) {
    return "Upload a standing full-body photo (head to feet), face visible, facing forward so we can layer the whole look.";
  }
  if (modes.has("necklace") || modes.has("hat") || modes.has("bag")) {
    return "Upload a clear photo showing your face and upper body, facing forward.";
  }
  return "Upload a standing full-body photo, face visible, facing forward.";
}

export function outfitNeedsGender(items: ShoppingLookItem[]): boolean {
  return items.some((item) => {
    const mode = getTryOnMode(item.product);
    if (mode !== "bag" && mode !== "hat" && mode !== "shoes") return false;
    return (item.product.try_on?.bag_gender_default ?? "ask") === "ask";
  });
}

export function defaultOutfitGender(items: ShoppingLookItem[]): "female" | "male" {
  for (const item of items) {
    const gender = item.product.try_on?.bag_gender_default;
    if (gender === "male" || gender === "female") return gender;
  }
  return "female";
}

export function lookCurrency(look: ShoppingLook, items: ShoppingLookItem[]): string {
  return items[0]?.product.currency || look.currency || "NGN";
}

function previewStorageKey(storeId: string) {
  return `${OUTFIT_PREVIEW_PREFIX}${storeId}`;
}

export function saveOutfitPreview(storeId: string, outfit: CartOutfit, productIds: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      previewStorageKey(storeId),
      JSON.stringify({
        ...outfit,
        product_ids: productIds,
        saved_at: new Date().toISOString(),
      }),
    );
  } catch {
    // quota / private mode
  }
}

export function loadOutfitPreview(
  storeId: string,
): (CartOutfit & { product_ids: string[] }) | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(previewStorageKey(storeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CartOutfit & { product_ids?: string[] };
    if (!parsed?.id || !parsed?.name) return null;
    return {
      id: parsed.id,
      name: parsed.name,
      result_url: parsed.result_url ?? null,
      product_ids: Array.isArray(parsed.product_ids) ? parsed.product_ids : [],
    };
  } catch {
    return null;
  }
}

export function clearOutfitPreview(storeId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(previewStorageKey(storeId));
  } catch {
    // ignore
  }
}

export function resolveCartOutfit(
  storeId: string,
  lines: Array<{ product: StoreProduct; outfit?: CartOutfit | null }>,
): (CartOutfit & { product_ids: string[] }) | null {
  const fromLines = lines.find((line) => line.outfit?.id)?.outfit;
  if (fromLines) {
    const productIds = lines
      .filter((line) => line.outfit?.id === fromLines.id)
      .map((line) => line.product.id);
    return {
      id: fromLines.id,
      name: fromLines.name,
      result_url: fromLines.result_url ?? null,
      product_ids: productIds,
    };
  }
  return loadOutfitPreview(storeId);
}

export function isTryOnAsk(message: string): boolean {
  const lower = message.trim().toLowerCase();
  if (!lower) return false;
  if (lower.includes("see it on")) return true;
  if (lower.includes("try this look") || lower.includes("try the look")) return true;
  if (lower.includes("try the outfit") || lower.includes("try this outfit")) return true;
  if (lower.includes("try it on") || lower.includes("try them on")) return true;
  if (lower.includes("try on me") || lower.includes("try it on me")) return true;
  if (/\bcan i try\b/.test(lower) || /\bcan we try\b/.test(lower)) return true;
  if (lower === "try it on" || lower === "try on") return true;
  return false;
}

export function outfitModeForPhoto(items: ShoppingLookItem[]): TryOnMode {
  const ordered = orderOutfitTryOnItems(items);
  return ordered[0] ? getTryOnMode(ordered[0].product) : "clothes";
}
