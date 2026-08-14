import type { Store, StoreProduct, TryOnMode } from "@/lib/api/types";

export type { TryOnMode };

export type GarmentCategory =
  | "auto"
  | "full_body"
  | "upper_body"
  | "lower_body"
  | "outerwear"
  | "shoes";

export type LookPhotoGroup = "selfie" | "full_body" | "hand";

export const TRY_ON_MODES: { value: TryOnMode; label: string }[] = [
  { value: "bag", label: "Bag" },
  { value: "clothes", label: "Clothes / dress" },
  { value: "hat", label: "Hat / headwear" },
  { value: "shoes", label: "Shoes" },
  { value: "nail", label: "Nails" },
  { value: "watch", label: "Watch" },
  { value: "necklace", label: "Necklace" },
  { value: "fabric", label: "Fabric" },
];

export const GARMENT_CATEGORY_OPTIONS: { value: GarmentCategory; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "full_body", label: "Full body / dress" },
  { value: "upper_body", label: "Upper body" },
  { value: "lower_body", label: "Lower body" },
  { value: "outerwear", label: "Outerwear" },
  { value: "shoes", label: "Footwear (outfit)" },
];

export const BAG_STYLE_OPTIONS = [
  { value: "random", label: "Surprise me" },
  { value: "style_parisian_chic", label: "Parisian" },
  { value: "style_urban_chic", label: "Urban" },
  { value: "style_mediterranean_chic", label: "Mediterranean" },
  { value: "style_art_deco_style", label: "Art deco" },
] as const;

export const HAT_STYLE_OPTIONS = [
  { value: "random", label: "Surprise me" },
  { value: "style_sporty_casual", label: "Sporty casual" },
  { value: "style_urban_fashion", label: "Urban fashion" },
  { value: "style_vacation_casual", label: "Vacation casual" },
  { value: "style_warm_cozy", label: "Warm cozy" },
  { value: "style_bohemian", label: "Bohemian" },
] as const;

export const SHOES_STYLE_OPTIONS = [
  { value: "random", label: "Surprise me" },
  { value: "style_minimalist", label: "Minimalist" },
  { value: "style_bohemian", label: "Bohemian" },
  { value: "style_cottagecore", label: "Cottagecore" },
  { value: "style_french_elegance", label: "French elegance" },
  { value: "style_retro_fashion", label: "Retro fashion" },
] as const;

export const NAIL_EFFECT_OPTIONS = [
  { value: "nail_polish", label: "Nail polish" },
  { value: "press_on_nails", label: "Press-on nails" },
] as const;

export const NAIL_SUB_TYPE_OPTIONS = [
  { value: "color", label: "Solid color" },
  { value: "design", label: "Design image" },
] as const;

export const NAIL_POLISH_TEXTURE_OPTIONS = [
  { value: "cream", label: "Cream" },
  { value: "matte", label: "Matte" },
  { value: "metallic", label: "Metallic" },
  { value: "jelly", label: "Jelly" },
  { value: "sheer", label: "Sheer" },
  { value: "pearl", label: "Pearl" },
  { value: "textured", label: "Textured" },
  { value: "shimmer_coarse", label: "Coarse shimmer" },
  { value: "shimmer_fine", label: "Fine shimmer" },
] as const;

export const NAIL_PRESS_ON_TEXTURE_OPTIONS = [
  { value: "cream", label: "Cream" },
  { value: "matte", label: "Matte" },
  { value: "metallic", label: "Metallic" },
] as const;

export const NAIL_SHAPE_OPTIONS = [
  { value: "square_oval", label: "Square oval" },
  { value: "square_square", label: "Square" },
  { value: "square_squoval", label: "Square squoval" },
  { value: "squoval_oval", label: "Squoval oval" },
  { value: "squoval_square", label: "Squoval square" },
  { value: "squoval_squoval", label: "Squoval" },
  { value: "oval_oval", label: "Oval" },
  { value: "oval_square", label: "Oval square" },
  { value: "oval_squoval", label: "Oval squoval" },
  { value: "almond_oval", label: "Almond oval" },
  { value: "almond_square", label: "Almond square" },
  { value: "almond_squoval", label: "Almond squoval" },
  { value: "stiletto_oval", label: "Stiletto oval" },
  { value: "stiletto_square", label: "Stiletto square" },
  { value: "stiletto_squoval", label: "Stiletto squoval" },
] as const;

const MODE_VALUES = new Set(TRY_ON_MODES.map((option) => option.value));

export function isTryOnMode(value: string | null | undefined): value is TryOnMode {
  return Boolean(value && MODE_VALUES.has(value as TryOnMode));
}

export function styleOptionsForMode(mode: TryOnMode) {
  if (mode === "hat") return HAT_STYLE_OPTIONS;
  if (mode === "shoes") return SHOES_STYLE_OPTIONS;
  return BAG_STYLE_OPTIONS;
}

export function usesGenderStyle(mode: TryOnMode): boolean {
  return mode === "bag" || mode === "hat" || mode === "shoes";
}

export function lookPhotoGroup(mode: TryOnMode): LookPhotoGroup {
  if (mode === "nail" || mode === "watch") return "hand";
  if (mode === "clothes" || mode === "shoes" || mode === "fabric") return "full_body";
  return "selfie";
}

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
  return isTryOnMode(product.try_on?.mode) ? product.try_on.mode : "bag";
}

/** CTA shows when store + product try-on + required assets are ready. */
export function isTryOnEligible(store: Store, product: StoreProduct): boolean {
  if (!store.features?.virtual_try_on?.enabled) return false;
  if (!product.try_on?.enabled) return false;
  if ((product.status ?? "active") !== "active") return false;
  const mode = product.try_on.mode;
  if (!isTryOnMode(mode)) return false;
  if (mode === "fabric") return Boolean(product.try_on.fabric_template_id?.trim());
  if (mode === "nail" && (product.try_on.nail_sub_type ?? "color") === "color") return true;
  return resolveTryOnRefImage(product) !== null;
}

const LOOK_KEY_PREFIX = "storehause:tryon:look:";

export type SavedTryOnLook = {
  dataUrl: string;
  updatedAt: string;
};

function lookStorageKey(storeSlug: string, group: LookPhotoGroup) {
  return `${LOOK_KEY_PREFIX}${storeSlug}:${group}`;
}

function parseSavedLook(raw: string | null): SavedTryOnLook | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedTryOnLook;
    if (!parsed?.dataUrl || typeof parsed.dataUrl !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function loadSavedTryOnLook(
  storeSlug: string,
  mode: TryOnMode = "bag",
): SavedTryOnLook | null {
  if (typeof window === "undefined") return null;
  const group = lookPhotoGroup(mode);
  const fromGroup = parseSavedLook(window.localStorage.getItem(lookStorageKey(storeSlug, group)));
  if (fromGroup) return fromGroup;

  const fromMode = parseSavedLook(window.localStorage.getItem(`${LOOK_KEY_PREFIX}${storeSlug}:${mode}`));
  if (fromMode) return fromMode;

  if (group === "selfie") {
    return parseSavedLook(window.localStorage.getItem(`${LOOK_KEY_PREFIX}${storeSlug}`));
  }

  return null;
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
    window.localStorage.setItem(
      lookStorageKey(storeSlug, lookPhotoGroup(mode)),
      JSON.stringify(payload),
    );
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
  if (mode === "hat") {
    return "Upload a clear selfie with your face fully visible and unobstructed.";
  }
  if (mode === "shoes") {
    return "Upload a standing full-body photo with your feet visible, facing forward.";
  }
  if (mode === "nail") {
    return "Upload a photo of the back of your hand with all five nails clearly visible.";
  }
  if (mode === "watch") {
    return "Upload a photo of the back of your wrist with all five fingers clearly shown.";
  }
  if (mode === "necklace") {
    return "Upload a front-facing selfie with your neck clearly visible and unobstructed.";
  }
  if (mode === "fabric") {
    return "Upload a standing full-body photo, face visible, shoulders and abdomen in frame, facing forward.";
  }
  return "Upload a clear selfie showing your face and upper body.";
}

export function refImageHintForMode(mode: TryOnMode): string {
  switch (mode) {
    case "clothes":
      return "Use a front-facing single garment shot (or worn outfit that fully covers the apply area).";
    case "hat":
      return "Use a clean front-facing hat shot on a plain background.";
    case "shoes":
      return "Use a clear pair shot, both shoes visible, plain background.";
    case "nail":
      return "For design looks, use a single-nail PNG with a transparent background.";
    case "watch":
      return "Use a front view of the watch face with the strap cropped to a realistic wearing length.";
    case "necklace":
      return "Use a front-facing worn necklace shot with the background removed.";
    case "fabric":
      return "Fabric try-on uses a PerfectCorp template, not the product photo.";
    default:
      return "Use a clean front-facing product shot. Single item, well lit.";
  }
}
