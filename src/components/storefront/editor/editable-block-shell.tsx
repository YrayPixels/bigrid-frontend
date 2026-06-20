"use client";

import type { ReactNode } from "react";
import type { StorefrontBlock, StorefrontContentPageSlug } from "@/lib/storefront/blocks/types";
import { blockTypeLabel } from "@/lib/storefront/blocks/catalog";
import { useBlockEditor } from "@/components/storefront/editor/block-editor-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

export function EditableBlockShell({
  block,
  page,
  children,
}: {
  block: StorefrontBlock;
  page: StorefrontContentPageSlug;
  children: ReactNode;
}) {
  const { mode } = useStorefrontTheme();
  const editor = useBlockEditor();

  if (mode !== "edit" || !editor) {
    return <>{children}</>;
  }

  const selected =
    editor.selectedBlock?.page === page && editor.selectedBlock.blockId === block.id;

  return (
    <div
      className={`relative transition ${selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
      data-block-id={block.id}
      data-block-type={block.type}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          editor.onSelectBlock(selected ? null : { page, blockId: block.id });
        }}
        className={`absolute left-3 top-3 z-20 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide shadow-sm transition ${
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card/95 text-ink-soft hover:border-primary/40 hover:text-ink"
        }`}
      >
        {blockTypeLabel(block.type)}
      </button>
      {children}
    </div>
  );
}
