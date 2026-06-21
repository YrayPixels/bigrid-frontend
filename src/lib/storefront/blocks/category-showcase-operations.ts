import type { Store, StorefrontContent } from "@/lib/api/types";
import { isCategoryShowcaseInstruction } from "@/lib/storefront-builder/section-scope";
import {
  categoryShowcaseLayoutForTemplate,
  defaultCategoryShowcaseProps,
} from "@/lib/storefront/blocks/category-showcase-defaults";
import { resolvePageBlocks } from "@/lib/storefront/blocks/migrate-page-blocks";
import {
  applyPageBlockOperations,
  resolveBlockIdFromInstruction,
  resolvePageFromInstruction,
} from "@/lib/storefront/blocks/page-block-operations";

function mentionsJewelry(text: string): boolean {
  return /\b(jewelry|jewellery|ring|necklace|bracelet|earring|gem|gold|silver|luxury)\b/i.test(text);
}

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
  store?: Store | null,
  instruction = "",
  planIntent?: string,
  message?: string,
): Record<string, unknown> {
  const templateId = storefront.template?.id ?? "classic";
  const layout = categoryShowcaseLayoutForTemplate(templateId);
  const defaults = defaultCategoryShowcaseProps(layout);
  const context = buildCategoryShowcaseContextText(instruction, planIntent, message, store, storefront);

  if (mentionsJewelry(context)) {
    return {
      ...defaults,
      title: "Shop the Collection",
      eyebrow: "Timeless. Elegant. Yours.",
      items: [
        { label: "Rings", image_url: defaults.items[0]?.image_url ?? null },
        { label: "Necklaces", image_url: defaults.items[1]?.image_url ?? null },
        { label: "Bracelets", image_url: defaults.items[2]?.image_url ?? null },
        {
          label: "Earrings",
          image_url: defaults.items[3]?.image_url ?? defaults.items[0]?.image_url ?? null,
        },
      ],
    };
  }

  return defaults;
}

export function shouldApplyCategoryShowcaseCopy(
  instruction: string,
  planIntent?: string,
  message?: string,
): boolean {
  const combined = [instruction, planIntent, message].filter(Boolean).join(" ");
  const planScoped = !!planIntent && isCategoryShowcaseInstruction(planIntent);
  const instructionScoped = isCategoryShowcaseInstruction(combined);
  if (!planScoped && !instructionScoped) return false;

  return /\b(copy|title|label|heading|eyebrow|text|rewrite|refined|refine|update|change|emphasize|theme|jewelry|jewellery|elegance|beauty|luxury|collection)\b/i.test(
    combined,
  );
}

export function tryApplyCategoryShowcaseInstruction(
  storefront: StorefrontContent,
  instruction: string,
  store?: Store | null,
  planIntent?: string,
  message?: string,
): { storefront: StorefrontContent; changed_paths: string[]; assistant_message: string } | null {
  if (!shouldApplyCategoryShowcaseCopy(instruction, planIntent, message)) return null;

  const scopedText = buildCategoryShowcaseContextText(instruction, planIntent, message, store, storefront);
  const page = resolvePageFromInstruction(scopedText);
  if (page !== "home") return null;

  const blocks = resolvePageBlocks(storefront, page);
  const blockId = resolveBlockIdFromInstruction(scopedText, page, blocks) ?? "category-showcase";
  const props = buildCategoryShowcasePropsForContext(storefront, store, instruction, planIntent, message);
  const result = applyPageBlockOperations(
    storefront,
    page,
    [{ op: "update_block", page, block_id: blockId, props }],
    store,
  );

  if (!result.changed_block_ids.length) return null;

  return {
    storefront: result.storefront,
    changed_paths: result.changed_block_ids.map((id) => `pages.${page}.blocks.${id}`),
    assistant_message: "Done — I updated your Essentials section with refined copy. Check the preview on the right.",
  };
}

export function resolveCategoryShowcaseBlockId(
  storefront: StorefrontContent,
  instruction: string,
  planIntent?: string,
  message?: string,
): string {
  const scopedText = buildCategoryShowcaseContextText(instruction, planIntent, message);
  const blocks = resolvePageBlocks(storefront, "home");
  return resolveBlockIdFromInstruction(scopedText, "home", blocks) ?? "category-showcase";
}
