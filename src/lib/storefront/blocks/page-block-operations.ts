import type { Store, StorefrontContent } from "@/lib/api/types";
import {
  blockTypeLabel,
  createHomeBlock,
  defaultHomeBlockProps,
  insertHomeBlock,
  isAddableHomeBlockType,
  resolveBlockTypeFromInstruction,
  resolvePlacementFromInstruction,
  resolveRemoveBlockId,
} from "@/lib/storefront/blocks/catalog";
import {
  defaultContactFormProps,
  migrateAboutBlocks,
  migrateContactBlocks,
  migrateFaqBlocks,
  resolvePageBlocks,
} from "@/lib/storefront/blocks/migrate-page-blocks";
import {
  syncAboutBlocksFromLegacyFields,
  syncContactBlocksFromLegacyFields,
  syncFaqBlocksFromLegacyFields,
  syncLegacyFieldsFromAboutBlocks,
  syncLegacyFieldsFromContactBlocks,
  syncLegacyFieldsFromFaqBlocks,
} from "@/lib/storefront/blocks/sync-page-legacy";
import { syncLegacyFieldsFromHomeBlocks } from "@/lib/storefront/blocks/sync-legacy";
import type {
  ContactFormBlockProps,
  FaqBlockProps,
  FeatureGridBlockProps,
  HeroBlockProps,
  RichTextBlockProps,
  StorefrontBlock,
  StorefrontBlockOperation,
  StorefrontBlockType,
  StorefrontContentPageSlug,
} from "@/lib/storefront/blocks/types";

export const MAX_PAGE_BLOCKS = 12;

const PROTECTED_BLOCK_IDS: Record<StorefrontContentPageSlug, Set<string>> = {
  home: new Set(["hero-main"]),
  about: new Set(["about-main"]),
  contact: new Set(["contact-form"]),
  faq: new Set(["faq-main"]),
};

const PAGE_BLOCK_ALIASES: Record<string, StorefrontContentPageSlug> = {
  home: "home",
  homepage: "home",
  "home page": "home",
  about: "about",
  "about page": "about",
  "about us": "about",
  contact: "contact",
  "contact page": "contact",
  faq: "faq",
  "faq page": "faq",
  questions: "faq",
};

const BLOCK_ID_ALIASES: Record<string, string> = {
  hero: "hero-main",
  "homepage hero": "hero-main",
  stats: "home-stats",
  statistics: "home-stats",
  spotlight: "about-spotlight",
  "about spotlight": "about-spotlight",
  "about main": "about-main",
  "about section": "about-main",
  "about features": "about-features",
  trust: "trust-features",
  features: "trust-features",
  "trust section": "trust-features",
  promo: "serum-promo",
  banner: "serum-promo",
  products: "featured-products",
  "product grid": "featured-products",
  "home faq": "home-faq",
  "faq section": "faq-main",
  "contact intro": "contact-intro",
  "contact form": "contact-form",
  form: "contact-form",
};

export function resolvePageFromInstruction(instruction: string): StorefrontContentPageSlug {
  const lower = instruction.toLowerCase();

  for (const [alias, page] of Object.entries(PAGE_BLOCK_ALIASES)) {
    if (lower.includes(alias)) return page;
  }

  return "home";
}

export function findBlockIndex(blocks: StorefrontBlock[], blockId: string): number {
  return blocks.findIndex((block) => block.id === blockId);
}

export function isBlockLocked(block: StorefrontBlock | undefined): boolean {
  return block?.edit_metadata?.locked === true;
}

export function canRemovePageBlock(page: StorefrontContentPageSlug, blockId: string): boolean {
  return !PROTECTED_BLOCK_IDS[page].has(blockId);
}

function syncPageLegacy(
  storefront: StorefrontContent,
  page: StorefrontContentPageSlug,
  blocks: StorefrontBlock[],
): void {
  if (page === "home") {
    syncLegacyFieldsFromHomeBlocks(storefront, blocks);
    return;
  }
  if (page === "about") {
    syncLegacyFieldsFromAboutBlocks(storefront, blocks);
    return;
  }
  if (page === "contact") {
    syncLegacyFieldsFromContactBlocks(storefront, blocks);
    return;
  }
  syncLegacyFieldsFromFaqBlocks(storefront, blocks);
}

function ensurePageBlocks(storefront: StorefrontContent, page: StorefrontContentPageSlug, blocks: StorefrontBlock[]) {
  if (page === "home") {
    storefront.pages = { ...storefront.pages, home: { blocks } };
    return;
  }

  const key = page as "about" | "contact" | "faq";
  storefront.pages = {
    ...storefront.pages,
    about: storefront.pages?.about ?? {
      title: storefront.about.title,
      body: storefront.about.body,
      source: "merchant",
    },
    contact: storefront.pages?.contact ?? {
      title: "Contact us",
      body: "",
      email: null,
      phone: null,
      source: "merchant",
    },
    faq: storefront.pages?.faq ?? {
      title: "Frequently asked questions",
      source: "merchant",
      items: [],
    },
    privacy_policy: storefront.pages?.privacy_policy ?? {
      title: "Privacy policy",
      body: "",
      source: "platform_default",
    },
    home: storefront.pages?.home,
    [key]: {
      ...(storefront.pages?.[key] ?? {}),
      blocks,
    },
  };
}

export function resolveBlockIdFromInstruction(
  instruction: string,
  page: StorefrontContentPageSlug,
  blocks: StorefrontBlock[],
): string | null {
  const lower = instruction.toLowerCase();

  for (const [alias, blockId] of Object.entries(BLOCK_ID_ALIASES)) {
    if (lower.includes(alias) && blocks.some((block) => block.id === blockId)) {
      return blockId;
    }
  }

  if (/\bhero\b/.test(lower)) return blocks.find((b) => b.type === "hero")?.id ?? "hero-main";
  if (/\b(stats|statistics)\b/.test(lower)) return blocks.find((b) => b.type === "stats_row")?.id ?? "home-stats";
  if (/\b(trust|feature|highlight)\b/.test(lower)) {
    return blocks.find((b) => b.type === "feature_grid")?.id ?? (page === "about" ? "about-features" : "trust-features");
  }
  if (/\bfaq\b|\bquestions\b/.test(lower)) return blocks.find((b) => b.type === "faq")?.id ?? (page === "faq" ? "faq-main" : "home-faq");
  if (/\b(contact form|form)\b/.test(lower)) return blocks.find((b) => b.type === "contact_form")?.id ?? "contact-form";
  if (/\b(contact|intro)\b/.test(lower) && page === "contact") {
    return blocks.find((b) => b.type === "rich_text")?.id ?? "contact-intro";
  }
  if (/\b(about|story|spotlight)\b/.test(lower)) {
    return blocks.find((b) => b.type === "rich_text")?.id ?? (page === "about" ? "about-main" : "about-spotlight");
  }
  if (/\b(products?|shop)\b/.test(lower)) return blocks.find((b) => b.type === "product_grid")?.id ?? "featured-products";
  if (/\b(promo|banner|cta)\b/.test(lower)) return blocks.find((b) => b.type === "cta_banner")?.id ?? "serum-promo";

  return blocks[0]?.id ?? null;
}

export function regenerateSectionProps(
  block: StorefrontBlock,
  storefront: StorefrontContent,
  store?: Store | null,
): Record<string, unknown> {
  const businessName = store?.business_name ?? storefront.hero.headline ?? "Our store";
  const industry = store?.industry ?? "other";

  switch (block.type) {
    case "hero": {
      const layouts: HeroBlockProps["layout"][] = ["split", "centered", "image_right"];
      const layout = layouts[Math.floor(Math.random() * layouts.length)];
      return {
        eyebrow: "Crafted for everyday care",
        headline: businessName,
        subheadline: `Thoughtful ${industry.replaceAll("_", " ")} essentials with a calm, premium feel.`,
        cta_label: "Shop now",
        layout,
      };
    }
    case "stats_row":
      return {
        items: [
          { value: "Trusted by thousands", label: "of happy customers" },
          { value: "Fast delivery", label: "across Nigeria" },
          { value: "4.8★", label: "average customer rating" },
        ],
      };
    case "rich_text":
      return {
        title: pageTitleForBlock(block, storefront),
        body: store?.description?.trim() || storefront.about.body,
      };
    case "feature_grid":
      return {
        title: "Why customers choose us",
        body: "Clear quality, honest messaging, and a shopping experience that feels easy from the first visit.",
        items: (storefront.value_props?.length ? storefront.value_props : defaultHomeBlockProps("feature_grid", storefront).items) as FeatureGridBlockProps["items"],
      };
    case "cta_banner":
      return {
        title: "Discover something new",
        body: "A calm add-on for your routine — easy to understand and simple to shop.",
        cta_label: "Explore",
        cta_href: "/products",
      };
    case "product_grid":
      return { title: "Shop the line", limit: 4 };
    case "faq":
      return {
        title: storefront.pages?.faq?.title ?? "Frequently asked questions",
        items: defaultFaqItems(businessName, industry),
      };
    case "contact_form": {
      const existing = block.props as ContactFormBlockProps;
      return {
        ...defaultContactFormProps(storefront, existing.fields),
        intro: "Tell us what you need — we typically reply within one business day.",
      };
    }
    default:
      return {};
  }
}

function pageTitleForBlock(block: StorefrontBlock, storefront: StorefrontContent): string {
  if (block.id === "contact-intro") return storefront.pages?.contact?.title ?? "Contact us";
  if (block.id === "about-main") return storefront.pages?.about?.title ?? storefront.about.title;
  return storefront.about.title;
}

function defaultFaqItems(businessName: string, industry: string) {
  return [
    {
      question: "How do I place an order?",
      answer: `Browse ${businessName}, add items to your cart, and complete checkout with your delivery details.`,
    },
    {
      question: "How long does delivery take?",
      answer: "Most orders arrive within 2–4 business days depending on your location.",
    },
    {
      question: `What makes ${businessName} different?`,
      answer: `We focus on ${industry.replaceAll("_", " ")} products with clear information and reliable service.`,
    },
    {
      question: "How can I get help?",
      answer: "Use the contact page and our team will reply as quickly as possible.",
    },
  ];
}

export function applyPageBlockOperations(
  storefront: StorefrontContent,
  page: StorefrontContentPageSlug,
  operations: StorefrontBlockOperation[],
  store?: Store | null,
): { storefront: StorefrontContent; changed_block_ids: string[] } {
  const next = structuredClone(storefront);
  const blocks = resolvePageBlocks(next, page).map((block) => ({
    ...block,
    props: { ...block.props },
  }));
  const changed = new Set<string>();

  for (const operation of operations) {
    const targetPage = operation.page ?? page;

    if (targetPage !== page) continue;

    if (operation.op === "update_block") {
      const index = findBlockIndex(blocks, operation.block_id);
      if (index < 0 || isBlockLocked(blocks[index])) continue;
      blocks[index] = {
        ...blocks[index],
        props: { ...blocks[index].props, ...operation.props },
        edit_metadata: { source: "ai_generated", locked: false },
      };
      changed.add(operation.block_id);
      continue;
    }

    if (operation.op === "regenerate_section") {
      const index = findBlockIndex(blocks, operation.block_id);
      if (index < 0 || isBlockLocked(blocks[index])) continue;
      blocks[index] = {
        ...blocks[index],
        props: {
          ...blocks[index].props,
          ...regenerateSectionProps(blocks[index], next, store),
          ...operation.props,
        },
        edit_metadata: { source: "ai_generated", locked: false },
      };
      changed.add(operation.block_id);
      continue;
    }

    if (operation.op === "reorder_blocks") {
      const lookup = new Map(blocks.map((block) => [block.id, block]));
      const reordered = operation.order
        .map((id) => lookup.get(id))
        .filter((block): block is StorefrontBlock => !!block);
      const remaining = blocks.filter((block) => !operation.order.includes(block.id));
      blocks.splice(0, blocks.length, ...reordered, ...remaining);
      operation.order.forEach((id) => changed.add(id));
      continue;
    }

    if (operation.op === "remove_block") {
      if (!canRemovePageBlock(page, operation.block_id)) continue;
      const index = findBlockIndex(blocks, operation.block_id);
      if (index < 0) continue;
      blocks.splice(index, 1);
      changed.add(operation.block_id);
      continue;
    }

    if (operation.op === "add_block") {
      if (!isAddableHomeBlockType(operation.type) || blocks.length >= MAX_PAGE_BLOCKS) continue;
      const block = createHomeBlock(
        operation.type,
        next,
        blocks.map((item) => item.id),
        operation.props,
      );
      insertHomeBlock(blocks, block, { after: operation.after, before: operation.before });
      changed.add(block.id);
    }
  }

  ensurePageBlocks(next, page, blocks);
  syncPageLegacy(next, page, blocks);

  return { storefront: next, changed_block_ids: [...changed] };
}

export function describePageBlockChanges(
  page: StorefrontContentPageSlug,
  changedBlockIds: string[],
  operations: StorefrontBlockOperation[] = [],
): string {
  const regen = operations.find((op) => op.op === "regenerate_section");
  if (regen?.op === "regenerate_section") {
    const label = pageLabel(page);
    return `Done — I redesigned that ${label} section. Check the preview on the right.`;
  }

  if (changedBlockIds.length === 1) {
    return `Done — I updated a section on your ${pageLabel(page)} page. Check the preview on the right.`;
  }

  return `Done — I updated your ${pageLabel(page)} page sections. Check the preview on the right.`;
}

function pageLabel(page: StorefrontContentPageSlug): string {
  return { home: "homepage", about: "about", contact: "contact", faq: "FAQ" }[page];
}

export function tryRegenerateSection(
  storefront: StorefrontContent,
  instruction: string,
  store?: Store | null,
): { storefront: StorefrontContent; changed_paths: string[]; assistant_message: string } | null {
  const lower = instruction.toLowerCase();
  if (!/\b(redesign|regenerate|refresh|rewrite|fix)\b/.test(lower)) return null;
  if (/\b(entire|whole|full|all)\b.*\b(site|storefront|website)\b/.test(lower)) return null;

  const page = resolvePageFromInstruction(instruction);
  const blocks = resolvePageBlocks(storefront, page);
  const blockId = resolveBlockIdFromInstruction(instruction, page, blocks);
  if (!blockId) return null;

  const result = applyPageBlockOperations(storefront, page, [
    { op: "regenerate_section", page, block_id: blockId },
  ], store);

  if (!result.changed_block_ids.length) return null;

  return {
    storefront: result.storefront,
    changed_paths: result.changed_block_ids.map((id) => `pages.${page}.blocks.${id}`),
    assistant_message: describePageBlockChanges(page, result.changed_block_ids, [
      { op: "regenerate_section", page, block_id: blockId },
    ]),
  };
}

export function tryApplyPageBlockInstruction(
  storefront: StorefrontContent,
  instruction: string,
  store?: Store | null,
): { storefront: StorefrontContent; changed_paths: string[]; assistant_message: string } | null {
  const regen = tryRegenerateSection(storefront, instruction, store);
  if (regen) return regen;

  const page = resolvePageFromInstruction(instruction);
  const operations = parsePageBlockInstruction(instruction, storefront, page);
  if (!operations?.length) return null;

  const result = applyPageBlockOperations(storefront, page, operations, store);
  if (!result.changed_block_ids.length) return null;

  return {
    storefront: result.storefront,
    changed_paths: result.changed_block_ids.map((id) => `pages.${page}.blocks.${id}`),
    assistant_message: describePageBlockChanges(page, result.changed_block_ids, operations),
  };
}

export function parsePageBlockInstruction(
  instruction: string,
  storefront: StorefrontContent,
  page: StorefrontContentPageSlug = resolvePageFromInstruction(instruction),
): StorefrontBlockOperation[] | null {
  const lower = instruction.toLowerCase();
  const blocks = resolvePageBlocks(storefront, page);

  if (page === "home") {
    if (/\bmove\b.*\bfaq\b.*\babove\b.*\bproduct/.test(lower)) {
      return [{ op: "reorder_blocks", page, order: buildOrderWithFaqBeforeProducts(blocks.map((b) => b.id)) }];
    }
    if (/\bmove\b.*\bproduct/.test(lower) && /\babove\b.*\bfaq/.test(lower)) {
      return [{ op: "reorder_blocks", page, order: buildOrderWithProductsBeforeFaq(blocks.map((b) => b.id)) }];
    }
  }

  if (/\b(remove|delete|hide)\b/.test(lower)) {
    const blockId = resolveBlockIdFromInstruction(instruction, page, blocks) ?? resolveRemoveBlockId(instruction, blocks);
    if (blockId && canRemovePageBlock(page, blockId) && findBlockIndex(blocks, blockId) >= 0) {
      return [{ op: "remove_block", page, block_id: blockId }];
    }
  }

  if (/\b(add|insert|create|include)\b/.test(lower) && page === "home") {
    const type = resolveBlockTypeFromInstruction(instruction);
    if (type && isAddableHomeBlockType(type)) {
      const placement = resolvePlacementFromInstruction(instruction, blocks);
      return [{ op: "add_block", page, type, after: placement.after, before: placement.before }];
    }
  }

  if (/\b(make|update).*\b(trust|feature|highlight)/.test(lower) && /\bpremium|luxury|refined/.test(lower)) {
    const blockId = blocks.find((b) => b.type === "feature_grid")?.id ?? "trust-features";
    return [
      {
        op: "update_block",
        page,
        block_id: blockId,
        props: {
          title: "Why Choose Us",
          body: "Premium formulas, calm textures, and trust blocks designed for a refined everyday routine.",
        },
      },
    ];
  }

  if (/\b(make|update).*\bhero\b.*\bpremium|luxury/.test(lower)) {
    return [
      {
        op: "update_block",
        page: "home",
        block_id: "hero-main",
        props: { subheadline: "Premium botanical skincare with clean formulas and a refined daily ritual." },
      },
    ];
  }

  return null;
}

function buildOrderWithFaqBeforeProducts(currentOrder: string[]): string[] {
  const without = currentOrder.filter((id) => id !== "home-faq" && id !== "featured-products");
  const anchorIndex = without.indexOf("trust-features");
  const insertAt = anchorIndex >= 0 ? anchorIndex + 1 : without.length;
  return [...without.slice(0, insertAt), "home-faq", "featured-products", ...without.slice(insertAt)];
}

function buildOrderWithProductsBeforeFaq(currentOrder: string[]): string[] {
  const without = currentOrder.filter((id) => id !== "home-faq" && id !== "featured-products");
  const anchorIndex = without.indexOf("trust-features");
  const insertAt = anchorIndex >= 0 ? anchorIndex + 1 : without.length;
  return [...without.slice(0, insertAt), "featured-products", "home-faq", ...without.slice(insertAt)];
}

export function applyAiBlockOperations(
  storefront: StorefrontContent,
  operations: StorefrontBlockOperation[],
): { storefront: StorefrontContent; changed_paths: string[] } {
  let next = structuredClone(storefront);
  const allChanged: string[] = [];

  const byPage = new Map<StorefrontContentPageSlug, StorefrontBlockOperation[]>();
  for (const op of operations) {
    const page = op.page ?? ("home" as StorefrontContentPageSlug);
    byPage.set(page, [...(byPage.get(page) ?? []), { ...op, page }]);
  }

  for (const [page, pageOps] of byPage) {
    const result = applyPageBlockOperations(next, page, pageOps);
    next = result.storefront;
    allChanged.push(...result.changed_block_ids.map((id) => `pages.${page}.blocks.${id}`));
  }

  return { storefront: next, changed_paths: [...new Set(allChanged)] };
}

export function syncAllPageBlocksFromLegacy(storefront: StorefrontContent): StorefrontContent {
  const next = structuredClone(storefront);
  syncAboutBlocksFromLegacyFields(next);
  syncContactBlocksFromLegacyFields(next);
  syncFaqBlocksFromLegacyFields(next);
  return next;
}
