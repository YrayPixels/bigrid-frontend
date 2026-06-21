import type { StoreCategory, StorefrontContent } from "@/lib/api/types";
import {
  categoryShowcaseLayoutForTemplate,
  defaultCategoryShowcaseProps,
} from "@/lib/storefront/blocks/category-showcase-defaults";
import { resolveHomeBlocks } from "@/lib/storefront/blocks/sync-legacy";
import type { CategoryShowcaseBlockProps, CategoryShowcaseItem } from "@/lib/storefront/blocks/types";

export function findCategoryShowcaseBlock(storefront: StorefrontContent) {
  return resolveHomeBlocks(storefront).find((block) => block.type === "category_showcase");
}

export function resolveCategoryShowcaseProps(
  storefront: StorefrontContent,
  blockId = "category-showcase",
): CategoryShowcaseBlockProps {
  const block = resolveHomeBlocks(storefront).find((item) => item.id === blockId);
  const templateId = storefront.template?.id ?? "classic";
  const defaults = defaultCategoryShowcaseProps(categoryShowcaseLayoutForTemplate(templateId));
  const props = block?.props ?? {};

  const rawItems = Array.isArray(props.items) ? (props.items as CategoryShowcaseItem[]) : defaults.items;

  return {
    title: typeof props.title === "string" && props.title ? props.title : defaults.title,
    eyebrow: typeof props.eyebrow === "string" ? props.eyebrow : defaults.eyebrow,
    layout:
      props.layout === "editorial_grid" || props.layout === "style_tiles" || props.layout === "compact_grid"
        ? props.layout
        : defaults.layout,
    items: rawItems.length ? rawItems : defaults.items,
  };
}

export function categoryShowcaseItemHref(item: CategoryShowcaseItem): string {
  if (item.href) return item.href;
  if (item.category_id) return `/products?category_id=${encodeURIComponent(item.category_id)}`;
  if (item.category_slug) return `/products?category_id=${encodeURIComponent(item.category_slug)}`;
  return "/products";
}

export function resolveCategoryShowcaseItemLabel(
  item: CategoryShowcaseItem,
  categories: StoreCategory[] | undefined,
): string {
  if (item.label?.trim()) return item.label.trim();

  if (item.category_id && categories?.length) {
    const match = categories.find((category) => category.id === item.category_id);
    if (match?.name) return match.name;
  }

  return item.label;
}
