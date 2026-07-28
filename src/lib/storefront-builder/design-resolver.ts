import type {
  BuilderBusinessProfile,
  BuilderSession,
  Industry,
  Store,
  StorefrontColorPalette,
  StorefrontContent,
  StorefrontTemplateId,
  StorefrontTemplateOption,
  StorefrontTemplateRecommendation,
} from "@/lib/api/types";
import { parseJsonObject } from "@/lib/storefront-builder/agents/agentThinking";
import { getAssistantMessageContent, getThinkingModelName, postChat } from "@/lib/storefront-builder/agents/openaiChat";
import {
  expandSwatchPaletteToTheme,
  sanitizeStorefrontPalette,
} from "@/lib/storefront/palette-utils";
import { replaceTemplateImagesForStorefront } from "@/lib/storefront-builder/image-sourcing";
import { attachBoltTemplateToStorefront } from "@/lib/storefront/bolt-template-storefront";
import { resolveStorefrontTemplateType } from "@/lib/storefront/template-registry";
import { isCodeWorkbenchEnabled } from "@/lib/features";
import {
  applyBrandColorToStorefront,
  concreteTemplateIds,
  extractBusinessProfile,
  profileToStore,
  resolveTemplateFromMessage,
  sanitizeBusinessProfile,
  synthesizeStorefront,
} from "@/lib/storefront-builder/local-ai";

export type DesignPaletteColor = {
  color: string;
  label: string;
};

export type DesignDirectionContext = {
  business_name?: string | null;
  industry?: Industry | string | null;
  description?: string | null;
  brand_color?: string | null;
  current_template_id?: StorefrontTemplateId | string | null;
};

export type DesignDirectionResolution = {
  template_id: StorefrontTemplateId;
  brand_color: string;
  color_label: string;
  palette: DesignPaletteColor[];
  theme_palette: StorefrontColorPalette;
  industry: Industry | null;
  tone: string[];
  merchant_summary: string;
};

export type DesignRebuildResult = {
  business_profile: BuilderBusinessProfile;
  status: "content_generated";
  selected_template_id: StorefrontTemplateId;
  storefront: StorefrontContent;
  assistant_message: string;
  assistant_payload: Record<string, unknown>;
};

const VALID_INDUSTRIES = new Set<Industry>([
  "food_and_beverage",
  "fashion_and_apparel",
  "beauty_and_skincare",
  "electronics",
  "home_and_living",
  "services",
  "other",
]);

function templateCatalogForAi(templateOptions: StorefrontTemplateOption[]) {
  return templateOptions
    .filter((option): option is StorefrontTemplateOption & { value: StorefrontTemplateId } => option.value !== "ai_pick")
    .map((option) => ({
      id: option.value,
      type: resolveStorefrontTemplateType(option.value, templateOptions),
      label: option.label,
      description: option.description,
      best_for: option.best_for ?? [option.bestFor],
      industries: option.industries ?? [],
      tone_tags: option.tone_tags ?? [],
      visual_tags: option.visual_tags ?? [],
    }));
}

function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = trimmedHex(value.trim());
  return /^#[0-9A-Fa-f]{6}$/.test(trimmed) ? trimmed.toUpperCase() : null;
}

function trimmedHex(value: string): string {
  return value.startsWith("#") ? value : `#${value}`;
}

function normalizePalette(raw: unknown): DesignPaletteColor[] {
  if (!Array.isArray(raw)) return [];

  const palette: DesignPaletteColor[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const color = normalizeHexColor((entry as { color?: string }).color);
    if (!color) continue;
    const label =
      typeof (entry as { label?: string }).label === "string" &&
      (entry as { label: string }).label.trim()
        ? (entry as { label: string }).label.trim()
        : color;
    palette.push({ color, label });
  }

  return palette.slice(0, 4);
}

function parseIndustry(value: unknown): Industry | null {
  if (typeof value !== "string") return null;
  return VALID_INDUSTRIES.has(value as Industry) ? (value as Industry) : null;
}

function fallbackDesignDirection(
  message: string,
  context: DesignDirectionContext,
  available: StorefrontTemplateId[],
  currentColor?: string | null,
): DesignDirectionResolution | null {
  const templateId = resolveTemplateFromMessage(message, available);
  if (!templateId) return null;

  const fallbackColor = currentColor && /^#[0-9A-Fa-f]{6}$/.test(currentColor) ? currentColor : "#0E7C66";

  return {
    template_id: templateId,
    brand_color: fallbackColor,
    color_label: "Brand color",
    palette: [{ color: fallbackColor, label: "Brand color" }],
    theme_palette: expandSwatchPaletteToTheme(fallbackColor, [{ color: fallbackColor }]),
    industry: parseIndustry(context.industry ?? null),
    tone: [],
    merchant_summary: `a ${templateId.replace(/_/g, " ")} style`,
  };
}

export async function resolveDesignDirectionWithAi(
  message: string,
  context: DesignDirectionContext,
  templateOptions: StorefrontTemplateOption[],
): Promise<DesignDirectionResolution | null> {
  const available = concreteTemplateIds(templateOptions);
  if (!available.length) return null;

  const catalog = templateCatalogForAi(templateOptions);

  try {
    const data = await postChat({
      model: await getThinkingModelName(),
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a storefront design director for small business websites.\n" +
            "Given a merchant request, pick the BEST matching website design from the catalog and a cohesive brand color palette.\n" +
            "Return ONLY valid JSON with keys:\n" +
            '- "template_id": string — must be one of the catalog ids exactly\n' +
            '- "brand_color": "#RRGGBB" — primary button/brand color with enough contrast for white text\n' +
            '- "color_label": string — short name for the primary color\n' +
            '- "palette": array of 3-4 objects {"color": "#RRGGBB", "label": "short name"} — swatches for quick picks, brand_color first\n' +
            '- "theme_palette": object with ALL keys primary, accent, background, surface, text, muted, border — full cohesive storefront palette\n' +
            '- "industry": optional string — one of food_and_beverage, fashion_and_apparel, beauty_and_skincare, electronics, home_and_living, services, other\n' +
            '- "tone": optional array of tone words (premium, minimal, bold, natural, warm, etc.)\n' +
            '- "merchant_summary": string — one short phrase describing the look in plain language WITHOUT the words template, theme, or layout (e.g. "a clean cosmetics shop with soft botanical greens")\n' +
            "Contrast rules (WCAG AA — verify before returning):\n" +
            "- text on background and surface: at least 4.5:1 — use dark text (#111–#333) on light backgrounds (#F5–#FFF)\n" +
            "- muted on background: at least 3:1 — never light gray on off-white\n" +
            "- primary buttons use white text: primary must reach at least 4.5:1 vs #FFFFFF\n" +
            "Match the merchant's described business type, vibe, and aesthetic — not just keywords.\n" +
            "Cosmetic/skincare/beauty shops → prefer cosmetics or beauty.\n" +
            "Clothing/streetwear/fashion → prefer fashion_lookbook.\n" +
            "Wellness/minimal/calm catalogs → prefer minimalistic.\n" +
            "If they describe colors or mood (earthy, luxe, playful), reflect that in brand_color and palette.",
        },
        {
          role: "user",
          content: JSON.stringify({
            merchant_request: message,
            business_name: context.business_name ?? null,
            industry: context.industry ?? null,
            description: context.description ?? null,
            current_brand_color: context.brand_color ?? null,
            current_template_id: context.current_template_id ?? null,
            available_templates: catalog,
          }),
        },
      ],
    });

    const parsed = parseJsonObject<{
      template_id?: string;
      brand_color?: string;
      color_label?: string;
      palette?: unknown;
      theme_palette?: unknown;
      industry?: string;
      tone?: unknown;
      merchant_summary?: string;
    }>(getAssistantMessageContent(data), {});

    const templateId =
      typeof parsed.template_id === "string" && available.includes(parsed.template_id as StorefrontTemplateId)
        ? (parsed.template_id as StorefrontTemplateId)
        : null;
    const brandColor = normalizeHexColor(parsed.brand_color);

    if (!templateId || !brandColor) {
      return fallbackDesignDirection(message, context, available, context.brand_color);
    }

    const palette = normalizePalette(parsed.palette);
    const normalizedPalette =
      palette.length > 0
        ? palette.some((entry) => entry.color === brandColor)
          ? palette
          : [{ color: brandColor, label: parsed.color_label?.trim() || "Brand color" }, ...palette]
        : [{ color: brandColor, label: parsed.color_label?.trim() || "Brand color" }];

    const colorLabel =
      typeof parsed.color_label === "string" && parsed.color_label.trim()
        ? parsed.color_label.trim()
        : normalizedPalette[0]?.label ?? "Brand color";

    const tone = Array.isArray(parsed.tone)
      ? parsed.tone
          .filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
          .map((entry) => entry.trim())
      : [];

    const merchantSummary =
      typeof parsed.merchant_summary === "string" && parsed.merchant_summary.trim()
        ? parsed.merchant_summary.trim()
        : `a refreshed look with ${colorLabel.toLowerCase()} tones`;

    const themePalette =
      sanitizeStorefrontPalette(
        parsed.theme_palette as Partial<Record<string, unknown>> | undefined,
        brandColor,
      ) ?? expandSwatchPaletteToTheme(brandColor, normalizedPalette);

    return {
      template_id: templateId,
      brand_color: brandColor,
      color_label: colorLabel,
      palette: normalizedPalette,
      theme_palette: themePalette,
      industry: parseIndustry(parsed.industry) ?? parseIndustry(context.industry ?? null),
      tone,
      merchant_summary: merchantSummary,
    };
  } catch {
    return fallbackDesignDirection(message, context, available, context.brand_color);
  }
}

export async function fetchResolvedDesignDirection(
  message: string,
  context: DesignDirectionContext,
  templateOptions: StorefrontTemplateOption[],
): Promise<DesignDirectionResolution | null> {
  const { getToken } = await import("@/lib/api/client");
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch("/api/storefront-builder/ai/resolve-design", {
    method: "POST",
    headers,
    body: JSON.stringify({ message, context, template_options: templateOptions }),
  });

  if (!response.ok) return null;

  const payload = (await response.json().catch(() => null)) as DesignDirectionResolution | null;
  if (!payload?.template_id || !payload.brand_color) return null;

  return payload;
}

async function resolveDesignDirection(
  message: string,
  context: DesignDirectionContext,
  templateOptions: StorefrontTemplateOption[],
): Promise<DesignDirectionResolution | null> {
  if (typeof window !== "undefined") {
    const fetched = await fetchResolvedDesignDirection(message, context, templateOptions);
    if (fetched) return fetched;
  }

  return resolveDesignDirectionWithAi(message, context, templateOptions);
}

export async function rebuildStorefrontFromDesignRequest(args: {
  message: string;
  session: BuilderSession;
  templateOptions: StorefrontTemplateOption[];
  recommendations?: StorefrontTemplateRecommendation[];
}): Promise<DesignRebuildResult | null> {
  const { message, session, templateOptions, recommendations = session.recommendations ?? [] } = args;
  const profile = extractBusinessProfile(message, sanitizeBusinessProfile(session.business_profile ?? {}));
  const store = session.store;
  if (!store) return null;

  const direction = await resolveDesignDirection(
    message,
    {
      business_name: profile.business_name ?? store.business_name,
      industry: profile.industry ?? store.industry,
      description: profile.description ?? store.description,
      brand_color: profile.brand_color ?? store.brand_color,
      current_template_id:
        session.selected_template_id && session.selected_template_id !== "ai_pick"
          ? session.selected_template_id
          : store.storefront_template_id,
    },
    templateOptions,
  );

  if (!direction) return null;

  const nextProfile = sanitizeBusinessProfile({
    ...profile,
    industry: direction.industry ?? profile.industry ?? store.industry,
    brand_color: direction.brand_color,
    tone: [...new Set([...(profile.tone ?? []), ...direction.tone])],
  });

  const nextStore: Store = {
    ...store,
    industry: nextProfile.industry ?? store.industry,
    brand_color: direction.brand_color,
    storefront_template_id: direction.template_id,
  };

  let storefront = synthesizeStorefront(nextStore, recommendations);
  if (storefront.template) {
    storefront.template.id = direction.template_id;
  }

  const colorApplied = applyBrandColorToStorefront(
    storefront,
    nextStore,
    direction.brand_color,
    direction.theme_palette,
  );
  storefront = colorApplied.storefront;

  const templateType = resolveStorefrontTemplateType(direction.template_id, templateOptions);
  const useBoltWorkbench = templateType === "bolt" && isCodeWorkbenchEnabled();
  let imageSummary: string | undefined;
  let changedPaths: string[] = [];

  if (useBoltWorkbench) {
    storefront = await attachBoltTemplateToStorefront(storefront, direction.template_id);
  } else {
    const imageIntent = `${nextProfile.business_name ?? ""} ${nextProfile.description ?? ""} ${message}`.trim();
    const imagesReplaced = await replaceTemplateImagesForStorefront({
      intent: imageIntent,
      storefront,
      context: {
        business_name: nextStore.business_name,
        industry: nextStore.industry,
        description: nextStore.description,
        tone: nextProfile.tone,
      },
    });
    storefront = imagesReplaced.storefront;
    imageSummary = imagesReplaced.result.summary;
    changedPaths = imagesReplaced.changed_paths;
  }

  const colorOptions = direction.palette.map((entry) => entry.color);
  const templateLabel =
    templateOptions.find((option) => option.value === direction.template_id)?.label ??
    direction.template_id.replace(/_/g, " ");

  const assistantMessage = useBoltWorkbench
    ? `Done — I switched your site to the ${templateLabel} code template. Open the workbench to preview and refine it, then tell me what to adjust.`
    : `Done — I refreshed your website with ${direction.merchant_summary}, a matching color palette (${direction.color_label.toLowerCase()}), and on-brand photos. Check the preview on the right, then tell me what to refine.`;

  return {
    business_profile: nextProfile,
    status: "content_generated",
    selected_template_id: direction.template_id,
    storefront,
    assistant_message: assistantMessage,
    assistant_payload: {
      type: "website_generated",
      design_direction: {
        template_id: direction.template_id,
        template_label: templateLabel,
        brand_color: direction.brand_color,
        color_label: direction.color_label,
        palette: direction.palette,
        theme_palette: direction.theme_palette,
        merchant_summary: direction.merchant_summary,
      },
      color_options: colorOptions,
      template_type: useBoltWorkbench ? "bolt" : "json",
      image_summary: imageSummary,
      changed_paths: changedPaths,
      suggested_actions: direction.palette.slice(0, 3).map((entry) => ({
        type: "color" as const,
        label: entry.label,
        color: entry.color,
      })),
    },
  };
}
