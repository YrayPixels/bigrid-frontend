"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SelectedBlockRef } from "@/lib/storefront/blocks/block-draft";
import type { StorefrontContentPageSlug } from "@/lib/storefront/blocks/types";

type BlockEditorContextValue = {
  selectedBlock: SelectedBlockRef | null;
  onSelectBlock: (selection: SelectedBlockRef | null) => void;
  onReorderBlock: (page: StorefrontContentPageSlug, blockId: string, direction: "up" | "down") => void;
};

const BlockEditorContext = createContext<BlockEditorContextValue | null>(null);

export function BlockEditorProvider({
  value,
  children,
}: {
  value: BlockEditorContextValue;
  children: ReactNode;
}) {
  return <BlockEditorContext.Provider value={value}>{children}</BlockEditorContext.Provider>;
}

export function useBlockEditor() {
  return useContext(BlockEditorContext);
}
