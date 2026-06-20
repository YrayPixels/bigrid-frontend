import type { StorefrontColorPalette } from "@/lib/api/types";

const HEX6 = /^#[0-9A-Fa-f]{6}$/;

export const PALETTE_KEYS: (keyof StorefrontColorPalette)[] = [
  "primary",
  "accent",
  "background",
  "surface",
  "text",
  "muted",
  "border",
];

export function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const hex = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return HEX6.test(hex) ? hex.toUpperCase() : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = normalizeHexColor(hex);
  if (!normalized) throw new Error("Invalid hex color");
  const n = parseInt(normalized.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 100) / 100;
  l = clamp(l, 0, 100) / 100;

  if (s === 0) {
    const gray = l * 255;
    return { r: gray, g: gray, b: gray };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hk = h / 360;

  return {
    r: hue2rgb(p, q, hk + 1 / 3) * 255,
    g: hue2rgb(p, q, hk) * 255,
    b: hue2rgb(p, q, hk - 1 / 3) * 255,
  };
}

export function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

const MIN_BODY_TEXT_CONTRAST = 4.5;
const MIN_MUTED_TEXT_CONTRAST = 3;
const MIN_BUTTON_TEXT_CONTRAST = 4.5;
const WHITE = "#FFFFFF";

function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

/** WCAG 2.1 contrast ratio between two colors (1–21). */
export function contrastRatio(foreground: string, background: string): number {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

function bestReadableFallback(against: string, minRatio: number): string {
  const dark = "#1A1A1A";
  const light = WHITE;
  const darkRatio = contrastRatio(dark, against);
  const lightRatio = contrastRatio(light, against);
  if (darkRatio >= minRatio) return dark;
  if (lightRatio >= minRatio) return light;
  return darkRatio >= lightRatio ? dark : light;
}

function adjustHslForContrast(
  color: string,
  against: string,
  minRatio: number,
  direction: "darker" | "lighter",
): string {
  if (contrastRatio(color, against) >= minRatio) return color;

  const { h, s, l } = hexToHsl(color);
  const step = direction === "darker" ? -1 : 1;

  for (let lightness = l; lightness >= 0 && lightness <= 100; lightness += step) {
    const candidate = hslToHex(h, s, lightness);
    if (contrastRatio(candidate, against) >= minRatio) return candidate;
    if (lightness === 0 || lightness === 100) break;
  }

  return bestReadableFallback(against, minRatio);
}

function ensureForegroundContrast(foreground: string, background: string, minRatio: number): string {
  if (contrastRatio(foreground, background) >= minRatio) return foreground;

  const { l: fgL } = hexToHsl(foreground);
  const { l: bgL } = hexToHsl(background);
  const direction = bgL >= fgL ? "darker" : "lighter";
  return adjustHslForContrast(foreground, background, minRatio, direction);
}

/** Fix text/background pairs so storefront copy and buttons stay readable (WCAG AA). */
export function ensureReadablePalette(palette: StorefrontColorPalette): StorefrontColorPalette {
  const result = { ...palette };

  const bgHsl = hexToHsl(result.background);
  let bgL = bgHsl.l;
  const surfaceHsl = hexToHsl(result.surface);
  let surfaceL = surfaceHsl.l;

  if (bgL < 85) {
    result.background = hslToHex(bgHsl.h, clamp(bgHsl.s, 0, 22), clamp(bgL + 30, 94, 98));
    bgL = hexToHsl(result.background).l;
  }
  if (surfaceL < 85) {
    result.surface = hslToHex(surfaceHsl.h, clamp(surfaceHsl.s, 0, 12), clamp(surfaceL + 30, 96, 99));
    surfaceL = hexToHsl(result.surface).l;
  }

  result.text = ensureForegroundContrast(result.text, result.background, MIN_BODY_TEXT_CONTRAST);
  if (contrastRatio(result.text, result.surface) < MIN_BODY_TEXT_CONTRAST) {
    result.text = ensureForegroundContrast(result.text, result.surface, MIN_BODY_TEXT_CONTRAST);
  }

  result.muted = ensureForegroundContrast(result.muted, result.background, MIN_MUTED_TEXT_CONTRAST);

  if (contrastRatio(WHITE, result.primary) < MIN_BUTTON_TEXT_CONTRAST) {
    result.primary = adjustHslForContrast(result.primary, WHITE, MIN_BUTTON_TEXT_CONTRAST, "darker");
  }

  const borderContrast = contrastRatio(result.border, result.background);
  if (borderContrast < 1.15) {
    const { h, s, l } = hexToHsl(result.border);
    result.border = hslToHex(h, s, clamp(l - 10, 72, 88));
  }

  return result;
}

/** Build a cohesive 7-color storefront palette from a primary brand color. */
export function derivePaletteFromPrimary(primary: string): StorefrontColorPalette {
  const normalized = normalizeHexColor(primary);
  if (!normalized) throw new Error("Invalid primary color");

  const { h, s, l } = hexToHsl(normalized);
  const sat = clamp(s, 18, 72);

  const palette: StorefrontColorPalette = {
    primary: normalized,
    accent: hslToHex((h + 28) % 360, clamp(sat * 0.75, 20, 55), clamp(l + 18, 52, 78)),
    background: hslToHex(h, clamp(sat * 0.18, 6, 22), clamp(96 + (l < 40 ? 2 : 0), 96, 98)),
    surface: hslToHex(h, clamp(sat * 0.06, 2, 12), 99),
    text: hslToHex(h, clamp(sat * 0.35, 10, 30), clamp(12, 10, 16)),
    muted: hslToHex(h, clamp(sat * 0.28, 12, 35), clamp(46, 38, 54)),
    border: hslToHex(h, clamp(sat * 0.22, 8, 28), clamp(86, 82, 90)),
  };

  return ensureReadablePalette(palette);
}

export function sanitizeStorefrontPalette(
  partial: Partial<Record<keyof StorefrontColorPalette, unknown>> | null | undefined,
  fallbackPrimary: string,
): StorefrontColorPalette | null {
  if (!partial) return null;

  const primary = normalizeHexColor(partial.primary) ?? normalizeHexColor(fallbackPrimary);
  if (!primary) return null;

  const derived = derivePaletteFromPrimary(primary);
  let foundAny = false;

  for (const key of PALETTE_KEYS) {
    const value = normalizeHexColor(partial[key]);
    if (value) {
      derived[key] = value;
      foundAny = true;
    }
  }

  if (!foundAny) return null;
  derived.primary = normalizeHexColor(partial.primary) ?? primary;
  return ensureReadablePalette(derived);
}

export function paletteChangedPaths(
  before: StorefrontColorPalette | undefined,
  after: StorefrontColorPalette,
): string[] {
  return PALETTE_KEYS.filter((key) => before?.[key]?.toUpperCase() !== after[key].toUpperCase()).map(
    (key) => `palette.${key}`,
  );
}

export function expandSwatchPaletteToTheme(
  brandColor: string,
  swatches: Array<{ color: string }>,
): StorefrontColorPalette {
  const palette = derivePaletteFromPrimary(brandColor);

  const accent = normalizeHexColor(swatches[1]?.color);
  if (accent) palette.accent = accent;

  const third = normalizeHexColor(swatches[2]?.color);
  if (third) {
    const { l } = hexToHsl(third);
    if (l > 85) palette.background = third;
    else palette.accent = third;
  }

  const fourth = normalizeHexColor(swatches[3]?.color);
  if (fourth) {
    const { l } = hexToHsl(fourth);
    if (l > 90) palette.surface = fourth;
    else if (l < 30) palette.text = fourth;
    else palette.muted = fourth;
  }

  return ensureReadablePalette(palette);
}
