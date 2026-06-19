import {
  STOREFRONT_TEMPLATE_OPTIONS,
  type BuilderBusinessProfile,
  type BuilderSession,
  type Industry,
  type Store,
  type StorefrontContent,
  type StorefrontTemplateId,
  type StorefrontTemplateOption,
  type StorefrontTemplateRecommendation,
} from "@/lib/api/types";
import { getDefaultStorefrontPalette } from "@/lib/storefront/template";

export const EDITABLE_STOREFRONT_PATHS = [
  "hero.headline",
  "hero.subheadline",
  "hero.cta_label",
  "about.title",
  "about.body",
  "seo.title",
  "seo.description",
] as const;

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

  if (message.trim().length > 20) next.description = message.trim();

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
  if (!isSubstantiveBuilderMessage(message)) {
    return {
      business_profile: sanitizeBusinessProfile(session.business_profile ?? {}),
      status: session.status,
      assistant_message: conversationalReply(session, message),
      assistant_payload: { type: "conversation" },
    };
  }

  const profile = extractBusinessProfile(message, session.business_profile ?? {});
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

  const top = recommendations[0];
  const wantsWebsite = /\b(build|create|draft|generate|go ahead|make it|start|website|site)\b/i.test(message);
  const selectedTemplateId =
    session.selected_template_id ?? (wantsWebsite && top ? top.template_id : top?.template_id ?? null);
  const shouldGenerate =
    wantsWebsite &&
    !!selectedTemplateId &&
    availableTemplateIds.includes(selectedTemplateId as StorefrontTemplateId);

  return {
    business_profile: profile,
    status: shouldGenerate ? "content_generated" : "template_recommendation",
    selected_template_id: selectedTemplateId,
    storefront: shouldGenerate
      ? synthesizeStorefront(profileToStore(profile, selectedTemplateId), recommendations)
      : undefined,
    assistant_message: shouldGenerate
      ? "Your website is ready. Preview it on the right, then tell me what to refine — headline, about section, CTA, or SEO."
      : "I have a clear picture of your business. Say “build my website” and I’ll design and generate your first draft.",
    assistant_payload: {
      type: shouldGenerate ? "website_generated" : "agent_turn",
      profile,
    },
  };
}

export function profileToStore(
  profile: BuilderBusinessProfile,
  selectedTemplateId?: StorefrontTemplateId | null,
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

  return {
    template: {
      id: templateId,
      source: store.storefront_template_id === "ai_pick" ? "ai_selected" : "merchant_selected",
    },
    palette: getDefaultStorefrontPalette(templateId, store.brand_color),
    data_plugs: { home_products_source: "merchant_products" },
    hero,
    about,
    value_props: copy?.value_props ?? valuePropsForIndustry(store.industry),
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
  };
}

export function applyStorefrontEdit(
  storefront: StorefrontContent,
  instruction: string,
  updates?: Record<string, unknown>,
  assistantMessage?: string,
): BuilderEditTurn {
  const next = structuredClone(storefront);
  const changedPaths: string[] = [];
  const candidateUpdates = updates && Object.keys(updates).length ? updates : fallbackEditUpdates(next, instruction);
  const lockedPaths = next.edit_metadata?.locked_paths ?? [];

  for (const [path, value] of Object.entries(candidateUpdates)) {
    if (
      !EDITABLE_STOREFRONT_PATHS.includes(path as (typeof EDITABLE_STOREFRONT_PATHS)[number]) ||
      lockedPaths.includes(path) ||
      typeof value !== "string" ||
      !value.trim()
    ) {
      continue;
    }

    setEditablePath(next, path, value.trim());
    changedPaths.push(path);
  }

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
    assistant_message:
      assistantMessage ??
      (changedPaths.length
        ? `Updated: ${changedPaths.join(", ")}.`
        : "I reviewed your request but did not change any protected fields."),
  };
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
    return "Hi! Tell me about your business, what you sell, who it is for, and the vibe you want. I will design and build your website.";
  }
  if (session.storefront_snapshot) return "Tell me what you want changed on your website and I will update it.";
  if (session.store) return "Say “build my website” whenever you are ready and I will generate your first draft.";
  return "Tell me your business name and what you sell, then I will start designing your website.";
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

function fallbackEditUpdates(storefront: StorefrontContent, instruction: string): Record<string, string> {
  const lower = instruction.toLowerCase();
  if (lower.includes("cta") || lower.includes("button")) {
    return { "hero.cta_label": lower.includes("collection") ? "Shop the collection" : "Discover more" };
  }
  if (lower.includes("premium") || lower.includes("luxury")) {
    return {
      "hero.headline": storefront.hero.headline.replace(/\b(shop|buy|online)\b/gi, "").trim() || storefront.hero.headline,
      "hero.subheadline": `${storefront.hero.subheadline} Crafted with premium quality and a refined customer experience.`,
      "hero.cta_label": "Shop the collection",
    };
  }
  if (lower.includes("about")) return { "about.body": `${storefront.about.body} Updated to match your request.` };
  return { "hero.subheadline": `${storefront.hero.subheadline} Updated to match your request.` };
}

function setEditablePath(storefront: StorefrontContent, path: string, value: string): void {
  if (path === "hero.headline") storefront.hero.headline = value;
  if (path === "hero.subheadline") storefront.hero.subheadline = value;
  if (path === "hero.cta_label") storefront.hero.cta_label = value;
  if (path === "about.title") {
    storefront.about.title = value;
    if (storefront.pages?.about) storefront.pages.about.title = value;
  }
  if (path === "about.body") {
    storefront.about.body = value;
    if (storefront.pages?.about) storefront.pages.about.body = value;
  }
  if (path === "seo.title") storefront.seo.title = value.slice(0, 160);
  if (path === "seo.description") storefront.seo.description = value.slice(0, 300);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
