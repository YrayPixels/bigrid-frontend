import type { StorefrontContent } from "@/lib/api/types";
import {
  syncHomeBlocksFromLegacyFields,
  syncLegacyFieldsFromHomeBlocks,
} from "@/lib/storefront/blocks/sync-legacy";

export const BASE_EDITABLE_STOREFRONT_PATHS = [
  "hero.headline",
  "hero.subheadline",
  "hero.cta_label",
  "about.title",
  "about.body",
  "seo.title",
  "seo.description",
  "media.hero_image_url",
  "media.about_image_url",
  "pages.contact.title",
  "pages.contact.body",
  "pages.contact.email",
  "pages.contact.phone",
  "pages.about.title",
  "pages.about.body",
  "pages.faq.title",
] as const;

const EDITABLE_PATH_PATTERNS = [
  /^pages\.faq\.items\.\d+\.(question|answer)$/,
  /^value_props\.\d+\.(title|body)$/,
  /^home_stats\.\d+\.(value|label)$/,
  /^navigation\.\d+\.label$/,
  /^pages\.home\.blocks\.[\w-]+\.props\.(title|body|cta_label)$/,
  /^pages\.(about|contact|faq)\.blocks\.[\w-]+\.props\.(title|body|intro|submit_label|success_message)$/,
];

/** @deprecated Use isEditableStorefrontPath */
export const EDITABLE_STOREFRONT_PATHS = BASE_EDITABLE_STOREFRONT_PATHS;

export function isEditableStorefrontPath(path: string): boolean {
  if (BASE_EDITABLE_STOREFRONT_PATHS.includes(path as (typeof BASE_EDITABLE_STOREFRONT_PATHS)[number])) {
    return true;
  }

  return EDITABLE_PATH_PATTERNS.some((pattern) => pattern.test(path));
}

export function storefrontPathLabel(path: string): string {
  const labels: Record<string, string> = {
    "hero.headline": "homepage headline",
    "hero.subheadline": "homepage intro",
    "hero.cta_label": "shop button",
    "about.title": "about page title",
    "about.body": "about section",
    "pages.about.title": "about page title",
    "pages.about.body": "about section",
    "seo.title": "search title",
    "seo.description": "search description",
    "media.hero_image_url": "homepage header photo",
    "media.about_image_url": "about section photo",
    "pages.contact.title": "contact page title",
    "pages.contact.body": "contact page intro",
    "pages.contact.email": "contact email",
    "pages.contact.phone": "contact phone",
    "pages.faq.title": "FAQ page title",
  };

  if (labels[path]) return labels[path];

  const faqQuestion = path.match(/^pages\.faq\.items\.(\d+)\.question$/);
  if (faqQuestion) return `FAQ question ${Number(faqQuestion[1]) + 1}`;

  const faqAnswer = path.match(/^pages\.faq\.items\.(\d+)\.answer$/);
  if (faqAnswer) return `FAQ answer ${Number(faqAnswer[1]) + 1}`;

  const valueTitle = path.match(/^value_props\.(\d+)\.title$/);
  if (valueTitle) return `trust highlight ${Number(valueTitle[1]) + 1} title`;

  const valueBody = path.match(/^value_props\.(\d+)\.body$/);
  if (valueBody) return `trust highlight ${Number(valueBody[1]) + 1} description`;

  const statValue = path.match(/^home_stats\.(\d+)\.value$/);
  if (statValue) return `homepage stat ${Number(statValue[1]) + 1}`;

  const statLabel = path.match(/^home_stats\.(\d+)\.label$/);
  if (statLabel) return `homepage stat ${Number(statLabel[1]) + 1} label`;

  const navLabel = path.match(/^navigation\.(\d+)\.label$/);
  if (navLabel) return `navigation link ${Number(navLabel[1]) + 1}`;

  const homeBlock = path.match(/^pages\.home\.blocks\.([\w-]+)$/);
  if (homeBlock) {
    const labels: Record<string, string> = {
      "hero-main": "homepage hero",
      "home-stats": "homepage stats",
      "about-spotlight": "about spotlight",
      "serum-promo": "promo banner",
      "trust-features": "trust highlights",
      "featured-products": "product section",
      "home-faq": "homepage FAQ",
    };
    return labels[homeBlock[1]] ?? "homepage section";
  }

  const homeBlockProp = path.match(/^pages\.home\.blocks\.([\w-]+)\.props\.(title|body)$/);
  if (homeBlockProp) {
    return homeBlockProp[2] === "title" ? "homepage section title" : "homepage section copy";
  }

  return path.replaceAll(".", " ");
}

function setAboutField(storefront: StorefrontContent, field: "title" | "body", value: string): void {
  storefront.about[field] = value;

  if (!storefront.pages?.about) {
    storefront.pages = {
      ...storefront.pages,
      about: {
        title: storefront.about.title,
        body: storefront.about.body,
        source: "merchant",
      },
    };
    return;
  }

  storefront.pages.about[field] = value;
  storefront.pages.about.source = "merchant";
}

export function setEditableStorefrontPath(
  storefront: StorefrontContent,
  path: string,
  value: string,
): boolean {
  if (!isEditableStorefrontPath(path)) return false;

  const trimmed =
    path === "seo.title"
      ? value.slice(0, 160)
      : path === "seo.description"
        ? value.slice(0, 300)
        : value.trim();

  if (!trimmed) return false;

  if (path === "hero.headline" || path === "hero.subheadline" || path === "hero.cta_label") {
    const hero = storefront.hero ?? { headline: "", subheadline: "", cta_label: "Shop now" };
    if (path === "hero.headline") storefront.hero = { ...hero, headline: trimmed };
    else if (path === "hero.subheadline") storefront.hero = { ...hero, subheadline: trimmed };
    else storefront.hero = { ...hero, cta_label: trimmed };
  } else if (path === "about.title" || path === "pages.about.title") setAboutField(storefront, "title", trimmed);
  else if (path === "about.body" || path === "pages.about.body") setAboutField(storefront, "body", trimmed);
  else if (path === "seo.title") storefront.seo.title = trimmed;
  else if (path === "seo.description") storefront.seo.description = trimmed;
  else if (path === "media.hero_image_url") {
    storefront.media = { ...storefront.media, hero_image_url: trimmed };
  } else if (path === "media.about_image_url") {
    storefront.media = { ...storefront.media, about_image_url: trimmed };
  } else if (path.startsWith("value_props.")) {
    applyIndexedField(storefront, "value_props", path, trimmed);
  } else if (path.startsWith("home_stats.")) {
    applyIndexedField(storefront, "home_stats", path, trimmed);
  } else if (path.startsWith("pages.faq.items.")) {
    applyFaqItemField(storefront, path, trimmed);
  } else if (path.startsWith("pages.contact.")) {
    applyPageField(storefront, "contact", path, trimmed);
  } else if (path.startsWith("pages.faq.")) {
    applyPageField(storefront, "faq", path, trimmed);
  } else if (path.startsWith("navigation.")) {
    applyIndexedField(storefront, "navigation", path, trimmed);
  } else if (path.startsWith("pages.home.blocks.")) {
    applyHomeBlockPropField(storefront, path, trimmed);
    syncLegacyFieldsFromHomeBlocks(storefront);
    return true;
  }

  const legacyHomePaths =
    path.startsWith("hero.") ||
    path.startsWith("home_stats.") ||
    path.startsWith("about.") ||
    path.startsWith("pages.about.") ||
    path.startsWith("value_props.") ||
    path.startsWith("pages.faq.") ||
    path.startsWith("media.hero_image_url");

  if (legacyHomePaths) {
    syncHomeBlocksFromLegacyFields(storefront);
  }

  if (path.startsWith("pages.contact.")) {
    ensureContactPage(storefront).source = "merchant";
  }

  if (path.startsWith("pages.faq.")) {
    ensureFaqPage(storefront).source = "merchant";
  }

  return true;
}

function applyPageField(
  storefront: StorefrontContent,
  page: "contact" | "faq",
  path: string,
  value: string,
): void {
  const field = path.split(".").at(-1);
  if (!field) return;

  if (page === "contact") {
    const contact = ensureContactPage(storefront);
    if (field === "title" || field === "body" || field === "email" || field === "phone") {
      contact[field] = value;
    }
    return;
  }

  const faq = ensureFaqPage(storefront);
  if (field === "title") {
    faq.title = value;
  }
}

function applyFaqItemField(storefront: StorefrontContent, path: string, value: string): void {
  const match = path.match(/^pages\.faq\.items\.(\d+)\.(question|answer)$/);
  if (!match) return;

  const faq = ensureFaqPage(storefront);
  const index = Number(match[1]);
  const field = match[2] as "question" | "answer";
  if (!faq.items[index]) {
    faq.items[index] = { question: "", answer: "" };
  }
  faq.items[index][field] = value;
}

function applyHomeBlockPropField(storefront: StorefrontContent, path: string, value: string): void {
  const match = path.match(/^pages\.home\.blocks\.([\w-]+)\.props\.(\w+)$/);
  if (!match) return;

  const [, blockId, field] = match;
  const blocks = storefront.pages?.home?.blocks;
  if (!blocks?.length) return;

  const block = blocks.find((item) => item.id === blockId);
  if (!block) return;

  block.props = { ...block.props, [field]: value };
}

function applyIndexedField(
  storefront: StorefrontContent,
  key: "value_props" | "home_stats" | "navigation",
  path: string,
  value: string,
): void {
  const match = path.match(new RegExp(`^${key}\\.(\\d+)\\.(\\w+)$`));
  if (!match) return;

  const index = Number(match[1]);
  const field = match[2];

  if (key === "value_props") {
    if (!storefront.value_props[index]) {
      storefront.value_props[index] = { title: "", body: "" };
    }
    if (field === "title" || field === "body") {
      storefront.value_props[index][field] = value;
    }
    return;
  }

  if (key === "home_stats") {
    storefront.home_stats = storefront.home_stats ?? [];
    if (!storefront.home_stats[index]) {
      storefront.home_stats[index] = { value: "", label: "" };
    }
    if (field === "value" || field === "label") {
      storefront.home_stats[index][field] = value;
    }
    return;
  }

  storefront.navigation = storefront.navigation ?? [];
  if (!storefront.navigation[index]) {
    storefront.navigation[index] = { label: "", href: "/" };
  }
  if (field === "label") {
    storefront.navigation[index].label = value;
  }
}

function ensureContactPage(storefront: StorefrontContent) {
  if (!storefront.pages?.contact) {
    storefront.pages = {
      ...storefront.pages,
      contact: {
        title: "Contact us",
        body: "",
        source: "merchant",
      },
    };
  }

  return storefront.pages.contact!;
}

function ensureFaqPage(storefront: StorefrontContent) {
  if (!storefront.pages?.faq) {
    storefront.pages = {
      ...storefront.pages,
      faq: {
        title: "Frequently asked questions",
        source: "merchant",
        items: [],
      },
    };
  }

  return storefront.pages.faq!;
}

export function tryAppendFaqItem(
  storefront: StorefrontContent,
  instruction: string,
): { storefront: StorefrontContent; changed_paths: string[] } | null {
  const lower = instruction.toLowerCase();
  const isFaqAdd =
    /\b(add|create|new|another)\b.*\b(faq|question)\b/.test(lower) ||
    /\b(faq|question)\b.*\b(add|about)\b/.test(lower) ||
    /\b(third|fourth|fifth|another)\b.*\bfaq\b/.test(lower);

  if (!isFaqAdd) return null;

  const next = structuredClone(storefront);
  const faq = ensureFaqPage(next);
  const quotedPair = instruction.match(/[""](.+?)[""]\s*(?:[—–-]\s*|[,]\s*)[""](.+?)[""]/s);
  const topicMatch = instruction.match(/about\s+[""](.+?)[""]/i);

  let question = "Can I return an item?";
  let answer = "Yes. Contact us within 7 days of delivery if something is not right with your order.";

  if (quotedPair) {
    question = quotedPair[1].trim();
    answer = quotedPair[2].trim();
  } else if (topicMatch) {
    const topic = topicMatch[1].trim();
    question = `What is your policy on ${topic}?`;
    answer = `Contact us and we'll help with any questions about ${topic}.`;
  } else if (lower.includes("return")) {
    question = "What is your return policy?";
    answer = "Contact us within 7 days of delivery if you need a return or exchange.";
  } else if (lower.includes("shipping") || lower.includes("delivery")) {
    question = "How long does delivery take?";
    answer = "Most orders arrive within 2-4 business days depending on your location.";
  }

  const index = faq.items.length;
  faq.items.push({ question, answer });
  faq.source = "merchant";

  syncHomeBlocksFromLegacyFields(next);

  return {
    storefront: next,
    changed_paths: [`pages.faq.items.${index}.question`, `pages.faq.items.${index}.answer`],
  };
}
