import { parseJsonObject } from "@/lib/storefront-builder/agents/agentThinking";
import { getAssistantMessageContent, getThinkingModel, postChat } from "@/lib/storefront-builder/agents/openaiChat";

export type BrandColorResolution = {
  brand_color: string;
  label: string;
};

export type BrandColorContext = {
  business_name?: string | null;
  industry?: string | null;
  description?: string | null;
  current_color?: string | null;
};

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

export async function resolveBrandColorWithAi(
  message: string,
  context: BrandColorContext = {},
): Promise<BrandColorResolution | null> {
  const randomPick = isRandomColorRequest(message);

  try {
    const data = await postChat({
      model: getThinkingModel(),
      temperature: randomPick ? 0.95 : 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You choose website brand colors for small business storefronts.\n" +
            "Return ONLY valid JSON: {\"brand_color\": \"#RRGGBB\", \"label\": \"short color name\"}.\n" +
            "brand_color must be a six-digit hex code suitable as the primary brand/button color.\n" +
            "Pick a refined, on-brand shade — not neon unless the merchant asked for neon.\n" +
            "Interpret ANY color name or description the merchant gives: pink, chartreuse, salmon, midnight blue, etc.\n" +
            "You are not limited to a preset list — if they name a color, pick an appropriate hex for it.\n" +
            "Interpret descriptive requests naturally: soft lavender, earthy brown, metallic silver, warm sunset, muted sage.\n" +
            (randomPick
              ? "The merchant asked for a random or surprise color — pick a distinctive, attractive brand color that fits their industry and is DIFFERENT from current_brand_color if provided. Be creative.\n"
              : "") +
            "Ensure enough contrast for white button text (avoid very light pastels as primary unless requested).",
        },
        {
          role: "user",
          content: JSON.stringify({
            merchant_request: message,
            business_name: context.business_name ?? null,
            industry: context.industry ?? null,
            description: context.description ?? null,
            current_brand_color: context.current_color ?? null,
            wants_random_color: randomPick,
          }),
        },
      ],
    });

    const parsed = parseJsonObject<{ brand_color?: string; label?: string }>(
      getAssistantMessageContent(data),
      {},
    );
    const brandColor = typeof parsed.brand_color === "string" ? parsed.brand_color.trim() : "";
    if (!/^#[0-9A-Fa-f]{6}$/.test(brandColor)) return null;

    const label =
      typeof parsed.label === "string" && parsed.label.trim()
        ? parsed.label.trim()
        : randomPick
          ? "Surprise color"
          : "Custom color";

    return { brand_color: brandColor.toUpperCase(), label };
  } catch {
    return null;
  }
}

export async function fetchResolvedBrandColor(
  message: string,
  context: BrandColorContext = {},
): Promise<BrandColorResolution | null> {
  const response = await fetch("/api/storefront-builder/ai/resolve-color", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, context }),
  });

  if (!response.ok) return null;

  const payload = (await response.json().catch(() => null)) as BrandColorResolution | null;
  if (!payload?.brand_color || !/^#[0-9A-Fa-f]{6}$/.test(payload.brand_color)) return null;

  return {
    brand_color: payload.brand_color.toUpperCase(),
    label: payload.label?.trim() || "Custom color",
  };
}
