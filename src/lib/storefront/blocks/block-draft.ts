import type { StorefrontContent } from "@/lib/api/types";
import { applyPageBlockOperations } from "@/lib/storefront/blocks/page-block-operations";
import { resolvePageBlocks } from "@/lib/storefront/blocks/migrate-page-blocks";
import { syncLegacyFieldsFromHomeBlocks } from "@/lib/storefront/blocks/sync-legacy";
import {
  syncLegacyFieldsFromAboutBlocks,
  syncLegacyFieldsFromContactBlocks,
  syncLegacyFieldsFromFaqBlocks,
} from "@/lib/storefront/blocks/sync-page-legacy";
import type { StorefrontBlock, StorefrontContentPageSlug } from "@/lib/storefront/blocks/types";
import { blockTypeLabel } from "@/lib/storefront/blocks/catalog";
import { cloneStorefrontContent } from "@/lib/storefront/draft";

export type SelectedBlockRef = {
  page: StorefrontContentPageSlug;
  blockId: string;
};

export function findPageBlock(
  storefront: StorefrontContent,
  page: StorefrontContentPageSlug,
  blockId: string,
): StorefrontBlock | null {
  return resolvePageBlocks(storefront, page).find((block) => block.id === blockId) ?? null;
}

export function blockSectionLabel(
  page: StorefrontContentPageSlug,
  block: StorefrontBlock,
): string {
  const pageLabel =
    page === "home" ? "Homepage" : page === "faq" ? "FAQ" : page.charAt(0).toUpperCase() + page.slice(1);
  return `${pageLabel} · ${blockTypeLabel(block.type)}`;
}

export function setBlockPropField(
  content: StorefrontContent,
  page: StorefrontContentPageSlug,
  blockId: string,
  field: string,
  value: string,
): StorefrontContent {
  const next = cloneStorefrontContent(content);
  const blocks = resolvePageBlocks(next, page).map((block) => ({
    ...block,
    props: { ...block.props },
  }));
  const index = blocks.findIndex((block) => block.id === blockId);
  if (index < 0) return next;

  blocks[index] = {
    ...blocks[index],
    props: {
      ...blocks[index].props,
      [field]: field === "limit" ? Math.max(1, Math.min(12, Number(value) || 4)) : value,
    },
  };

  if (page === "home") {
    next.pages = { ...next.pages, home: { blocks } };
    syncLegacyFieldsFromHomeBlocks(next, blocks);
    return next;
  }

  const pageKey = page as "about" | "contact" | "faq";
  next.pages = {
    ...next.pages,
    about: next.pages?.about ?? {
      title: next.about.title,
      body: next.about.body,
      source: "merchant",
    },
    contact: next.pages?.contact ?? {
      title: "Contact us",
      body: "",
      email: null,
      phone: null,
      source: "merchant",
    },
    faq: next.pages?.faq ?? {
      title: "Frequently asked questions",
      source: "merchant",
      items: [],
    },
    privacy_policy: next.pages?.privacy_policy ?? {
      title: "Privacy policy",
      body: "",
      source: "platform_default",
    },
    home: next.pages?.home,
    [pageKey]: {
      ...(next.pages?.[pageKey] ?? {}),
      blocks,
    },
  };

  if (page === "about") syncLegacyFieldsFromAboutBlocks(next, blocks);
  if (page === "contact") syncLegacyFieldsFromContactBlocks(next, blocks);
  if (page === "faq") syncLegacyFieldsFromFaqBlocks(next, blocks);

  return next;
}

export function reorderPageBlock(
  content: StorefrontContent,
  page: StorefrontContentPageSlug,
  blockId: string,
  direction: "up" | "down",
): StorefrontContent {
  const blocks = resolvePageBlocks(content, page);
  const index = blocks.findIndex((block) => block.id === blockId);
  if (index < 0) return content;

  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= blocks.length) return content;

  const order = blocks.map((block) => block.id);
  [order[index], order[targetIndex]] = [order[targetIndex], order[index]];

  const result = applyPageBlockOperations(content, page, [{ op: "reorder_blocks", page, order }]);
  return result.storefront;
}

export const BLOCK_PROP_FIELDS: Record<
  string,
  { key: string; label: string; multiline?: boolean }[]
> = {
  hero: [
    { key: "headline", label: "Headline" },
    { key: "subheadline", label: "Subheadline", multiline: true },
    { key: "cta_label", label: "Button label" },
    { key: "eyebrow", label: "Eyebrow" },
  ],
  rich_text: [
    { key: "title", label: "Title" },
    { key: "body", label: "Body", multiline: true },
  ],
  feature_grid: [
    { key: "title", label: "Title" },
    { key: "body", label: "Body", multiline: true },
  ],
  cta_banner: [
    { key: "title", label: "Title" },
    { key: "body", label: "Body", multiline: true },
    { key: "cta_label", label: "Button label" },
  ],
  product_grid: [{ key: "title", label: "Section title" }],
  faq: [{ key: "title", label: "Section title" }],
  contact_form: [
    { key: "title", label: "Title" },
    { key: "intro", label: "Intro", multiline: true },
    { key: "submit_label", label: "Submit button" },
  ],
};
