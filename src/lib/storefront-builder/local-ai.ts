import {
  STOREFRONT_TEMPLATE_OPTIONS,
  type BuilderBusinessProfile,
  type BuilderSession,
  type Industry,
  type Store,
  type StorefrontColorPalette,
  type StorefrontContent,
  type StorefrontTemplateChoice,
  type StorefrontTemplateId,
  type StorefrontTemplateOption,
  type StorefrontTemplateRecommendation,
} from "@/lib/api/types";
import { getDefaultStorefrontPalette, resolveStorefrontTemplate } from "@/lib/storefront/template";
import { BUILDER_WELCOME_MESSAGE } from "@/lib/storefront-builder/copy";
import { describeStorefrontEdit } from "@/lib/storefront-builder/edit-summary";
import {
  isEditableStorefrontPath,
  setEditableStorefrontPath,
  tryAppendFaqItem,
} from "@/lib/storefront-builder/editable-paths";
import { ensureHomeBlocksOnStorefront, maybeSyncHomeBlocksFromLegacyPaths } from "@/lib/storefront/blocks/sync-legacy";
import { tryApplyContactFormInstruction, tryApplyHomeBlockInstruction } from "@/lib/storefront/blocks/operations";
import { tryApplyCategoryShowcaseInstruction } from "@/lib/storefront/blocks/category-showcase-operations";
import {
  applyAiBlockOperations,
  tryApplyPageBlockInstruction,
} from "@/lib/storefront/blocks/page-block-operations";
import { resolvePageBlocks } from "@/lib/storefront/blocks/migrate-page-blocks";
import { isFaqItemAppendInstruction } from "@/lib/storefront/blocks/catalog";
import { applyStockImagesToStorefront } from "@/lib/storefront-builder/stock-images";
import { resolveBrandColorWithAi, isOpenEndedColorRequest } from "@/lib/storefront-builder/color-resolver";
import {
  derivePaletteFromPrimary,
  paletteChangedPaths,
  sanitizeStorefrontPalette,
} from "@/lib/storefront/palette-utils";
import { colorPresetActions } from "@/lib/storefront-builder/suggested-actions";
import { STOREFRONT_NAV_ITEMS } from "@/lib/storefront/template";
import { parseJsonObject } from "@/lib/storefront-builder/agents/agentThinking";
import { getAssistantMessageContent, getThinkingModel, postChat } from "@/lib/storefront-builder/agents/openaiChat";
import { BUILDER_EDITOR_SYSTEM_PROMPT } from "@/lib/storefront-builder/prompts";
import { promptAllowedStorefrontPaths } from "@/lib/storefront-builder/editable-paths";

export { EDITABLE_STOREFRONT_PATHS } from "@/lib/storefront-builder/editable-paths";

type BuilderToolCall = {
  name: "recommend_templates" | "select_template" | "generate_draft" | "ask_clarifying_question";
  arguments: Record<string, unknown>;
};

export type BuilderAiTurn = {
  business_profile: BuilderBusinessProfile;
  status: BuilderSession["status"];
  assistant_message: string;
  assistant_payload: Record<string, unknown>;
  selected_template_id?: StorefrontTemplateId | null;
  storefront?: StorefrontContent;
};

export type BuilderEditTurn = {
  storefront: StorefrontContent;
  changed_paths: string[];
  assistant_message: string;
};

const INDUSTRY_KEYWORDS: Record<string, Industry> = {
  skincare: "beauty_and_skincare",
  beauty: "beauty_and_skincare",
  cosmetic: "beauty_and_skincare",
  cosmetics: "beauty_and_skincare",
  hair: "beauty_and_skincare",
  fashion: "fashion_and_apparel",
  clothing: "fashion_and_apparel",
  streetwear: "fashion_and_apparel",
  apparel: "fashion_and_apparel",
  food: "food_and_beverage",
  coffee: "food_and_beverage",
  restaurant: "food_and_beverage",
  electronics: "electronics",
  gadgets: "electronics",
  furniture: "home_and_living",
  home: "home_and_living",
  candles: "home_and_living",
  service: "services",
  salon: "services",
};

export function isDesignChangeIntent(message: string): boolean {
  const trimmed = message.trim().toLowerCase();
  return (
    /\b(another|different|new|other|change|pick|try|switch|choose|select)\b.*\bdesign\b/.test(trimmed) ||
    /\bdesign\b.*\b(for|for a|for my|that fits)\b/.test(trimmed) ||
    /\b(redesign|re-design|new look|fresh look|different look|another look|new layout|different layout|switch layout|change layout)\b/.test(
      trimmed,
    ) ||
    /\b(pick|choose|try|switch to|use)\b.*\b(cosmetics|cosmetic|beauty|skincare|fashion|lookbook|minimalistic|minimal)\b.*\b(design|look|layout|style)\b/.test(
      trimmed,
    ) ||
    /\b(cosmetics|cosmetic|beauty|skincare|fashion|lookbook|minimalistic|minimal)\b.*\b(design|look|layout|style)\b/.test(
      trimmed,
    ) ||
    /\b(switch|change|try|use|pick|go with)\b.*\b(cosmetics|cosmetic|beauty|skincare|fashion|lookbook|minimalistic|minimal)\b/.test(
      trimmed,
    ) ||
    /\b(something else|different vibe|different aesthetic|different feel|not this look|change it up)\b/.test(
      trimmed,
    ) ||
    /\b(i need|i want|looking for|need)\b.*\b(something else|different|new look|new style|a change|fresh look)\b/.test(
      trimmed,
    )
  );
}

export function isRebuildIntent(message: string): boolean {
  const trimmed = message.trim().toLowerCase();
  return (
    isDesignChangeIntent(message) ||
    (/\b(build|create|generate|make|switch|rebuild|redo)\b.*\bfor\b/.test(trimmed) &&
      /\b(cosmetics|cosmetic|beauty|skincare|fashion|lookbook|minimalistic|minimal|candle|food|electronics)\b/.test(
        trimmed,
      )) ||
    /\blets?\s+build\s+for\b/.test(trimmed)
  );
}

const TEMPLATE_KEYWORD_MAP: Record<string, StorefrontTemplateId> = {
  cosmetics: "cosmetics",
  cosmetic: "cosmetics",
  skincare: "cosmetics",
  beauty: "beauty",
  fashion: "fashion_lookbook",
  lookbook: "fashion_lookbook",
  minimalistic: "minimalistic",
  minimal: "minimalistic",
};

export function resolveTemplateFromMessage(
  message: string,
  available: StorefrontTemplateId[] = concreteTemplateIds(),
): StorefrontTemplateId | null {
  const lower = message.toLowerCase();
  for (const [keyword, templateId] of Object.entries(TEMPLATE_KEYWORD_MAP)) {
    if (lower.includes(keyword) && (!available.length || available.includes(templateId))) {
      return templateId;
    }
  }
  return null;
}

export function isBuildIntent(message: string): boolean {
  const trimmed = message.trim().toLowerCase();
  return (
    /\b(build|create|generate|make)\b.*\b(website|site|storefront|store|draft)\b/.test(trimmed) ||
    /\b(build my website|generate my website|create my website|yes proceed|yes,? build|go ahead and build|go ahead)\b/.test(
      trimmed,
    ) ||
    isRebuildIntent(message)
  );
}

export function isStockImageIntent(message: string): boolean {
  const trimmed = message.trim().toLowerCase();
  return (
    /\bstock\s+(?:photo|photos|image|images)\b/.test(trimmed) ||
    /\b(add|suggest|provide|use)\s+(?:suitable\s+)?stock\b/.test(trimmed) ||
    /\bsuitable\s+stock\s+(?:photo|photos|image|images)\b/.test(trimmed)
  );
}

export function isProductIntent(message: string): boolean {
  const trimmed = message.trim().toLowerCase();
  return (
    /\b(add|create|new|upload|list)\b.*\b(product|products|item|items|sku)\b/.test(trimmed) ||
    /\bi want to add a product\b/.test(trimmed)
  );
}

const NAMED_COLOR_PHRASES: Array<{ pattern: RegExp; color: string }> = [
  { pattern: /\bcoral\s+blue\b/i, color: "#3D8DAE" },
  { pattern: /\bocean(?:ic)?(?:\s+(?:blue|palette|pallete|scheme))?\b/i, color: "#0077B6" },
  { pattern: /\belectric\s+blue\b/i, color: "#0F4C81" },
  { pattern: /\bsky\s+blue\b/i, color: "#4A90A4" },
  { pattern: /\bsea\s+foam\b/i, color: "#5CB8A8" },
];

const NAMED_COLOR_WORDS: Record<string, string> = {
  terracotta: "#C47A2C",
  teal: "#0E7C66",
  navy: "#1E3A5F",
  blush: "#E6A79F",
  burgundy: "#80131B",
  sage: "#6B7F5E",
  amber: "#D99359",
  coral: "#E07A5F",
  cream: "#F5E6D3",
  black: "#111111",
  green: "#2D6A4F",
  blue: "#0F4C81",
  ocean: "#0077B6",
  oceanic: "#0077B6",
  pink: "#D4577A",
  rose: "#C76B7F",
  red: "#B42318",
  purple: "#6B4EFF",
  violet: "#7C5CBF",
  lavender: "#9B8EC4",
  gold: "#B8860B",
  yellow: "#D4A017",
  orange: "#E07A2F",
  mint: "#5CB8A8",
  lime: "#6B8E23",
  brown: "#7A4E32",
  grey: "#6E6E6E",
  gray: "#6E6E6E",
  white: "#F5F5F5",
  peach: "#E8A87C",
  mauve: "#9D7E9E",
  turquoise: "#2AA198",
  cyan: "#0891B2",
  magenta: "#C026D3",
  indigo: "#4338CA",
  maroon: "#7B2D3B",
  bronze: "#A0714F",
  copper: "#B87333",
  wine: "#722F37",
  ruby: "#9B1B30",
  emerald: "#047857",
  crimson: "#991B1B",
  scarlet: "#DC2626",
  charcoal: "#36454F",
  ivory: "#FFFFF0",
  beige: "#C8B89A",
  tan: "#D2B48C",
};

const COLOR_REQUEST_PATTERN =
  /\b(ley|let\s*(?:'s|s)?|lets|i\s+want|want|wanna|get|go|try|use|make\s+it|switch\s+to|change\s+to|can\s+we|could\s+we|how\s+about|give me)\b/i;

function formatColorLabel(hint: string): string {
  return hint
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function shouldResolveColorWithAi(message: string): boolean {
  if (/#([0-9A-Fa-f]{6})\b/.test(message)) return false;
  return true;
}

export function extractColorHintFromMessage(message: string): string | null {
  const lower = message.toLowerCase().trim();

  for (const { pattern } of NAMED_COLOR_PHRASES) {
    const match = message.match(pattern);
    if (match) return match[0].trim();
  }

  const makeItMatch = message.match(
    /\bmake\s+it\s+(?:a|an|the|some\s+)?([a-z][a-z\s-]{1,30}?)(?:\s+please|\?|!|$|\.)/i,
  );
  if (makeItMatch?.[1]) {
    const hint = makeItMatch[1].trim();
    if (
      hint &&
      !/^(color|colour|palette|scheme|brand|more|less)$/i.test(hint) &&
      !/\b(premium|luxury|minimal|professional|playful|bold|warmer|friendlier)\b/i.test(hint)
    ) {
      return hint;
    }
  }

  const tryMatch = message.match(
    /\b(?:ley|let\s*(?:'s|s)?|lets)\s+try\s+(?:a|an|the|some\s+)?([a-z][a-z\s-]{1,30}?)(?:\s+please|\?|!|$|\.)/i,
  );
  if (tryMatch?.[1]) {
    const hint = tryMatch[1].trim();
    if (hint) return hint;
  }

  for (const name of Object.keys(NAMED_COLOR_WORDS)) {
    if (new RegExp(`\\b${name}\\b`, "i").test(lower)) return name;
  }

  const phraseMatch = message.match(
    /\b(?:ley|let\s*(?:'s|s)?|lets|want|get|go|try|use|make\s+it|switch\s+to|change\s+to|can\s+we|could\s+we)\s+(?:an?\s+|the\s+|some\s+|a\s+)?([a-z][a-z\s-]{1,30}?)(?:\s+please|\?|!|$|\.)/i,
  );
  if (phraseMatch?.[1]) {
    const hint = phraseMatch[1].trim();
    if (hint && !/^(color|colour|palette|scheme|brand)$/i.test(hint)) return hint;
  }

  if (/^[a-z][a-z\s-]{1,24}$/i.test(lower)) return lower;

  return null;
}

export function isColorIntent(message: string): boolean {
  if (isDesignChangeIntent(message)) return false;

  const trimmed = message.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/i.test(trimmed)) return true;

  if (
    /\b(more premium|more luxury|more minimal|warmer|friendlier|professional|playful|bold|shorter|longer)\b/i.test(
      trimmed,
    )
  ) {
    return false;
  }

  if (
    /\b(brand color|brand colour|colour scheme|color scheme|color palette|colour palette|pallete|palette)\b/i.test(
      message,
    )
  ) {
    return true;
  }

  if (/\buse .+#([0-9a-f]{3}|[0-9a-f]{6})\b/i.test(message)) return true;

  if (
    /\b(make it|try|use|switch to|go with|want|lets|let's)\b.*\b(color|colour|palette|pallete|scheme)\b/i.test(
      trimmed,
    )
  ) {
    return true;
  }

  if (NAMED_COLOR_PHRASES.some(({ pattern }) => pattern.test(message))) return true;

  if (isOpenEndedColorRequest(message)) return true;

  if (/\b(give me|pick|choose|select|suggest)\b.*\b(color|colour|shade|hue)\b/i.test(message)) return true;

  const colorHint = extractColorHintFromMessage(message);
  if (colorHint && COLOR_REQUEST_PATTERN.test(message)) return true;

  if (
    colorHint &&
    /\b(color|colour|brand|palette|tone|shade|hue)\b/i.test(message)
  ) {
    return true;
  }

  if (colorHint && trimmed.length <= 40) {
    const looksLikeCopyEdit =
      /\b(headline|subheadline|tagline|cta|button|about|contact|faq|seo|hero|copy|premium|minimal|luxury|warmer|friendlier|professional|playful|bold|shorter|longer)\b/i.test(
        trimmed,
      );
    if (!looksLikeCopyEdit) return true;
  }

  return (
    /\b(make it|try|use|switch to|go with)\b.*\b(green|teal|terracotta|navy|blush|black|burgundy|sage|amber|coral|cream|blue|ocean(?:ic)?|pink|red|purple|rose|gold|mint)\b/i.test(
      trimmed,
    ) || Object.keys(NAMED_COLOR_WORDS).some((name) => new RegExp(`\\b${name}\\b`, "i").test(trimmed))
  );
}

export function isImageIntent(message: string): boolean {
  const trimmed = message.trim().toLowerCase();
  return (
    /\b(upload|add|use|set|change|replace)\b.*\b(photo|image|picture|header|background|banner)\b/i.test(trimmed) ||
    isStockImageIntent(message)
  );
}

export function isEditIntent(message: string): boolean {
  const trimmed = message.trim().toLowerCase();
  if (!trimmed || isBuildIntent(message)) return false;

  if (isProductIntent(message)) return false;

  if (isColorIntent(message) || isImageIntent(message)) return true;

  return (
    /\b(change|update|edit|rewrite|revise|shorten|lengthen|improve|fix|replace|make (?:the|it)|set (?:the|my))\b/.test(
      trimmed,
    ) ||
    /\b(headline|subheadline|tagline|cta|button|about(?:\s+section|\s+copy|\s+page)?|contact(?:\s+page|\s+intro|\s+copy)?|faq|seo|title|description|copy|hero|value prop|trust)\b/.test(
      trimmed,
    ) ||
    /\b(more premium|more luxury|more minimal|warmer|friendlier|professional|playful|bold|shorter|longer)\b/.test(
      trimmed,
    )
  );
}

export function mergeSessionProfile(session: BuilderSession): BuilderBusinessProfile {
  const profile = sanitizeBusinessProfile(session.business_profile ?? {});
  const store = session.store;
  if (!store) return profile;

  return sanitizeBusinessProfile({
    ...profile,
    business_name: profile.business_name ?? store.business_name ?? null,
    description: profile.description ?? store.description ?? null,
    industry: profile.industry ?? store.industry ?? null,
    brand_color: profile.brand_color ?? store.brand_color ?? null,
  });
}

export function resolveSelectedTemplateId(
  session: BuilderSession,
  recommendations: StorefrontTemplateRecommendation[],
  availableTemplateIds: StorefrontTemplateId[],
): StorefrontTemplateId | null {
  const fromSession =
    session.selected_template_id && session.selected_template_id !== "ai_pick"
      ? session.selected_template_id
      : null;

  if (fromSession && availableTemplateIds.includes(fromSession)) {
    return fromSession;
  }

  const recommended = recommendations[0]?.template_id;
  if (recommended && availableTemplateIds.includes(recommended)) {
    return recommended;
  }

  return availableTemplateIds[0] ?? null;
}

export function isSubstantiveBuilderMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return false;
  if (/^(hi|hello|hey|yo|sup|thanks|thank you|ok|okay|cool|great)[\s,!.?]*$/i.test(trimmed)) {
    return false;
  }
  if (/^(good\s+(morning|afternoon|evening))[\s,!.?]*$/i.test(trimmed)) return false;
  return (
    trimmed.length >= 12 ||
    /\b(sell|store|brand|business|template|skincare|fashion|product|shop|vibe|style)\b/i.test(
      trimmed,
    )
  );
}

export function extractBusinessProfile(
  message: string,
  currentProfile: BuilderBusinessProfile = {},
): BuilderBusinessProfile {
  const next: BuilderBusinessProfile = {
    ...currentProfile,
    tone: [...(currentProfile.tone ?? [])],
  };
  const lower = message.toLowerCase();

  const namedMatch = message.match(/(?:called|named|name is|business is)\s+["']?([^"'.!?\n]+)["']?/i);
  const isMatch = message.match(/^([A-Z][\w\s&'-]{2,60}?)\s+is\s+(?:an?|the)\s+/i);
  if (namedMatch) next.business_name = namedMatch[1].trim();
  else if (isMatch) next.business_name = isMatch[1].trim();

  if (
    message.trim().length > 20 &&
    !isBuildIntent(message) &&
    !isColorIntent(message) &&
    !isDesignChangeIntent(message)
  ) {
    next.description = message.trim();
  }

  const sellMatch = message.match(/\b(?:i\s+)?sell\s+([^,.!?\n]+)/i);
  if (sellMatch && !next.business_name) {
    const productLabel = sellMatch[1].trim();
    if (productLabel.length >= 3 && productLabel.length <= 60) {
      next.business_name = productLabel
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(" ");
    }
  }

  for (const [keyword, industry] of Object.entries(INDUSTRY_KEYWORDS)) {
    if (lower.includes(keyword)) {
      next.industry = industry;
      break;
    }
  }

  for (const tone of ["premium", "luxury", "minimal", "natural", "clean", "bold", "editorial", "warm"]) {
    if (lower.includes(tone) && !next.tone?.includes(tone)) next.tone?.push(tone);
  }

  const colorMatch = message.match(/#([0-9A-Fa-f]{6})/);
  if (colorMatch) next.brand_color = `#${colorMatch[1]}`;

  return sanitizeBusinessProfile(next);
}

export function sanitizeBusinessProfile(profile: BuilderBusinessProfile): BuilderBusinessProfile {
  return {
    business_name: typeof profile.business_name === "string" ? profile.business_name.trim() || null : null,
    description: typeof profile.description === "string" ? profile.description.trim() || null : null,
    industry: profile.industry ?? null,
    brand_color:
      typeof profile.brand_color === "string" && /^#[0-9A-Fa-f]{6}$/.test(profile.brand_color)
        ? profile.brand_color
        : null,
    tone: [...new Set((profile.tone ?? []).map(String).map((tone) => tone.trim()).filter(Boolean))],
  };
}

export function hasMinimumBusinessProfile(profile: BuilderBusinessProfile): boolean {
  return !!profile.business_name && !!profile.description && profile.description.length >= 10;
}

export function fallbackBuilderTurn({
  message,
  session,
  recommendations,
  availableTemplateIds,
}: {
  message: string;
  session: BuilderSession;
  recommendations: StorefrontTemplateRecommendation[];
  availableTemplateIds: StorefrontTemplateId[];
}): BuilderAiTurn {
  const mergedSession = {
    ...session,
    business_profile: mergeSessionProfile(session),
  };

  if (!isSubstantiveBuilderMessage(message)) {
    return {
      business_profile: mergedSession.business_profile,
      status: mergedSession.status,
      assistant_message: conversationalReply(mergedSession, message),
      assistant_payload: { type: "conversation" },
    };
  }

  const profile = extractBusinessProfile(message, mergedSession.business_profile ?? {});
  if (!hasMinimumBusinessProfile(profile)) {
    const missing = [];
    if (!profile.business_name) missing.push("business name");
    if (!profile.description || profile.description.length < 10) {
      missing.push("short description of what you sell");
    }

    return {
      business_profile: profile,
      status: "collecting_requirements",
      assistant_message: `Thanks, I still need your ${missing.join(" and ")}. For example: "Glow Rituals is an organic skincare brand for busy professionals."`,
      assistant_payload: { type: "requirements_request", profile },
    };
  }

  const wantsWebsite = isBuildIntent(message);
  const selectedTemplateId = resolveSelectedTemplateId(
    { ...mergedSession, business_profile: profile },
    recommendations,
    availableTemplateIds,
  );
  const shouldGenerate = wantsWebsite && !!selectedTemplateId;
  const recommendedTemplateLabel = recommendations[0]
    ? STOREFRONT_TEMPLATE_OPTIONS.find((option) => option.value === recommendations[0].template_id)?.label
    : undefined;

  return {
    business_profile: profile,
    status: shouldGenerate ? "content_generated" : "template_recommendation",
    selected_template_id: selectedTemplateId,
    storefront: shouldGenerate
      ? synthesizeStorefront(profileToStore(profile, selectedTemplateId), recommendations)
      : undefined,
    assistant_message: shouldGenerate
      ? "Your website draft is ready — check the preview on the right. Tell me anything you'd like to change."
      : recommendations.length
        ? `Got it — a ${recommendedTemplateLabel ?? "website"} style site for ${profile.business_name}. Say "build my website" when you're ready.`
        : 'Tell me a bit more about your business, then say "build my website" and I\'ll create your first draft.',
    assistant_payload: {
      type: shouldGenerate ? "website_generated" : "agent_turn",
      profile,
    },
  };
}

export function profileToStore(
  profile: BuilderBusinessProfile,
  selectedTemplateId?: StorefrontTemplateChoice | null,
): Store {
  const businessName = profile.business_name ?? "My Store";
  const slug = slugify(businessName) || "my-store";
  return {
    id: "frontend-draft",
    slug,
    business_name: businessName,
    industry: profile.industry ?? "other",
    description: profile.description ?? "",
    brand_color: profile.brand_color ?? "#0E7C66",
    logo_url: null,
    storefront_template_id: selectedTemplateId ?? "ai_pick",
    subdomain: slug,
    subdomain_host: slug,
    primary_domain: slug,
  };
}

export function synthesizeStorefront(
  store: Store,
  recommendations: StorefrontTemplateRecommendation[] = [],
  copy?: Partial<StorefrontContent>,
): StorefrontContent {
  const name = store.business_name;
  const industryLabel = store.industry.replace(/_/g, " ");
  const desc = store.description || `${name} delivers quality ${industryLabel} products and services.`;
  const templateId = resolveTemplateId(store, recommendations);
  const slugBase = slugify(name);
  const contactEmail = null;

  const hero = copy?.hero ?? heroForStore(name, store.industry, desc);
  const about = copy?.about ?? {
    title: `About ${name}`,
    body: `${name} was built around a simple idea: ${industryLabel} should feel personal, clear, and easy to shop. ${desc}`,
  };

  return ensureHomeBlocksOnStorefront({
    template: {
      id: templateId,
      source: store.storefront_template_id === "ai_pick" ? "ai_selected" : "merchant_selected",
    },
    palette: getDefaultStorefrontPalette(templateId, store.brand_color),
    data_plugs: { home_products_source: "merchant_products" },
    hero,
    about,
    value_props: copy?.value_props ?? valuePropsForIndustry(store.industry),
    navigation:
      copy?.navigation ??
      (templateId === "cosmetics"
        ? [
            { label: "Product", href: "/products" },
            { label: "Features", href: "/" },
            { label: "Reviews", href: "/faq" },
            { label: "About us", href: "/about" },
          ]
        : STOREFRONT_NAV_ITEMS.map((item) => ({ label: item.label, href: item.href }))),
    home_stats:
      copy?.home_stats ??
      (templateId === "cosmetics"
        ? [
            { value: "Trusted by over 350,000+ Clients", label: "worldwide since 2008" },
            { value: "6M+", label: "Worldwide Product sale per year" },
            { value: "4.6", label: "3,350 Rating Worldwide" },
          ]
        : []),
    pages: copy?.pages ?? {
      about: { title: about.title, body: about.body, source: "ai_generated" },
      contact: {
        title: "Contact us",
        body: "Have a question about an order or product? Reach out and our team will get back to you shortly.",
        email: contactEmail,
        phone: null,
        source: "ai_generated",
      },
      faq: {
        title: "Frequently asked questions",
        source: "ai_generated",
        items: [
          {
            question: "How do I place an order?",
            answer: "Browse products, add items to your cart, and complete checkout with your delivery details.",
          },
          {
            question: "What payment methods do you accept?",
            answer: "We accept card payments and bank transfers through secure checkout.",
          },
          {
            question: "How long does delivery take?",
            answer: "Most orders arrive within 2-4 business days depending on your location.",
          },
        ],
      },
      privacy_policy: {
        title: "Privacy policy",
        source: "platform_default",
        body: `This privacy policy explains how ${name} and Storehaus collect, use, and protect your personal information when you shop on this storefront.`,
      },
    },
    products: copy?.products ?? productsForIndustry(name, store.industry, slugBase),
    seo: copy?.seo ?? {
      title: `${name} | Online Store`,
      description: desc.slice(0, 150),
    },
    edit_metadata: {
      ai_generated_paths: [
        "hero.headline",
        "hero.subheadline",
        "hero.cta_label",
        "about.title",
        "about.body",
        "value_props",
        "pages",
        "seo.title",
        "seo.description",
        "products",
      ],
      user_edited_paths: [],
      last_generation_prompt: "frontend_ai_agent",
      last_generated_at: new Date().toISOString(),
    },
  });
}

export function applyStorefrontEdit(
  storefront: StorefrontContent,
  instruction: string,
  updates?: Record<string, unknown>,
  assistantMessage?: string,
  store?: Store | null,
): BuilderEditTurn {
  return applyStorefrontEditWithUpdates(storefront, instruction, updates, assistantMessage, store);
}

export async function applyStorefrontEditAsync(
  storefront: StorefrontContent,
  instruction: string,
  options?: {
    store?: Store | null;
    updates?: Record<string, unknown>;
    assistantMessage?: string;
    planIntent?: string;
    message?: string;
  },
): Promise<BuilderEditTurn> {
  if (!isFaqItemAppendInstruction(instruction)) {
    const categoryResult = tryApplyCategoryShowcaseInstruction(
      storefront,
      instruction,
      options?.store,
      options?.planIntent,
      options?.message,
    );
    if (categoryResult) {
      return finalizeStorefrontEdit(
        storefront,
        instruction,
        categoryResult.storefront,
        categoryResult.changed_paths,
        categoryResult.assistant_message,
      );
    }

    const pageBlockResult = tryApplyPageBlockInstruction(storefront, instruction, options?.store);
    if (pageBlockResult) {
      return finalizeStorefrontEdit(
        storefront,
        instruction,
        pageBlockResult.storefront,
        pageBlockResult.changed_paths,
        pageBlockResult.assistant_message,
      );
    }

    const blockResult = tryApplyHomeBlockInstruction(storefront, instruction, options?.store);
    if (blockResult) {
      return finalizeStorefrontEdit(storefront, instruction, blockResult.storefront, blockResult.changed_paths, blockResult.assistant_message);
    }

    const contactFormResult = tryApplyContactFormInstruction(storefront, instruction);
    if (contactFormResult) {
      return finalizeStorefrontEdit(
        storefront,
        instruction,
        contactFormResult.storefront,
        contactFormResult.changed_paths,
        contactFormResult.assistant_message,
      );
    }
  }

  if (shouldRefreshFaq(instruction)) {
    return applyFaqRefreshTurn(storefront, instruction, options?.store);
  }

  const faqResult = tryAppendFaqItem(storefront, instruction);
  if (faqResult) {
    const next = maybeSyncHomeBlocksFromLegacyPaths(faqResult.storefront, faqResult.changed_paths);
    return finalizeStorefrontEdit(
      storefront,
      instruction,
      next,
      faqResult.changed_paths,
      describeStorefrontEdit(faqResult.changed_paths),
    );
  }

  if (shouldResetHeadline(instruction, storefront)) {
    return applyStorefrontEditWithUpdates(
      storefront,
      instruction,
      headlineResetUpdates(storefront, options?.store),
      options?.assistantMessage,
      options?.store,
    );
  }

  const aiResult = await tryAiStorefrontEdit(storefront, instruction, options?.store);
  if (aiResult) return aiResult;

  return applyStorefrontEditWithUpdates(
    storefront,
    instruction,
    options?.updates,
    options?.assistantMessage,
    options?.store,
  );
}

function finalizeStorefrontEdit(
  _original: StorefrontContent,
  instruction: string,
  storefront: StorefrontContent,
  changedPaths: string[],
  assistantMessage: string,
): BuilderEditTurn {
  const next = structuredClone(storefront);
  next.edit_metadata = {
    ...next.edit_metadata,
    user_edited_paths: [...new Set([...(next.edit_metadata?.user_edited_paths ?? []), ...changedPaths])],
    ai_generated_paths: (next.edit_metadata?.ai_generated_paths ?? []).filter(
      (path) => !changedPaths.includes(path),
    ),
    last_generation_prompt: instruction,
    last_generated_at: new Date().toISOString(),
  };

  return {
    storefront: next,
    changed_paths: changedPaths,
    assistant_message: assistantMessage,
  };
}

function applyStorefrontEditWithUpdates(
  storefront: StorefrontContent,
  instruction: string,
  updates?: Record<string, unknown>,
  assistantMessage?: string,
  store?: Store | null,
): BuilderEditTurn {
  if (!isFaqItemAppendInstruction(instruction)) {
    const pageBlockResult = tryApplyPageBlockInstruction(storefront, instruction, store);
    if (pageBlockResult) {
      return finalizeStorefrontEdit(
        storefront,
        instruction,
        pageBlockResult.storefront,
        pageBlockResult.changed_paths,
        pageBlockResult.assistant_message,
      );
    }

    const blockResult = tryApplyHomeBlockInstruction(storefront, instruction, store);
    if (blockResult) {
      return finalizeStorefrontEdit(storefront, instruction, blockResult.storefront, blockResult.changed_paths, blockResult.assistant_message);
    }

    const contactFormResult = tryApplyContactFormInstruction(storefront, instruction);
    if (contactFormResult) {
      return finalizeStorefrontEdit(
        storefront,
        instruction,
        contactFormResult.storefront,
        contactFormResult.changed_paths,
        contactFormResult.assistant_message,
      );
    }
  }

  const faqResult = tryAppendFaqItem(storefront, instruction);
  if (faqResult) {
    const next = maybeSyncHomeBlocksFromLegacyPaths(faqResult.storefront, faqResult.changed_paths);
    return finalizeStorefrontEdit(
      storefront,
      instruction,
      next,
      faqResult.changed_paths,
      describeStorefrontEdit(faqResult.changed_paths),
    );
  }

  if (shouldRefreshFaq(instruction)) {
    return applyFaqRefreshToStorefront(
      storefront,
      instruction,
      defaultFaqItemsForStore(store, storefront),
    );
  }

  const next = structuredClone(storefront);
  const changedPaths: string[] = [];
  const candidateUpdates =
    updates && Object.keys(updates).length
      ? updates
      : fallbackEditUpdates(next, instruction, store);
  const lockedPaths = next.edit_metadata?.locked_paths ?? [];

  for (const [path, value] of Object.entries(candidateUpdates)) {
    if (lockedPaths.includes(path) || typeof value !== "string" || !value.trim()) {
      continue;
    }

    if (setEditableStorefrontPath(next, path, value.trim())) {
      changedPaths.push(path);
    }
  }

  const finalStorefront = maybeSyncHomeBlocksFromLegacyPaths(next, changedPaths);
  return finalizeStorefrontEdit(
    storefront,
    instruction,
    finalStorefront,
    changedPaths,
    assistantMessage ?? describeStorefrontEdit(changedPaths),
  );
}

async function tryAiStorefrontEdit(
  storefront: StorefrontContent,
  instruction: string,
  store?: Store | null,
): Promise<BuilderEditTurn | null> {
  try {
    const data = await postChat({
      model: getThinkingModel(),
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: BUILDER_EDITOR_SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            instruction,
            business: {
              name: store?.business_name ?? null,
              industry: store?.industry ?? null,
              description: store?.description ?? null,
            },
            current_storefront: buildStorefrontEditorContext(storefront),
            allowed_paths: promptAllowedStorefrontPaths(),
          }),
        },
      ],
    });

    const content = getAssistantMessageContent(data);
    const parsed = parseJsonObject<{
      updates?: Record<string, unknown>;
      operations?: unknown[];
      changed_paths?: string[];
      assistant_message?: string;
    }>(content, {});

    const operations = Array.isArray(parsed.operations)
      ? (parsed.operations as Parameters<typeof applyAiBlockOperations>[1])
      : [];
    const rawUpdates = parsed.updates && typeof parsed.updates === "object" ? parsed.updates : {};
    const flatUpdates = flattenAiEditUpdates(rawUpdates);
    const assistantMessage =
      typeof parsed.assistant_message === "string" ? parsed.assistant_message : undefined;

    if (!operations.length && !Object.keys(flatUpdates).length) return null;

    let next = structuredClone(storefront);
    ensureHomeBlocksOnStorefront(next);
    const changedPaths: string[] = [];

    if (operations.length) {
      const opResult = applyAiBlockOperations(next, operations);
      next = opResult.storefront;
      changedPaths.push(...opResult.changed_paths);
    }

    if (Object.keys(flatUpdates).length) {
      const mergedUpdates = mergeMandatoryEditUpdates(instruction, next, flatUpdates, store);
      const lockedPaths = next.edit_metadata?.locked_paths ?? [];

      for (const [path, value] of Object.entries(mergedUpdates)) {
        if (lockedPaths.includes(path) || typeof value !== "string" || !value.trim()) {
          continue;
        }

        if (setEditableStorefrontPath(next, path, value.trim())) {
          changedPaths.push(path);
        }
      }
    }

    const uniqueChangedPaths = [...new Set(changedPaths)];
    if (!uniqueChangedPaths.length) return null;

    const finalStorefront = maybeSyncHomeBlocksFromLegacyPaths(next, uniqueChangedPaths);
    return finalizeStorefrontEdit(
      storefront,
      instruction,
      finalStorefront,
      uniqueChangedPaths,
      assistantMessage ?? describeStorefrontEdit(uniqueChangedPaths),
    );
  } catch {
    return null;
  }
}

function buildStorefrontEditorContext(storefront: StorefrontContent) {
  return {
    hero: storefront.hero,
    about: storefront.about,
    seo: storefront.seo,
    media: storefront.media ?? null,
    home_stats: storefront.home_stats ?? null,
    home_testimonials_title: storefront.home_testimonials_title ?? null,
    home_testimonials_intro: storefront.home_testimonials_intro ?? null,
    home_testimonials: storefront.home_testimonials ?? null,
    value_props: storefront.value_props,
    pages: {
      home: { blocks: resolvePageBlocks(storefront, "home") },
      about: { ...(storefront.pages?.about ?? null), blocks: resolvePageBlocks(storefront, "about") },
      contact: { ...(storefront.pages?.contact ?? null), blocks: resolvePageBlocks(storefront, "contact") },
      faq: { ...(storefront.pages?.faq ?? null), blocks: resolvePageBlocks(storefront, "faq") },
    },
    edit_metadata: storefront.edit_metadata ?? null,
  };
}

export function extractColorFromMessage(message: string): string | null {
  const hex = message.match(/#([0-9A-Fa-f]{6})\b/);
  if (hex) return `#${hex[1]}`;

  for (const { pattern, color } of NAMED_COLOR_PHRASES) {
    if (pattern.test(message)) return color;
  }

  const lower = message.toLowerCase();
  for (const [name, color] of Object.entries(NAMED_COLOR_WORDS)) {
    if (new RegExp(`\\b${name}\\b`, "i").test(lower)) return color;
  }

  return null;
}

export function applyBrandColorToStorefront(
  storefront: StorefrontContent,
  store: Store,
  brandColor: string,
  paletteOverride?: Partial<StorefrontColorPalette>,
): { storefront: StorefrontContent; store: Store; changed_paths: string[] } {
  const templateId = resolveStorefrontTemplate(store, storefront);
  const nextStorefront = structuredClone(storefront);
  nextStorefront.template = {
    id: templateId,
    source: nextStorefront.template?.source ?? "merchant_selected",
  };

  const palette =
    sanitizeStorefrontPalette(paletteOverride, brandColor) ?? derivePaletteFromPrimary(brandColor);

  nextStorefront.palette = palette;

  return {
    storefront: nextStorefront,
    store: { ...store, brand_color: palette.primary },
    changed_paths: paletteChangedPaths(storefront.palette, palette),
  };
}

export function applyColorChangeFromMessage(
  storefront: StorefrontContent,
  store: Store,
  message: string,
  brandColor?: string,
): { storefront: StorefrontContent; store: Store; changed_paths: string[]; color_label?: string } | null {
  if (!isColorIntent(message)) return null;

  const resolvedColor = brandColor ?? extractColorFromMessage(message);
  if (!resolvedColor) return null;

  const result = applyBrandColorToStorefront(storefront, store, resolvedColor);
  return result;
}

export async function resolveBrandColorForMessage(
  message: string,
  store?: Store | null,
  storefront?: StorefrontContent | null,
): Promise<{ brand_color: string; label: string; palette: StorefrontColorPalette } | null> {
  const aiResolved = await resolveBrandColorWithAi(message, {
    business_name: store?.business_name ?? null,
    industry: store?.industry ?? null,
    description: store?.description ?? null,
    current_color: store?.brand_color ?? null,
    current_palette: storefront?.palette ?? null,
  });

  if (aiResolved) return aiResolved;

  const fallback = extractColorFromMessage(message);
  if (!fallback) return null;

  const hint = extractColorHintFromMessage(message);
  const palette = derivePaletteFromPrimary(fallback);
  return {
    brand_color: palette.primary,
    label: hint ? formatColorLabel(hint) : "Custom palette",
    palette,
  };
}

export async function applyColorChangeFromMessageAsync(
  storefront: StorefrontContent,
  store: Store,
  message: string,
): Promise<{ storefront: StorefrontContent; store: Store; changed_paths: string[]; color_label?: string } | null> {
  if (!isColorIntent(message)) return null;

  const resolved = await resolveBrandColorForMessage(message, store, storefront);
  if (!resolved) return null;

  const result = applyBrandColorToStorefront(storefront, store, resolved.brand_color, resolved.palette);
  return { ...result, color_label: resolved.label };
}

export function applyMediaToStorefront(
  storefront: StorefrontContent,
  updates: Partial<Record<"media.hero_image_url" | "media.about_image_url", string>>,
): { storefront: StorefrontContent; changed_paths: string[] } {
  const next = structuredClone(storefront);
  const changedPaths: string[] = [];

  if (updates["media.hero_image_url"]) {
    setEditableStorefrontPath(next, "media.hero_image_url", updates["media.hero_image_url"]);
    changedPaths.push("media.hero_image_url");
  }
  if (updates["media.about_image_url"]) {
    setEditableStorefrontPath(next, "media.about_image_url", updates["media.about_image_url"]);
    changedPaths.push("media.about_image_url");
  }

  return { storefront: next, changed_paths: changedPaths };
}

export function applyStockImagesFromMessage(
  storefront: StorefrontContent,
  store: Store,
): { storefront: StorefrontContent; changed_paths: string[] } {
  const templateId = resolveStorefrontTemplate(store, storefront);
  return applyStockImagesToStorefront(storefront, templateId);
}

export function suggestedActionsForTurn(session: BuilderSession): import("@/lib/api/types").BuilderSuggestedAction[] {
  const industry = session.business_profile.industry ?? session.store?.industry ?? null;
  return colorPresetActions(industry, 3);
}

export function concreteTemplateIds(
  templateOptions: StorefrontTemplateOption[] = STOREFRONT_TEMPLATE_OPTIONS,
): StorefrontTemplateId[] {
  return templateOptions
    .filter((option): option is StorefrontTemplateOption & { value: StorefrontTemplateId } => option.value !== "ai_pick")
    .map((option) => option.value);
}

function conversationalReply(session: BuilderSession, message: string): string {
  if (!message.trim()) {
    return BUILDER_WELCOME_MESSAGE;
  }
  if (session.storefront_snapshot) {
    return 'Tell me what you\'d like to change — for example "Change the button to Shop Gifts" or "Make the homepage more premium". I\'ll update the preview on the right.';
  }
  if (session.store) {
    return 'Say "build my website" whenever you\'re ready and I\'ll create your first draft.';
  }
  return 'Tell me your business name and what you sell — for example "Glow & Wick sells handmade candles for cozy gifts."';
}

function resolveTemplateId(
  store: Store,
  recommendations: StorefrontTemplateRecommendation[] = [],
): StorefrontTemplateId {
  if (store.storefront_template_id && store.storefront_template_id !== "ai_pick") {
    return store.storefront_template_id;
  }
  if (recommendations[0]?.template_id) return recommendations[0].template_id;
  if (store.industry === "beauty_and_skincare") return "cosmetics";
  if (store.industry === "fashion_and_apparel") return "fashion_lookbook";
  return "minimalistic";
}

function heroForStore(name: string, industry: Industry, desc: string) {
  switch (industry) {
    case "food_and_beverage":
      return { headline: `Taste ${name}.`, subheadline: `${desc} Fresh, sourced with care, delivered to your door.`, cta_label: "Shop the menu" };
    case "fashion_and_apparel":
      return { headline: `New season from ${name}.`, subheadline: `${desc} Modern layers and pieces made to move with you.`, cta_label: "Shop the collection" };
    case "beauty_and_skincare":
      return { headline: `Discover the nature with ${name}.`, subheadline: `${desc} Botanical care, clean formulas, and real glow rituals.`, cta_label: "Discover the line" };
    case "electronics":
      return { headline: `${name}, built better.`, subheadline: `${desc} Reliable tech and accessories selected for everyday performance.`, cta_label: "Browse products" };
    case "home_and_living":
      return { headline: `Make it home, with ${name}.`, subheadline: `${desc} Considered objects for the spaces you live in.`, cta_label: "Shop the catalog" };
    case "services":
      return { headline: `${name}, at your service.`, subheadline: `${desc} Book what you need, when you need it.`, cta_label: "Book now" };
    default:
      return { headline: `Welcome to ${name}.`, subheadline: desc, cta_label: "Start shopping" };
  }
}

function valuePropsForIndustry(industry: Industry) {
  if (industry === "fashion_and_apparel") {
    return [
      { title: "Curated drops", body: "Fresh seasonal edits built around complete looks." },
      { title: "Quality fabrics", body: "Comfortable, durable pieces checked before shipping." },
      { title: "Easy styling", body: "Wardrobe staples designed to mix, layer, and repeat." },
    ];
  }
  if (industry === "beauty_and_skincare") {
    return [
      { title: "Botanical care", body: "Ingredients chosen for gentle daily routines." },
      { title: "Clean formulas", body: "Simple textures that support comfort, glow, and consistency." },
      { title: "Routine ready", body: "Products curated to layer easily from cleanser to finish." },
    ];
  }
  return [
    { title: "Made with care", body: "Every item is checked before it reaches your customer." },
    { title: "Fast local delivery", body: "Most orders arrive within 2-4 business days." },
    { title: "Human support", body: "Clear answers from real people when customers need help." },
  ];
}

function productsForIndustry(name: string, industry: Industry, slugBase: string) {
  if (industry === "fashion_and_apparel") {
    return [
      { id: "1", slug: `${slugBase}-oversized-hoodie`, name: "Oversized Hoodie", description: `A relaxed everyday hoodie from ${name}.`, price: 28500, currency: "NGN", image_url: null },
      { id: "2", slug: `${slugBase}-wide-leg-trouser`, name: "Wide Leg Trouser", description: "A clean staple trouser with an easy drape.", price: 32500, currency: "NGN", image_url: null },
      { id: "3", slug: `${slugBase}-cotton-tee`, name: "Cotton Tee", description: "A soft essential tee with a neat shape.", price: 14500, currency: "NGN", image_url: null },
    ];
  }
  if (industry === "beauty_and_skincare") {
    return [
      { id: "1", slug: `${slugBase}-botanical-gel-cleanser`, name: "Botanical Gel Cleanser", description: `A gentle daily cleanser curated by ${name}.`, price: 18500, currency: "NGN", image_url: null, category: "Cleansers" },
      { id: "2", slug: `${slugBase}-glow-repair-serum`, name: "Glow Repair Serum", description: "Lightweight botanical actives for radiance and hydration.", price: 24000, currency: "NGN", image_url: null, category: "Serums" },
      { id: "3", slug: `${slugBase}-daily-radiance-kit`, name: "Daily Radiance Kit", description: "Customer favourites packed for a full skincare routine.", price: 52000, currency: "NGN", image_url: null, category: "Routine kits" },
    ];
  }
  return [
    { id: "1", slug: `${slugBase}-signature-item`, name: `${name} Signature Item`, description: `A customer favourite from ${name}.`, price: 8500, currency: "NGN", image_url: null },
    { id: "2", slug: `${slugBase}-starter-pack`, name: `${name} Starter Pack`, description: `A great way to try ${name} for the first time.`, price: 12500, currency: "NGN", image_url: null },
    { id: "3", slug: `${slugBase}-premium-bundle`, name: `${name} Premium Bundle`, description: "Our best-value bundle for repeat customers.", price: 19900, currency: "NGN", image_url: null },
  ];
}

function stripEditSpam(text: string): string {
  return text
    .replace(/\s*Updated to match your request\./gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function isPlaceholderHeadline(headline: string): boolean {
  const trimmed = headline.trim();
  return /^(new header text|header text|your headline here|headline here|test headline|sample headline)$/i.test(
    trimmed,
  );
}

function inferBusinessName(storefront: StorefrontContent, store?: Store | null): string {
  if (store?.business_name?.trim()) return store.business_name.trim();
  const seoMatch = storefront.seo?.title?.match(/^(.+?)\s*[|–-]/);
  if (seoMatch?.[1]?.trim()) return seoMatch[1].trim();
  return "Our brand";
}

function defaultHeadlineForStorefront(storefront: StorefrontContent, store?: Store | null): string {
  const name = inferBusinessName(storefront, store);
  const industry = (store?.industry ?? "other") as Industry;
  const desc = stripEditSpam(storefront.hero.subheadline || storefront.about.body || "");
  return heroForStore(name, industry, desc).headline;
}

const BUILDER_FAQ_GENERATOR_PROMPT =
  "You write FAQ sections for small business online stores.\n" +
  "Return ONLY valid JSON: {\"items\": [{\"question\": string, \"answer\": string}]}\n" +
  "Write 3-5 practical questions customers would ask this business.\n" +
  "Answers must be 1-2 warm sentences. Use the business name when natural.";

function shouldRefreshFaq(instruction: string): boolean {
  const lower = instruction.toLowerCase();
  return (
    /\b(update|refresh|rewrite|revise|improve|fix|change|regenerate|redo)\b.*\bfaq\b/i.test(lower) ||
    /\bfaq\b.*\b(update|refresh|rewrite|revise|improve|fix|change|answers?|questions?)\b/i.test(lower) ||
    (/\bfaq\b/i.test(lower) &&
      /\b(update|refresh|rewrite|revise|improve|fix|change|answers?|questions?)\b/i.test(lower))
  );
}

function defaultFaqItemsForStore(
  store: Store | null | undefined,
  storefront: StorefrontContent,
): Array<{ question: string; answer: string }> {
  const name = inferBusinessName(storefront, store);
  const industry = store?.industry ?? "other";

  if (industry === "fashion_and_apparel") {
    return [
      {
        question: `How do I choose the right size at ${name}?`,
        answer:
          "Check the size notes on each product page, or message us with your usual size and we will help you pick the best fit.",
      },
      {
        question: "What is your return policy?",
        answer:
          "Unworn items with tags attached can be returned within 14 days. Contact us through the contact page to start a return.",
      },
      {
        question: "How long does delivery take?",
        answer: "Most orders arrive within 2-4 business days across Nigeria once your order is confirmed.",
      },
      {
        question: "Can I change or cancel my order?",
        answer:
          "If your order has not shipped yet, reach out as soon as possible and we will do our best to update it for you.",
      },
    ];
  }

  if (industry === "beauty_and_skincare") {
    return [
      {
        question: `Are ${name} products suitable for daily use?`,
        answer:
          "Yes — our formulas are designed for gentle everyday routines. Patch-test new products if you have sensitive skin.",
      },
      {
        question: "How do I build a routine with your products?",
        answer:
          "Start with cleanser, treatment serum, then moisturizer. Message us if you want a simple routine recommendation.",
      },
      {
        question: "How long does delivery take?",
        answer: "Most orders arrive within 2-4 business days depending on your location.",
      },
    ];
  }

  return [
    {
      question: "How do I place an order?",
      answer: `Browse ${name}, add items to your cart, and complete checkout with your delivery details.`,
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept card payments and bank transfers through secure checkout.",
    },
    {
      question: "How long does delivery take?",
      answer: "Most orders arrive within 2-4 business days depending on your location.",
    },
    {
      question: "How can I contact support?",
      answer: "Use our contact page and our team will reply as quickly as possible.",
    },
  ];
}

function flattenAiEditUpdates(raw: Record<string, unknown>): Record<string, string> {
  const flat: Record<string, string> = {};

  for (const [path, value] of Object.entries(raw)) {
    if (typeof value === "string" && value.trim()) {
      flat[path] = value.trim();
    }
  }

  const nestedFaq = raw["pages.faq.items"];
  if (Array.isArray(nestedFaq)) {
    nestedFaq.forEach((item, index) => {
      if (!item || typeof item !== "object") return;
      const row = item as Record<string, unknown>;
      if (typeof row.question === "string" && row.question.trim()) {
        flat[`pages.faq.items.${index}.question`] = row.question.trim();
      }
      if (typeof row.answer === "string" && row.answer.trim()) {
        flat[`pages.faq.items.${index}.answer`] = row.answer.trim();
      }
    });
  }

  return flat;
}

async function tryAiGenerateFaqItems(
  storefront: StorefrontContent,
  store?: Store | null,
): Promise<Array<{ question: string; answer: string }> | null> {
  try {
    const data = await postChat({
      model: getThinkingModel(),
      temperature: 0.45,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: BUILDER_FAQ_GENERATOR_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            business_name: inferBusinessName(storefront, store),
            industry: store?.industry ?? null,
            description: store?.description ?? storefront.about.body ?? null,
            existing_items: storefront.pages?.faq?.items ?? [],
          }),
        },
      ],
    });

    const content = getAssistantMessageContent(data);
    const parsed = parseJsonObject<{ items?: Array<{ question?: string; answer?: string }> }>(content, {});
    const items = (parsed.items ?? [])
      .map((item) => ({
        question: typeof item.question === "string" ? item.question.trim() : "",
        answer: typeof item.answer === "string" ? item.answer.trim() : "",
      }))
      .filter((item) => item.question && item.answer);

    return items.length >= 2 ? items : null;
  } catch {
    return null;
  }
}

function applyFaqRefreshToStorefront(
  storefront: StorefrontContent,
  instruction: string,
  items: Array<{ question: string; answer: string }>,
): BuilderEditTurn {
  const next = structuredClone(storefront);
  const title = next.pages?.faq?.title?.trim() || "Frequently asked questions";
  next.pages = {
    ...next.pages,
    faq: {
      title,
      source: "merchant",
      items,
    },
  };

  const changedPaths = items.flatMap((_, index) => [
    `pages.faq.items.${index}.question`,
    `pages.faq.items.${index}.answer`,
  ]);

  const finalStorefront = maybeSyncHomeBlocksFromLegacyPaths(next, changedPaths);
  return finalizeStorefrontEdit(
    storefront,
    instruction,
    finalStorefront,
    changedPaths,
    "Done — I refreshed your FAQ with answers tailored to your business. Check the preview on the right.",
  );
}

async function applyFaqRefreshTurn(
  storefront: StorefrontContent,
  instruction: string,
  store?: Store | null,
): Promise<BuilderEditTurn> {
  const items = (await tryAiGenerateFaqItems(storefront, store)) ?? defaultFaqItemsForStore(store, storefront);
  return applyFaqRefreshToStorefront(storefront, instruction, items);
}

function shouldResetHeadline(instruction: string, storefront: StorefrontContent): boolean {
  const lower = instruction.toLowerCase();
  return (
    /\b(remove|delete|clear|reset|fix)\b.*\b(header|headline)\b/i.test(lower) ||
    /\b(header|headline)\b.*\b(remove|delete|clear|reset|fix)\b/i.test(lower) ||
    /\bfit (our|the|my) copy\b/i.test(lower) ||
    /new header text/i.test(instruction) ||
    isPlaceholderHeadline(storefront.hero.headline)
  );
}

function headlineResetUpdates(
  storefront: StorefrontContent,
  store?: Store | null,
): Record<string, string> {
  const updates: Record<string, string> = {
    "hero.headline": defaultHeadlineForStorefront(storefront, store),
  };
  const cleanedSubheadline = stripEditSpam(storefront.hero.subheadline);
  if (cleanedSubheadline !== storefront.hero.subheadline) {
    updates["hero.subheadline"] = cleanedSubheadline;
  }
  return updates;
}

function mergeMandatoryEditUpdates(
  instruction: string,
  storefront: StorefrontContent,
  updates: Record<string, string>,
  store?: Store | null,
): Record<string, string> {
  if (!shouldResetHeadline(instruction, storefront)) {
    return updates;
  }

  return {
    ...updates,
    ...headlineResetUpdates(storefront, store),
  };
}


function fallbackEditUpdates(
  storefront: StorefrontContent,
  instruction: string,
  store?: Store | null,
): Record<string, string> {
  const lower = instruction.toLowerCase();
  const quoted =
    instruction.match(/[""](.+?)["”]/s)?.[1]?.trim() ||
    instruction.match(/\b(?:to|:)\s+(.+)$/is)?.[1]?.trim();

  if (shouldResetHeadline(instruction, storefront)) {
    return headlineResetUpdates(storefront, store);
  }

  if (lower.includes("cta") || lower.includes("button")) {
    return {
      "hero.cta_label": quoted || (lower.includes("collection") ? "Shop the collection" : "Shop now"),
    };
  }

  if (lower.includes("headline") && quoted) {
    return { "hero.headline": quoted };
  }

  if (lower.includes("subheadline") && quoted) {
    return { "hero.subheadline": quoted };
  }

  if (lower.includes("intro") || lower.includes("homepage copy")) {
    if (quoted) return { "hero.subheadline": quoted };
    return { "hero.subheadline": stripEditSpam(storefront.hero.subheadline) };
  }

  if (lower.includes("contact")) {
    return {
      "pages.contact.body":
        quoted ||
        storefront.pages?.contact?.body ||
        "Have a question about an order or product? Reach out and our team will get back to you shortly.",
    };
  }

  if (lower.includes("about") && !lower.includes("faq")) {
    const updates: Record<string, string> = {};
    if (quoted) {
      updates["about.body"] = quoted;
    } else if (lower.includes("family")) {
      updates["about.body"] = `${storefront.about.body} We are a family-run business built on care, trust, and personal service.`.trim();
      updates["about.title"] = storefront.about.title.includes("Our story")
        ? storefront.about.title
        : "Our family story";
    } else if (lower.includes("warm") || lower.includes("warmer")) {
      updates["about.body"] = `${storefront.about.body} We keep every order personal, thoughtful, and made with care.`.trim();
    } else if (lower.includes("premium") || lower.includes("luxury")) {
      updates["about.body"] = `${storefront.about.body} Every detail is chosen for quality, comfort, and a premium customer experience.`.trim();
    } else {
      updates["about.body"] = quoted || `${storefront.about.body}`.trim();
    }
    return updates;
  }

  if (lower.includes("premium") || lower.includes("luxury")) {
    return {
      "hero.headline":
        storefront.hero.headline.replace(/\b(shop|buy|online)\b/gi, "").trim() ||
        defaultHeadlineForStorefront(storefront, store),
      "hero.subheadline": stripEditSpam(
        `${storefront.hero.subheadline} Crafted with premium quality and a refined customer experience.`,
      ),
      "hero.cta_label": "Shop the collection",
    };
  }

  if (quoted) {
    return { "hero.subheadline": quoted };
  }

  return {};
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
