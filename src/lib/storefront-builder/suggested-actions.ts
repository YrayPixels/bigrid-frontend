import type { BuilderSession, BuilderSuggestedAction, Industry } from "@/lib/api/types";
import { postChat } from "@/lib/storefront-builder/agents/openaiChat";

const COLOR_PRESETS: Record<string, { label: string; color: string }[]> = {
  food_and_beverage: [
    { label: "Warm terracotta", color: "#C47A2C" },
    { label: "Forest green", color: "#2D6A4F" },
    { label: "Deep cocoa", color: "#5C4033" },
  ],
  fashion_and_apparel: [
    { label: "Classic black", color: "#111111" },
    { label: "Burgundy", color: "#80131B" },
    { label: "Sand neutral", color: "#C4A77D" },
  ],
  beauty_and_skincare: [
    { label: "Botanical green", color: "#82934C" },
    { label: "Rose clay", color: "#B56B62" },
    { label: "Soft blush", color: "#E6A79F" },
  ],
  home_and_living: [
    { label: "Sage green", color: "#6B7F5E" },
    { label: "Warm amber", color: "#D99359" },
    { label: "Cozy terracotta", color: "#C47A2C" },
  ],
  default: [
    { label: "StoreHause teal", color: "#0E7C66" },
    { label: "Warm terracotta", color: "#C47A2C" },
    { label: "Deep navy", color: "#1E3A5F" },
  ],
};

function industryKey(industry?: Industry | null): string {
  if (!industry) return "default";
  return industry in COLOR_PRESETS ? industry : "default";
}

function normalizeAction(raw: unknown): BuilderSuggestedAction | null {
  if (!raw || typeof raw !== "object") return null;
  const action = raw as Record<string, unknown>;
  const type = action.type;

  if (type === "prompt" && typeof action.label === "string" && typeof action.message === "string") {
    return { type: "prompt", label: action.label.trim(), message: action.message.trim() };
  }

  if (
    type === "color" &&
    typeof action.label === "string" &&
    typeof action.color === "string" &&
    /^#[0-9A-Fa-f]{6}$/.test(action.color)
  ) {
    return { type: "color", label: action.label.trim(), color: action.color };
  }

  if (
    type === "upload" &&
    typeof action.label === "string" &&
    (action.target === "media.hero_image_url" || action.target === "media.about_image_url")
  ) {
    return { type: "upload", label: action.label.trim(), target: action.target };
  }

  if (
    type === "image" &&
    typeof action.label === "string" &&
    typeof action.url === "string" &&
    action.url.startsWith("https://") &&
    (action.target === "media.hero_image_url" || action.target === "media.about_image_url")
  ) {
    return {
      type: "image",
      label: action.label.trim(),
      target: action.target,
      url: action.url.trim(),
    };
  }

  if (type === "link" && typeof action.label === "string" && typeof action.href === "string") {
    return { type: "link", label: action.label.trim(), href: action.href.trim() };
  }

  return null;
}

export function normalizeSuggestedActions(raw: unknown): BuilderSuggestedAction[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeAction).filter((action): action is BuilderSuggestedAction => action !== null);
}

export function fallbackSuggestedActions(session: BuilderSession): BuilderSuggestedAction[] {
  const profile = session.business_profile;
  const industry = profile.industry ?? session.store?.industry ?? null;

  if (session.storefront_snapshot) {
    return [
      {
        type: "prompt",
        label: "Redesign my shop",
        message: "I want a fresh design that fits my brand — pick the best look and colors for me",
      },
      { type: "prompt", label: "Try cosmetics look", message: "Switch to a clean cosmetics shop design with soft natural colors" },
      { type: "prompt", label: "Try fashion look", message: "Switch to a bold fashion lookbook design with editorial colors" },
      { type: "prompt", label: "Try minimal look", message: "Switch to a calm minimal design with warm neutral colors" },
      { type: "prompt", label: "Make it more premium", message: "Make the homepage more premium" },
      { type: "prompt", label: "Source brand photos", message: "Help me find photos that fit my brand for the homepage and about section" },
      { type: "upload", label: "Upload header photo", target: "media.hero_image_url" },
      ...COLOR_PRESETS[industryKey(industry)].slice(0, 2).map(
        (preset): BuilderSuggestedAction => ({
          type: "color",
          label: preset.label,
          color: preset.color,
        }),
      ),
    ];
  }

  if (session.status === "template_recommendation" || session.store) {
    return [
      { type: "prompt", label: "Build my website", message: "build my website" },
      { type: "prompt", label: "Go ahead", message: "Go ahead and create my site" },
      ...COLOR_PRESETS[industryKey(industry)].map(
        (preset): BuilderSuggestedAction => ({
          type: "color",
          label: preset.label,
          color: preset.color,
        }),
      ),
    ];
  }

  return [
    {
      type: "prompt",
      label: "Handmade candles",
      message: "I sell handmade soy candles. Warm, cozy, gift-friendly.",
    },
    {
      type: "prompt",
      label: "Skincare brand",
      message: "Skincare for busy professionals — clean, premium, not flashy.",
    },
    {
      type: "prompt",
      label: "Streetwear shop",
      message: "Men's streetwear brand for people who like bold colors.",
    },
    ...COLOR_PRESETS[industryKey(industry)].slice(0, 2).map(
      (preset): BuilderSuggestedAction => ({
        type: "color",
        label: preset.label,
        color: preset.color,
      }),
    ),
  ];
}

export function getLatestSuggestedActions(session: BuilderSession): BuilderSuggestedAction[] {
  const lastAssistant = [...session.messages].reverse().find((message) => message.role === "assistant");
  const fromPayload = normalizeSuggestedActions(lastAssistant?.payload?.suggested_actions);
  if (fromPayload.length) return fromPayload;
  return fallbackSuggestedActions(session);
}

export function colorPresetActions(
  industry?: Industry | null,
  limit = 3,
): Extract<BuilderSuggestedAction, { type: "color" }>[] {
  return COLOR_PRESETS[industryKey(industry)].slice(0, limit).map((preset) => ({
    type: "color" as const,
    label: preset.label,
    color: preset.color,
  }));
}

type SuggestedActionsContext = {
  message: string;
  session: BuilderSession;
  assistantMessage?: string;
};

export async function aiSuggestedActions({
  message,
  session,
  assistantMessage,
}: SuggestedActionsContext): Promise<BuilderSuggestedAction[]> {
  const profile = session.business_profile ?? {};
  const store = session.store ?? null;
  const storefront = session.storefront_snapshot ?? null;

  const hasStorefront = !!storefront;
  const hasProducts =
    Array.isArray(storefront?.products) ? storefront!.products.length > 0 : false;
  const hasHeroImage = !!storefront?.media?.hero_image_url;
  const hasAboutImage = !!storefront?.media?.about_image_url;

  const industry = profile.industry ?? store?.industry ?? null;

  // Fallback immediately when server-side API key isn't configured.
  const apiKey =
    process.env.OPENAI_API_KEY ??
    process.env.NEXT_OPENAI_API_KEY ??
    process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) return fallbackSuggestedActions(session);

  const prompt = [
    "You generate suggested next-step chips for a merchant building their StoreHause website.",
    "Return ONLY valid JSON: {\"actions\": BuilderSuggestedAction[]}.",
    "",
    "BuilderSuggestedAction shapes:",
    '- {"type":"prompt","label":string,"message":string}',
    '- {"type":"color","label":string,"color":"#RRGGBB"}',
    '- {"type":"upload","label":string,"target":"media.hero_image_url"|"media.about_image_url"}',
    '- {"type":"link","label":string,"href":string}',
    "",
    "Rules:",
    "- Actions must be specific to the merchant's situation, not generic templates.",
    "- Prefer 4-6 actions. Keep labels short (2-5 words). Messages should be copy-pastable.",
    "- Never mention templates, JSON, agents, tools, or internal system details.",
    "- Use at least 2 prompt actions. Add upload actions only if the relevant image is missing.",
    "- Add at most 2 color actions, and only with valid hex colors.",
    "- Only include a link action if it is clearly the best next step (e.g. add products).",
    "",
    "Context:",
    `- Merchant business name: ${profile.business_name ?? store?.business_name ?? "unknown"}`,
    `- Merchant description: ${profile.description ?? store?.description ?? "unknown"}`,
    `- Industry: ${industry ?? "unknown"}`,
    `- Has storefront draft: ${hasStorefront}`,
    `- Has products: ${hasProducts}`,
    `- Has hero image: ${hasHeroImage}`,
    `- Has about image: ${hasAboutImage}`,
    `- Latest merchant message: ${message.trim()}`,
    `- Latest assistant reply (if any): ${(assistantMessage ?? "").trim()}`,
  ].join("\n");

  try {
    const data = await postChat({
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: "Generate suggested next steps now." },
      ],
      tool_choice: "none",
      temperature: 0.35,
      response_format: { type: "json_object" },
    });

    const content = data?.choices?.[0]?.message?.content;
    const parsed = typeof content === "string" ? (JSON.parse(content) as unknown) : null;
    const rawActions =
      parsed && typeof parsed === "object" && parsed !== null
        ? (parsed as Record<string, unknown>).actions
        : null;

    const normalized = normalizeSuggestedActions(rawActions);
    if (normalized.length >= 3) return normalized.slice(0, 8);
  } catch {
    // Ignore and fall back.
  }

  // If generation fails, keep a sensible fallback that depends on the session state.
  const base = fallbackSuggestedActions(session);
  if (!hasProducts && hasStorefront) {
    return [
      { type: "link" as const, label: "Add products", href: "/admin/products" },
      ...base.filter((action) => action.type !== "link"),
    ].slice(0, 8);
  }
  return base.slice(0, 8);
}
