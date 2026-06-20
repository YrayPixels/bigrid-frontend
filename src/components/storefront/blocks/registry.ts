import type { ComponentType } from "react";
import type { Store, StorefrontContent } from "@/lib/api/types";
import type { StorefrontBlock, StorefrontBlockType, StorefrontContentPageSlug } from "@/lib/storefront/blocks/types";
import {
  CosmeticsContactFormBlock,
  CosmeticsFaqBlockRenderer,
  CosmeticsHeroBlock,
  CosmeticsProductGridBlock,
  CosmeticsRichTextBlock,
  CosmeticsStandaloneCtaBannerBlock,
  CosmeticsStandaloneFeatureGridBlock,
  CosmeticsStatsRowBlock,
} from "@/components/storefront/blocks/cosmetics-blocks";

export type BlockRendererProps = {
  block: StorefrontBlock;
  store: Store;
  storefront: StorefrontContent;
  page?: StorefrontContentPageSlug;
};

export type BlockRenderer = ComponentType<BlockRendererProps>;

const cosmeticsRegistry: Partial<Record<StorefrontBlockType, BlockRenderer>> = {
  hero: CosmeticsHeroBlock,
  stats_row: CosmeticsStatsRowBlock,
  rich_text: CosmeticsRichTextBlock,
  cta_banner: CosmeticsStandaloneCtaBannerBlock,
  feature_grid: CosmeticsStandaloneFeatureGridBlock,
  product_grid: CosmeticsProductGridBlock,
  faq: CosmeticsFaqBlockRenderer,
  contact_form: CosmeticsContactFormBlock,
};

export function getBlockRenderer(
  templateId: string,
  blockType: StorefrontBlockType,
): BlockRenderer | null {
  if (templateId === "cosmetics") {
    return cosmeticsRegistry[blockType] ?? null;
  }

  // About, contact, and FAQ block pages use the cosmetics block set for now.
  return cosmeticsRegistry[blockType] ?? null;
}
