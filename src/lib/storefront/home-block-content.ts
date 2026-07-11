import type { StorefrontContent } from "@/lib/api/types";
import { resolveHomeBlocks } from "@/lib/storefront/blocks/sync-legacy";
import type { StorefrontBlock } from "@/lib/storefront/blocks/types";

/** Read home block props by id — templates should prefer this over hardcoded defaults. */
export function getHomeBlock(
  storefront: StorefrontContent,
  blockId: string,
): StorefrontBlock | undefined {
  return resolveHomeBlocks(storefront).find((block) => block.id === blockId);
}

export function getHomeBlockProps<T extends Record<string, unknown> = Record<string, unknown>>(
  storefront: StorefrontContent,
  blockId: string,
): T {
  return (getHomeBlock(storefront, blockId)?.props ?? {}) as T;
}

export function getHomeBlockByType(
  storefront: StorefrontContent,
  type: StorefrontBlock["type"],
): StorefrontBlock | undefined {
  return resolveHomeBlocks(storefront).find((block) => block.type === type);
}

export function homeBlockPath(blockId: string, propPath: string): string {
  return `pages.home.blocks.${blockId}.props.${propPath}`;
}
