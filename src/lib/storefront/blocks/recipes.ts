import type { StorefrontContent, StorefrontTemplateId } from "@/lib/api/types";
import {
  buildCosmeticsHomeBlocks,
  buildDefaultHomeBlocks,
} from "@/lib/storefront/blocks/migrate-home";
import type { StorefrontBlock } from "@/lib/storefront/blocks/types";

/**
 * Default homepage block trees per template.
 * Templates differ by block recipes + theme tokens — not separate page components.
 */
export const HOME_BLOCK_RECIPES: Partial<
  Record<StorefrontTemplateId, (storefront: StorefrontContent) => StorefrontBlock[]>
> = {
  cosmetics: buildCosmeticsHomeBlocks,
  classic: (storefront) => buildDefaultHomeBlocks(storefront, "classic"),
  editorial: (storefront) => buildDefaultHomeBlocks(storefront, "editorial"),
  bold_grid: (storefront) => buildDefaultHomeBlocks(storefront, "bold_grid"),
  beauty: (storefront) => buildDefaultHomeBlocks(storefront, "beauty"),
  fashion_lookbook: (storefront) => buildDefaultHomeBlocks(storefront, "fashion_lookbook"),
  minimalistic: (storefront) => buildDefaultHomeBlocks(storefront, "minimalistic"),
};

export function buildHomeBlocksForTemplate(
  storefront: StorefrontContent,
  templateId: StorefrontTemplateId = storefront.template?.id ?? "classic",
): StorefrontBlock[] {
  const recipe = HOME_BLOCK_RECIPES[templateId];
  if (recipe) return recipe(storefront);

  return buildDefaultHomeBlocks(storefront, templateId);
}
