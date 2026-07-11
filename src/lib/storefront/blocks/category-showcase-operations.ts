import type { Store, StorefrontContent } from "@/lib/api/types";
import {
  categoryShowcaseLayoutForTemplate,
  defaultCategoryShowcaseProps,
} from "@/lib/storefront/blocks/category-showcase-defaults";
import { resolvePageBlocks } from "@/lib/storefront/blocks/migrate-page-blocks";
import {
  resolveBlockIdFromInstruction,
} from "@/lib/storefront/blocks/page-block-operations";

export function buildCategoryShowcaseContextText(
  instruction = "",
  planIntent?: string,
  message?: string,
  store?: Store | null,
  storefront?: StorefrontContent,
): string {
  return [
    instruction,
    planIntent,
    message,
    store?.business_name ?? "",
    store?.description ?? "",
    storefront?.seo?.title ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildCategoryShowcasePropsForContext(
  storefront: StorefrontContent,
): Record<string, unknown> {
  const templateId = storefront.template?.id ?? "classic";
  const layout = categoryShowcaseLayoutForTemplate(templateId);
  const defaults = defaultCategoryShowcaseProps(layout);
  return {
    title: defaults.title,
    eyebrow: defaults.eyebrow,
    layout: defaults.layout,
    items: defaults.items,
  };
}

/** Prefer AI refine_website_copy / update_block — no keyword-based section routing. */
export function tryApplyCategoryShowcaseInstruction(
  _storefront: StorefrontContent,
  _instruction: string,
  _store?: Store | null,
  _planIntent?: string,
  _message?: string,
): { storefront: StorefrontContent; changed_paths: string[]; assistant_message: string } | null {
  return null;
}

export function resolveCategoryShowcaseBlockId(
  instruction: string,
  planIntent?: string,
  message?: string,
  storefront?: StorefrontContent,
): string {
  const scopedText = buildCategoryShowcaseContextText(instruction, planIntent, message);
  const blocks = storefront ? resolvePageBlocks(storefront, "home") : [];
  return resolveBlockIdFromInstruction(scopedText, "home", blocks) ?? "category-showcase";
}
