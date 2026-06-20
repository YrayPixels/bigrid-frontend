"use client";

import type { ReactNode } from "react";
import type { Store, StorefrontContent } from "@/lib/api/types";
import { CosmeticsPromoTrustRow } from "@/components/storefront/blocks/cosmetics-blocks";
import { getBlockRenderer } from "@/components/storefront/blocks/registry";
import { resolvePageBlocks } from "@/lib/storefront/blocks/migrate-page-blocks";
import type { StorefrontBlock, StorefrontContentPageSlug } from "@/lib/storefront/blocks/types";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

function PageBlockItem({
  block,
  store,
  storefront,
  page,
}: {
  block: StorefrontBlock;
  store: Store;
  storefront: StorefrontContent;
  page: StorefrontContentPageSlug;
}) {
  const { theme } = useStorefrontTheme();
  const Renderer = getBlockRenderer(theme.id, block.type);

  if (!Renderer) return null;

  return <Renderer block={block} store={store} storefront={storefront} page={page} />;
}

function renderPageBlocks(
  page: StorefrontContentPageSlug,
  blocks: StorefrontBlock[],
  store: Store,
  storefront: StorefrontContent,
  pairPromoWithTrust: boolean,
) {
  const nodes: ReactNode[] = [];
  let index = 0;

  while (index < blocks.length) {
    const block = blocks[index];
    const next = blocks[index + 1];

    if (pairPromoWithTrust && block.type === "cta_banner" && next?.type === "feature_grid") {
      nodes.push(
        <CosmeticsPromoTrustRow key={`${block.id}-${next.id}`} ctaBlock={block} featureBlock={next} page={page} />,
      );
      index += 2;
      continue;
    }

    nodes.push(
      <PageBlockItem key={block.id} block={block} store={store} storefront={storefront} page={page} />,
    );
    index += 1;
  }

  return nodes;
}

export function PageRenderer({
  page,
  store,
  storefront,
}: {
  page: StorefrontContentPageSlug;
  store: Store;
  storefront: StorefrontContent;
}) {
  const { theme } = useStorefrontTheme();
  const blocks = resolvePageBlocks(storefront, page);

  return (
    <div style={{ backgroundColor: theme.palette.background, color: theme.palette.text }}>
      {renderPageBlocks(
        page,
        blocks,
        store,
        storefront,
        page === "home" && theme.id === "cosmetics",
      )}
    </div>
  );
}

/** @deprecated Use PageRenderer with page="home" */
export function HomePageRenderer({
  store,
  storefront,
}: {
  store: Store;
  storefront: StorefrontContent;
}) {
  return <PageRenderer page="home" store={store} storefront={storefront} />;
}
