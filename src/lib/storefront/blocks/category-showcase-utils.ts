import type { StoreCategory, StorefrontContent } from "@/lib/api/types";
import {
  categoryShowcaseLayoutForTemplate,
  defaultCategoryShowcaseProps,
} from "@/lib/storefront/blocks/category-showcase-defaults";
import { resolveHomeBlocks } from "@/lib/storefront/blocks/sync-legacy";
import type {
  CategoryShowcaseBlockProps,
  CategoryShowcaseItem,
  StorefrontBlock,
} from "@/lib/storefront/blocks/types";

export function findCategoryShowcaseBlock(storefront: StorefrontContent) {
  return resolveHomeBlocks(storefront).find((block) => block.type === "category_showcase");
}

export function listCategoryShowcaseBlocks(storefront: StorefrontContent): StorefrontBlock[] {
  return resolveHomeBlocks(storefront).filter(
    (block) => block.type === "category_showcase" || block.id === "category-showcase",
  );
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
    cta_label: typeof props.cta_label === "string" ? props.cta_label : undefined,
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

function productCountLabel(category: StoreCategory): string | null {
  if (typeof category.products_count !== "number") return null;
  return `${category.products_count} Product${category.products_count === 1 ? "" : "s"}`;
}

/**
 * Bind showcase tiles to real store categories when available.
 * Preserves existing images/labels when already linked; otherwise maps by name or rebuilds from categories.
 */
export function hydrateShowcaseItemsFromCategories(
  existing: CategoryShowcaseItem[],
  categories: StoreCategory[],
  options?: { limit?: number },
): CategoryShowcaseItem[] {
  const limit = options?.limit ?? 8;
  if (!categories.length) return existing;

  const topLevel = categories.filter((category) => !category.parent_id);
  const source = (topLevel.length ? topLevel : categories).slice(0, limit);

  const linked = existing.filter((item) => item.category_id);
  if (linked.length) {
    return linked.slice(0, limit).map((item) => {
      const match = categories.find((category) => category.id === item.category_id);
      return {
        ...item,
        label: item.label?.trim() || match?.name || item.label,
        category_slug: item.category_slug || match?.slug || null,
        cta_label: item.cta_label || (match ? productCountLabel(match) : null),
      };
    });
  }

  if (existing.length) {
    const byName = new Map(source.map((category) => [category.name.toLowerCase(), category]));
    const bySlug = new Map(source.map((category) => [category.slug.toLowerCase(), category]));
    return existing.slice(0, limit).map((item, index) => {
      const needle = (item.label || item.category_slug || "").toLowerCase();
      const match = byName.get(needle) || bySlug.get(needle) || source[index];
      if (!match) return item;
      return {
        ...item,
        label: match.name,
        category_id: match.id,
        category_slug: match.slug,
        cta_label: item.cta_label || productCountLabel(match),
        image_url: item.image_url ?? null,
      };
    });
  }

  return source.map((category) => ({
    label: category.name,
    category_id: category.id,
    category_slug: category.slug,
    image_url: null,
    cta_label: productCountLabel(category) || "Shop",
  }));
}

/** Persist category hydration onto every home category_showcase block. */
export function hydrateStorefrontCategoryShowcases(
  storefront: StorefrontContent,
  categories: StoreCategory[],
): { storefront: StorefrontContent; changed_paths: string[] } {
  if (!categories.length) {
    return { storefront, changed_paths: [] };
  }

  const next = structuredClone(storefront);
  const blocks = resolveHomeBlocks(next);
  const changedPaths: string[] = [];

  const updated = blocks.map((block) => {
    if (block.type !== "category_showcase" && block.id !== "category-showcase") return block;

    const props = resolveCategoryShowcaseProps(next, block.id);
    const items = hydrateShowcaseItemsFromCategories(props.items, categories, {
      limit: Math.max(props.items.length, 4),
    });

    items.forEach((item, index) => {
      changedPaths.push(`pages.home.blocks.${block.id}.props.items.${index}.label`);
      if (item.category_id) {
        changedPaths.push(`pages.home.blocks.${block.id}.props.items.${index}.category_id`);
      }
      if (item.image_url == null || item.image_url === "") {
        changedPaths.push(`pages.home.blocks.${block.id}.props.items.${index}.image_url`);
      }
    });

    return {
      ...block,
      props: {
        ...(block.props as Record<string, unknown>),
        items,
      },
    };
  });

  next.pages = { ...next.pages, home: { blocks: updated } };
  return { storefront: next, changed_paths: [...new Set(changedPaths)] };
}

export function showcaseItemsMissingImages(items: CategoryShowcaseItem[]): number[] {
  return items
    .map((item, index) => (!item.image_url || !String(item.image_url).trim() ? index : -1))
    .filter((index) => index >= 0);
}
