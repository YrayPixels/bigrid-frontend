"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
import type { StorefrontContent } from "@/lib/api/types";
import {
  BLOCK_PROP_FIELDS,
  blockSectionLabel,
  findPageBlock,
  type SelectedBlockRef,
} from "@/lib/storefront/blocks/block-draft";
import { resolvePageBlocks } from "@/lib/storefront/blocks/migrate-page-blocks";
import type { HeroBlockProps, StorefrontContentPageSlug } from "@/lib/storefront/blocks/types";

type BlockEditorPanelProps = {
  draft: StorefrontContent;
  activePage: StorefrontContentPageSlug | "products" | "cart" | "checkout";
  selectedBlock: SelectedBlockRef | null;
  onClose: () => void;
  onUpdateProp: (page: StorefrontContentPageSlug, blockId: string, field: string, value: string) => void;
  onReorder: (page: StorefrontContentPageSlug, blockId: string, direction: "up" | "down") => void;
};

export function BlockEditorPanel({
  draft,
  activePage,
  selectedBlock,
  onClose,
  onUpdateProp,
  onReorder,
}: BlockEditorPanelProps) {
  if (!selectedBlock || activePage === "products" || activePage === "cart" || activePage === "checkout") {
    return null;
  }

  const page = selectedBlock.page;
  const block = findPageBlock(draft, page, selectedBlock.blockId);
  if (!block) return null;

  const blocks = resolvePageBlocks(draft, page);
  const blockIndex = blocks.findIndex((item) => item.id === block.id);
  const fields = BLOCK_PROP_FIELDS[block.type] ?? [];
  const heroLayout = block.type === "hero" ? ((block.props as HeroBlockProps).layout ?? "split") : null;

  return (
    <div className="overflow-hidden rounded-xl border border-primary/30 bg-background/60">
      <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-primary">Section</div>
          <div className="text-sm font-semibold">{blockSectionLabel(page, block)}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-8 w-8 place-items-center rounded-md border border-border hover:bg-secondary"
          aria-label="Close section editor"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 px-3 py-3">
        <div className="flex gap-2">
          <button
            type="button"
            disabled={blockIndex <= 0}
            onClick={() => onReorder(page, block.id, "up")}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-border px-2 py-2 text-xs font-semibold disabled:opacity-40"
          >
            <ArrowUp className="h-3.5 w-3.5" />
            Move up
          </button>
          <button
            type="button"
            disabled={blockIndex < 0 || blockIndex >= blocks.length - 1}
            onClick={() => onReorder(page, block.id, "down")}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-border px-2 py-2 text-xs font-semibold disabled:opacity-40"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            Move down
          </button>
        </div>

        {block.type === "hero" ? (
          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink-soft">Layout</span>
            <select
              value={heroLayout ?? "split"}
              onChange={(event) =>
                onUpdateProp(page, block.id, "layout", event.target.value)
              }
              className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
            >
              <option value="split">Split</option>
              <option value="centered">Centered</option>
              <option value="image_right">Image right</option>
            </select>
          </label>
        ) : null}

        {block.type === "product_grid" ? (
          <label className="block space-y-1">
            <span className="text-xs font-medium text-ink-soft">Products shown</span>
            <input
              type="number"
              min={1}
              max={12}
              value={String((block.props.limit as number | undefined) ?? 4)}
              onChange={(event) => onUpdateProp(page, block.id, "limit", event.target.value)}
              className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
            />
          </label>
        ) : null}

        {fields.map((field) => (
          <label key={field.key} className="block space-y-1">
            <span className="text-xs font-medium text-ink-soft">{field.label}</span>
            {field.multiline ? (
              <textarea
                value={String(block.props[field.key] ?? "")}
                onChange={(event) => onUpdateProp(page, block.id, field.key, event.target.value)}
                rows={3}
                className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
              />
            ) : (
              <input
                value={String(block.props[field.key] ?? "")}
                onChange={(event) => onUpdateProp(page, block.id, field.key, event.target.value)}
                className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
              />
            )}
          </label>
        ))}

        {fields.length === 0 && block.type !== "product_grid" ? (
          <p className="text-xs leading-5 text-ink-soft">
            Click text in the preview to edit this section, or use the AI builder for deeper changes.
          </p>
        ) : null}
      </div>
    </div>
  );
}
