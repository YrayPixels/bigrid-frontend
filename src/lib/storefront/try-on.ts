import type { Store, StoreProduct } from "@/lib/api/types";

export type TryOnMode = "bag" | "clothes";

export type GarmentCategory =
  | "auto"
  | "full_body"
  | "upper_body"
  | "lower_body"
  | "outerwear"
  | "shoes";

export const GARMENT_CATEGORY_OPTIONS: { value: GarmentCategory; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "full_body", label: "Full body / dress" },
  { value: "upper_body", label: "Upper body" },
  { value: "lower_body", label: "Lower body" },
  { value: "outerwear", label: "Outerwear" },
  { value: "shoes", label: "Shoes" },
];

export function resolveTryOnRefImage(product: StoreProduct): string | null {
  const override = product.try_on?.ref_image_url?.trim();
  if (override) return override;
  if (product.image_url?.trim()) return product.image_url.trim();
  const gallery = product.images ?? [];
  for (const url of gallery) {
    if (typeof url === "string" && url.trim()) return url.trim();
  }
  return null;
}

export function getTryOnMode(product: StoreProduct): TryOnMode {
  return product.try_on?.mode === "clothes" ? "clothes" : "bag";
}

/** CTA shows when store + product try-on + ref image are ready (bag or clothes). */
export function isTryOnEligible(store: Store, product: StoreProduct): boolean {
  if (!store.features?.virtual_try_on?.enabled) return false;
  if (!product.try_on?.enabled) return false;
  if ((product.status ?? "active") !== "active") return false;
  if (product.try_on.mode !== "bag" && product.try_on.mode !== "clothes") return false;
  return resolveTryOnRefImage(product) !== null;
}

const LOOK_KEY_PREFIX = "storehause:tryon:look:";

export type SavedTryOnLook = {
  dataUrl: string;
  updatedAt: string;
};

function lookStorageKey(storeSlug: string, mode: TryOnMode) {
  return `${LOOK_KEY_PREFIX}${storeSlug}:${mode}`;
}

export function loadSavedTryOnLook(
  storeSlug: string,
  mode: TryOnMode = "bag",
): SavedTryOnLook | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(lookStorageKey(storeSlug, mode));
    if (!raw) {
      // Migrate legacy single-key looks for bags.
      if (mode === "bag") {
        const legacy = window.localStorage.getItem(`${LOOK_KEY_PREFIX}${storeSlug}`);
        if (legacy) {
          const parsed = JSON.parse(legacy) as SavedTryOnLook;
          if (parsed?.dataUrl) return parsed;
        }
      }
      return null;
    }
    const parsed = JSON.parse(raw) as SavedTryOnLook;
    if (!parsed?.dataUrl || typeof parsed.dataUrl !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveTryOnLook(
  storeSlug: string,
  dataUrl: string,
  mode: TryOnMode = "bag",
): void {
  if (typeof window === "undefined") return;
  try {
    const payload: SavedTryOnLook = {
      dataUrl,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(lookStorageKey(storeSlug, mode), JSON.stringify(payload));
  } catch {
    // Quota / private mode — ignore.
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read photo."));
    };
    reader.onerror = () => reject(new Error("Could not read photo."));
    reader.readAsDataURL(file);
  });
}

export function photoTipForMode(mode: TryOnMode, garmentCategory?: GarmentCategory | string | null): string {
  if (mode === "clothes") {
    if (
      garmentCategory === "full_body" ||
      garmentCategory === "lower_body" ||
      garmentCategory === "shoes" ||
      garmentCategory === "auto"
    ) {
      return "Upload a standing full-body photo (head to feet), face visible, facing forward. A close-up selfie will only generate from the chest up.";
    }
    return "Upload a standing photo with shoulders and upper body clear, face visible, facing forward.";
  }
  return "Upload a clear selfie showing your face and upper body.";
}
