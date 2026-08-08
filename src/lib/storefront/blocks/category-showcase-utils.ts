import type { StoreCategory, StorefrontContent, StoreProduct } from "@/lib/api/types";
import {
  categoryShowcaseLayoutForTemplate,
  defaultCategoryShowcaseProps,
} from "@/lib/storefront/blocks/category-showcase-defaults";
import { beautyTemplateImages } from "@/lib/storefront/beauty-defaults";
import { fashionCategories } from "@/lib/storefront/fashion-defaults";
import { productMatchesCategoryFilter } from "@/lib/storefront/category-filters";
import { resolveHomeBlocks } from "@/lib/storefront/blocks/sync-legacy";
import type {
  CategoryShowcaseBlockProps,
  CategoryShowcaseItem,
  StorefrontBlock,
} from "@/lib/storefront/blocks/types";

function unsplashPhotoKey(url: string): string | null {
  const match = url.match(/unsplash\.com\/(?:photo-)?([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

/** Template/default tile photos that should be replaced when real categories are linked. */
export function isStockCategoryShowcaseImage(url: string | null | undefined): boolean {
  if (!url?.trim()) return true;
  const stockUrls = [
    ...fashionCategories.map((category) => category.image),
    ...beautyTemplateImages.styles,
  ];
  const key = unsplashPhotoKey(url);
  return stockUrls.some((stock) => {
    if (url === stock || url.startsWith(stock.split("?")[0]!)) return true;
    if (!key) return false;
    return unsplashPhotoKey(stock) === key;
  });
}

/** Prefer a product photo from the category (cover image or first gallery shot). */
export function pickProductImageForCategory(
  products: StoreProduct[] | undefined,
  categoryId: string | null | undefined,
  categories: StoreCategory[] = [],
): string | null {
  if (!products?.length || !categoryId) return null;

  const match = products.find((product) => {
    if (!productMatchesCategoryFilter(product, categoryId, categories)) return false;
    return Boolean(product.image_url?.trim() || product.images?.some((image) => image?.trim()));
  });

  if (!match) return null;
  return match.image_url?.trim() || match.images?.find((image) => image?.trim())?.trim() || null;
}

/**
 * Resolve a showcase tile image.
 * Order: product in category → merchant/custom tile image → stock/template (optional).
 */
export function resolveCategoryShowcaseItemImage(
  item: CategoryShowcaseItem,
  options?: {
    products?: StoreProduct[];
    categories?: StoreCategory[];
    preferProductImages?: boolean;
    allowStockFallback?: boolean;
  },
): string | null {
  const preferProduct = options?.preferProductImages !== false;
  if (preferProduct) {
    const fromProduct = pickProductImageForCategory(
      options?.products,
      item.category_id,
      options?.categories ?? [],
    );
    if (fromProduct) return fromProduct;
  }

  const tile = item.image_url?.trim() || null;
  if (!tile) return null;
  if (isStockCategoryShowcaseImage(tile) && !options?.allowStockFallback) {
    return null;
  }
  return tile;
}

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
  if (item.category_slug) return `/products?category=${encodeURIComponent(item.category_slug)}`;
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

function resolveHydratedImage(
  item: CategoryShowcaseItem,
  categoryId: string | null | undefined,
  options?: {
    products?: StoreProduct[];
    categories?: StoreCategory[];
    replaceStockImages?: boolean;
  },
): string | null {
  const fromProduct = pickProductImageForCategory(
    options?.products,
    categoryId,
    options?.categories ?? [],
  );
  if (fromProduct) return fromProduct;

  const current = item.image_url?.trim() || null;
  if (!current) return null;
  if (options?.replaceStockImages && isStockCategoryShowcaseImage(current)) {
    return null;
  }
  return current;
}

/**
 * Bind showcase tiles to real store categories when available.
 * Prefers a product photo from the category; clears Fashion/Beauty stock images when replacing.
 */
export function hydrateShowcaseItemsFromCategories(
  existing: CategoryShowcaseItem[],
  categories: StoreCategory[],
  options?: {
    limit?: number;
    products?: StoreProduct[];
    replaceStockImages?: boolean;
  },
): CategoryShowcaseItem[] {
  const limit = options?.limit ?? 8;
  if (!categories.length) return existing;

  const topLevel = categories.filter((category) => !category.parent_id);
  const source = (topLevel.length ? topLevel : categories).slice(0, limit);
  const hydrateOpts = {
    products: options?.products,
    categories,
    replaceStockImages: options?.replaceStockImages ?? true,
  };

  const linked = existing.filter((item) => item.category_id);
  if (linked.length) {
    return linked.slice(0, limit).map((item) => {
      const match = categories.find((category) => category.id === item.category_id);
      return {
        ...item,
        label: item.label?.trim() || match?.name || item.label,
        category_slug: item.category_slug || match?.slug || null,
        cta_label: item.cta_label || (match ? productCountLabel(match) : null),
        image_url: resolveHydratedImage(item, item.category_id, hydrateOpts),
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
        image_url: resolveHydratedImage(item, match.id, hydrateOpts),
      };
    });
  }

  return source.map((category) => ({
    label: category.name,
    category_id: category.id,
    category_slug: category.slug,
    image_url: pickProductImageForCategory(options?.products, category.id, categories),
    cta_label: productCountLabel(category) || "Shop",
  }));
}

/** Persist category hydration onto every home category_showcase block. */
export function hydrateStorefrontCategoryShowcases(
  storefront: StorefrontContent,
  categories: StoreCategory[],
  options?: { products?: StoreProduct[]; replaceStockImages?: boolean },
): { storefront: StorefrontContent; changed_paths: string[] } {
  if (!categories.length) {
    return { storefront, changed_paths: [] };
  }

  const next = structuredClone(storefront);
  const blocks = resolveHomeBlocks(next);
  const changedPaths: string[] = [];
  const products = options?.products ?? next.products ?? [];

  const updated = blocks.map((block) => {
    if (block.type !== "category_showcase" && block.id !== "category-showcase") return block;

    const props = resolveCategoryShowcaseProps(next, block.id);
    const items = hydrateShowcaseItemsFromCategories(props.items, categories, {
      limit: Math.max(props.items.length, 4),
      products,
      replaceStockImages: options?.replaceStockImages ?? true,
    });

    items.forEach((item, index) => {
      changedPaths.push(`pages.home.blocks.${block.id}.props.items.${index}.label`);
      if (item.category_id) {
        changedPaths.push(`pages.home.blocks.${block.id}.props.items.${index}.category_id`);
      }
      changedPaths.push(`pages.home.blocks.${block.id}.props.items.${index}.image_url`);
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

export function showcaseItemsMissingImages(
  items: CategoryShowcaseItem[],
  options?: { treatStockAsMissing?: boolean },
): number[] {
  const treatStockAsMissing = options?.treatStockAsMissing ?? false;
  return items
    .map((item, index) => {
      const url = item.image_url?.trim() || "";
      if (!url) return index;
      if (treatStockAsMissing && isStockCategoryShowcaseImage(url)) return index;
      return -1;
    })
    .filter((index) => index >= 0);
}
