import type { StorefrontContent } from "@/lib/api/types";
import { cosmeticsTemplateImages } from "@/lib/storefront/cosmetics-defaults";
import type { StorefrontBlock, StorefrontBlockType } from "@/lib/storefront/blocks/types";

export const MAX_HOME_BLOCKS = 12;

export const PROTECTED_HOME_BLOCK_IDS = new Set(["hero-main"]);

const ADDABLE_HOME_BLOCK_TYPES: StorefrontBlockType[] = [
  "stats_row",
  "rich_text",
  "cta_banner",
  "feature_grid",
  "product_grid",
  "faq",
];

const BLOCK_ID_PREFIX: Record<StorefrontBlockType, string> = {
  hero: "hero",
  stats_row: "home-stats",
  rich_text: "about-spotlight",
  cta_banner: "promo-banner",
  feature_grid: "feature-grid",
  product_grid: "featured-products",
  faq: "home-faq",
  contact_form: "contact-form",
};

export function isAddableHomeBlockType(type: string): type is StorefrontBlockType {
  return ADDABLE_HOME_BLOCK_TYPES.includes(type as StorefrontBlockType);
}

export function canRemoveHomeBlock(blockId: string): boolean {
  return !PROTECTED_HOME_BLOCK_IDS.has(blockId);
}

export function generateHomeBlockId(type: StorefrontBlockType, existingIds: string[]): string {
  const base = BLOCK_ID_PREFIX[type] ?? type.replace("_", "-");
  if (!existingIds.includes(base)) return base;

  let counter = 2;
  while (existingIds.includes(`${base}-${counter}`)) {
    counter += 1;
  }

  return `${base}-${counter}`;
}

export function defaultHomeBlockProps(
  type: StorefrontBlockType,
  storefront: StorefrontContent,
): Record<string, unknown> {
  const valueProps = storefront.value_props?.length
    ? storefront.value_props
    : [
        { title: "100% organic", body: "Botanical ingredients chosen for gentle daily care." },
        { title: "Clinical feel", body: "Simple formulas that support comfort, glow, and consistency." },
        { title: "Herbal products", body: "Clean textures made to layer easily in any routine." },
      ];

  switch (type) {
    case "stats_row":
      return {
        items: storefront.home_stats?.length
          ? storefront.home_stats
          : [
              { value: "Trusted by over 350,000+ Clients", label: "worldwide since 2008" },
              { value: "6M+", label: "Worldwide Product sale per year" },
              { value: "4.6", label: "3,350 Rating Worldwide" },
            ],
      };
    case "rich_text":
      return {
        title: storefront.about.title,
        body: storefront.about.body,
        image_url: cosmeticsTemplateImages.cleanser,
        badges: valueProps.slice(0, 3).map((item) => ({
          value: item.title,
          label: item.body,
        })),
      };
    case "cta_banner":
      return {
        title: "Limited-time offer",
        body: "Discover a calm add-on for your daily routine with lightweight textures and botanical actives.",
        bullets: [
          "Easy to layer morning or evening.",
          "Designed for visible glow and comfort.",
          "A simple step customers understand quickly.",
        ],
        cta_label: "Shop now",
        cta_href: "/products",
        image_url: cosmeticsTemplateImages.serum,
        layout: "text_left",
      };
    case "feature_grid":
      return {
        title: "Why customers choose us",
        body: "Thoughtful formulas, calm textures, and trust blocks that match your brand story.",
        items: valueProps.slice(0, 3),
      };
    case "product_grid":
      return {
        title: "Shop the line",
        limit: 4,
      };
    case "faq":
      return {
        title: storefront.pages?.faq?.title ?? "Frequently asked questions",
        items: storefront.pages?.faq?.items?.slice(0, 4) ?? [],
      };
    default:
      return {};
  }
}

export function createHomeBlock(
  type: StorefrontBlockType,
  storefront: StorefrontContent,
  existingIds: string[],
  props?: Record<string, unknown>,
): StorefrontBlock {
  return {
    id: generateHomeBlockId(type, existingIds),
    type,
    props: {
      ...defaultHomeBlockProps(type, storefront),
      ...props,
    },
  };
}

export function insertHomeBlock(
  blocks: StorefrontBlock[],
  block: StorefrontBlock,
  placement?: { after?: string; before?: string },
): void {
  if (placement?.before) {
    const index = blocks.findIndex((item) => item.id === placement.before);
    if (index >= 0) {
      blocks.splice(index, 0, block);
      return;
    }
  }

  if (placement?.after) {
    const index = blocks.findIndex((item) => item.id === placement.after);
    if (index >= 0) {
      blocks.splice(index + 1, 0, block);
      return;
    }
  }

  blocks.push(block);
}

export function resolveBlockTypeFromInstruction(instruction: string): StorefrontBlockType | null {
  const lower = instruction.toLowerCase();

  if (/\b(promo|banner|cta)\b/.test(lower)) return "cta_banner";
  if (/\b(testimonial|trust|feature|highlight)\b/.test(lower)) return "feature_grid";
  if (/\b(stats|statistics)\b/.test(lower)) return "stats_row";
  if (/\b(products?|shop)\b.*\b(section|grid|area)\b/.test(lower) || /\b(product grid|shop section)\b/.test(lower)) {
    return "product_grid";
  }
  if (/\bfaq\b|\bquestions\b/.test(lower)) return "faq";
  if (/\b(about|spotlight|story)\b/.test(lower)) return "rich_text";

  return null;
}

export function resolvePlacementFromInstruction(
  instruction: string,
  _blocks: StorefrontBlock[],
): { after?: string; before?: string } {
  const lower = instruction.toLowerCase();
  if (/\b(above|before)\b.*\bfaq\b/.test(lower)) return { before: "home-faq" };
  if (/\b(below|after|under)\b.*\bfaq\b/.test(lower)) return { after: "home-faq" };
  if (/\b(above|before)\b.*\bproduct/.test(lower)) return { before: "featured-products" };
  if (/\b(below|after|under)\b.*\bproduct/.test(lower)) return { after: "featured-products" };
  if (/\b(above|before)\b.*\btrust\b/.test(lower)) return { before: "trust-features" };
  if (/\b(below|after|under)\b.*\btrust\b/.test(lower)) return { after: "trust-features" };
  if (/\b(above|before)\b.*\bhero\b/.test(lower)) return { after: "hero-main" };
  if (/\b(below|after|under)\b.*\bhero\b/.test(lower)) return { after: "hero-main" };

  return { after: "trust-features" };
}

export function resolveRemoveBlockId(instruction: string, blocks: StorefrontBlock[]): string | null {
  const lower = instruction.toLowerCase();

  if (/\b(stats|statistics)\b/.test(lower)) return "home-stats";
  if (/\b(products?|shop)\b/.test(lower) && /\b(section|grid|area|line)\b/.test(lower)) {
    return blocks.find((block) => block.type === "product_grid")?.id ?? "featured-products";
  }
  if (/\bfaq\b|\bquestions\b/.test(lower)) return "home-faq";
  if (/\b(trust|feature|highlight|testimonial)\b/.test(lower)) return "trust-features";
  if (/\b(about|spotlight)\b/.test(lower)) return "about-spotlight";
  if (/\b(promo|banner|serum)\b/.test(lower)) {
    return blocks.find((block) => block.type === "cta_banner")?.id ?? "serum-promo";
  }

  return null;
}

export function blockTypeLabel(type: StorefrontBlockType): string {
  const labels: Record<StorefrontBlockType, string> = {
    hero: "homepage hero",
    stats_row: "stats section",
    rich_text: "about spotlight",
    cta_banner: "promo banner",
    feature_grid: "trust highlights",
    product_grid: "product section",
    faq: "FAQ section",
    contact_form: "contact form",
  };

  return labels[type];
}

/** True when the merchant wants a new FAQ list item, not a homepage FAQ block. */
export function isFaqItemAppendInstruction(instruction: string): boolean {
  const lower = instruction.toLowerCase();
  const isFaqAdd =
    /\b(add|create|new|another)\b.*\b(faq|question)\b/.test(lower) ||
    /\b(faq|question)\b.*\b(add|about)\b/.test(lower) ||
    /\b(third|fourth|fifth|another)\b.*\bfaq\b/.test(lower);

  if (!isFaqAdd) return false;

  if (/\b(banner|promo|section|block|homepage|home page)\b/.test(lower)) {
    return false;
  }

  return true;
}
