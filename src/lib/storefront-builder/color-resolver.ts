import type { StorefrontColorPalette } from "@/lib/api/types";
import { parseJsonObject } from "@/lib/storefront-builder/agents/agentThinking";
import { getAssistantMessageContent, getThinkingModelName, postChat } from "@/lib/storefront-builder/agents/openaiChat";
import {
  derivePaletteFromPrimary,
  normalizeHexColor,
  PALETTE_KEYS,
  sanitizeStorefrontPalette,
} from "@/lib/storefront/palette-utils";

export type BrandColorContext = {
  business_name?: string | null;
  industry?: string | null;
  description?: string | null;
  current_color?: string | null;
  current_palette?: Partial<StorefrontColorPalette> | null;
};

export type PaletteResolution = {
  brand_color: string;
  label: string;
  palette: StorefrontColorPalette;
};

export type BrandColorResolution = PaletteResolution;

const OPEN_COLOR_REQUEST_PATTERN =
  /\b(random|surprise|unexpected|different|fresh|wild|crazy|fun)\b.*\b(color|colour|shade|hue|palette)\b/i;

const PICK_COLOR_REQUEST_PATTERN =
  /\b(give me|pick|choose|select|suggest|show me)\b.*\b(random|any|a?\s*color|a?\s*colour|something|anything)\b/i;

export function isOpenEndedColorRequest(message: string): boolean {
  const trimmed = message.trim().toLowerCase();
  if (/\bsurprise me\b/.test(trimmed)) return true;
  if (OPEN_COLOR_REQUEST_PATTERN.test(message)) return true;
  if (PICK_COLOR_REQUEST_PATTERN.test(message)) return true;
  if (/\b(very\s+)?random\s+(color|colour)\b/i.test(message)) return true;
  if (/\bany\s+(color|colour)\b/i.test(message)) return true;
  if (/\bdifferent\s+(color|colour)\b/i.test(message)) return true;
  if (/\bgive me a very random color\b/i.test(trimmed)) return true;
  return false;
}

export function isRandomColorRequest(message: string): boolean {
  return isOpenEndedColorRequest(message);
}

const PALETTE_AI_SYSTEM_PROMPT =
  "You choose cohesive website color palettes for small business storefronts.\n" +
  "Return ONLY valid JSON with keys:\n" +
  '- "label": short palette name (e.g. "Soft Botanical")\n' +
  '- "brand_color": "#RRGGBB" — same as palette.primary\n' +
  '- "palette": object with ALL keys primary, accent, background, surface, text, muted, border — each a six-digit hex\n' +
  "Rules:\n" +
  "- primary: main brand/button color — must reach at least 4.5:1 contrast against white (#FFFFFF) for button labels; avoid pale pastels as primary unless darkened enough\n" +
  "- accent: complementary or analogous highlight for banners and accents\n" +
  "- background: very light page wash (roughly #F5F5F5–#FAFAFA) harmonizing with primary — never mid or dark tones\n" +
  "- surface: cards/sections — white or near-white (#FAFAFA–#FFFFFF) with a subtle tint\n" +
  "- text: dark body copy (#111111–#333333 range) with at least 4.5:1 contrast on both background and surface\n" +
  "- muted: secondary text/captions — clearly darker than background, at least 3:1 contrast on background; never light gray on off-white\n" +
  "- border: subtle dividers between surface and background\n" +
  "CRITICAL: Never pair similar-lightness text and backgrounds (e.g. #E0E0E0 text on #F5F5F5 background). Verify readability before returning.\n" +
  "Interpret ANY color name or mood: pink, soft lavender, earthy brown, warm sunset, ocean blue, etc.\n" +
  "When the merchant describes a palette mood (warm, minimal, luxe, playful), reflect it across ALL seven colors while keeping text readable.\n" +
  "Do not return only a primary — the full palette must work together on a storefront page.";

function parsePaletteFromAi(raw: unknown, fallbackPrimary: string): StorefrontColorPalette | null {
  if (!raw || typeof raw !== "object") return null;
  return sanitizeStorefrontPalette(raw as Partial<Record<keyof StorefrontColorPalette, unknown>>, fallbackPrimary);
}

export async function resolvePaletteWithAi(
  message: string,
  context: BrandColorContext = {},
): Promise<PaletteResolution | null> {
  const randomPick = isRandomColorRequest(message);

  try {
    const data = await postChat({
      model: await getThinkingModelName(),
      temperature: randomPick ? 0.95 : 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            PALETTE_AI_SYSTEM_PROMPT +
            (randomPick
              ? "\nThe merchant asked for a random or surprise palette — pick a distinctive, attractive scheme that fits their industry and differs from current_palette if provided."
              : ""),
        },
        {
          role: "user",
          content: JSON.stringify({
            merchant_request: message,
            business_name: context.business_name ?? null,
            industry: context.industry ?? null,
            description: context.description ?? null,
            current_brand_color: context.current_color ?? null,
            current_palette: context.current_palette ?? null,
            wants_random_color: randomPick,
          }),
        },
      ],
    });

    const parsed = parseJsonObject<{
      brand_color?: string;
      label?: string;
      palette?: unknown;
    }>(getAssistantMessageContent(data), {});

    const brandColor =
      normalizeHexColor(parsed.brand_color) ??
      normalizeHexColor(
        parsed.palette && typeof parsed.palette === "object"
          ? (parsed.palette as { primary?: string }).primary
          : null,
      );
    if (!brandColor) return null;

    const palette =
      parsePaletteFromAi(parsed.palette, brandColor) ?? derivePaletteFromPrimary(brandColor);

    for (const key of PALETTE_KEYS) {
      if (!normalizeHexColor(palette[key])) return null;
    }

    const label =
      typeof parsed.label === "string" && parsed.label.trim()
        ? parsed.label.trim()
        : randomPick
          ? "Surprise palette"
          : "Custom palette";

    return {
      brand_color: palette.primary,
      label,
      palette,
    };
  } catch {
    return null;
  }
}

export async function resolveBrandColorWithAi(
  message: string,
  context: BrandColorContext = {},
): Promise<BrandColorResolution | null> {
  return resolvePaletteWithAi(message, context);
}

export async function fetchResolvedBrandColor(
  message: string,
  context: BrandColorContext = {},
): Promise<PaletteResolution | null> {
  const response = await fetch("/api/storefront-builder/ai/resolve-color", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, context }),
  });

  if (!response.ok) return null;

  const payload = (await response.json().catch(() => null)) as PaletteResolution | null;
  if (!payload?.brand_color || !payload.palette) return null;

  const palette =
    sanitizeStorefrontPalette(payload.palette, payload.brand_color) ??
    derivePaletteFromPrimary(payload.brand_color);

  return {
    brand_color: palette.primary,
    label: payload.label?.trim() || "Custom palette",
    palette,
  };
}
