"use client";

import { useMemo, useState } from "react";
import { useCategories } from "@/hooks/use-merchant-queries";
import type {
  Store,
  StorefrontColorPalette,
  StorefrontContent,
  StorefrontTemplateId,
} from "@/lib/api/types";
import { StoreShell } from "@/components/storefront/store-shell";
import { HomePageView } from "@/components/storefront/pages/home-page";
import { PageRenderer } from "@/components/storefront/blocks/page-renderer";
import { ProductsPageView } from "@/components/storefront/pages/products-page-view";
import { CartPageView } from "@/components/storefront/pages/cart-page-view";
import { CheckoutPageView } from "@/components/storefront/pages/checkout-page-view";
import { BlockEditorProvider } from "@/components/storefront/editor/block-editor-context";
import { api } from "@/lib/api/client";
import { CartProvider } from "@/lib/storefront/cart-context";
import { StorefrontProvider } from "@/lib/storefront/store-context";
import { StorefrontThemeProvider } from "@/lib/storefront/theme-context";
import {
  reorderPageBlock,
  type SelectedBlockRef,
} from "@/lib/storefront/blocks/block-draft";
import type { StorefrontContentPageSlug } from "@/lib/storefront/blocks/types";
import { ensureHomeBlocksOnStorefront } from "@/lib/storefront/blocks/sync-legacy";
import { applyTemplateToDraft, cloneStorefrontContent, normalizeStorefrontContent, setDraftField } from "@/lib/storefront/draft";
import { setEditableStorefrontPath } from "@/lib/storefront-builder/editable-paths";
import { getStorefrontTheme } from "@/lib/storefront/template";
import { getStorefrontUrl } from "@/lib/store-host";

export type EditorPage = "home" | "products" | "about" | "contact" | "faq" | "cart" | "checkout";

type StorefrontEditorCanvasProps = {
  store: Store;
  draft: StorefrontContent;
  brandColor: string;
  palette?: StorefrontColorPalette;
  templateId: StorefrontTemplateId;
  activePage: EditorPage;
  onDraftChange: (draft: StorefrontContent) => void;
  readOnly?: boolean;
  selectedBlock?: SelectedBlockRef | null;
  onSelectBlock?: (selection: SelectedBlockRef | null) => void;
};

export function StorefrontEditorCanvas({
  store,
  draft,
  brandColor,
  palette,
  templateId,
  activePage,
  onDraftChange,
  readOnly = false,
  selectedBlock = null,
  onSelectBlock,
}: StorefrontEditorCanvasProps) {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const previewStore = useMemo(
    () => ({
      ...store,
      brand_color: brandColor,
      storefront_template_id: templateId,
    }),
    [store, brandColor, templateId],
  );

  const categoriesQuery = useCategories(store.id);

  const previewData = useMemo(
    () => ({
      store: previewStore,
      storefront: normalizeStorefrontContent(
        applyTemplateToDraft(draft, templateId, palette),
        previewStore,
      ),
      categories: categoriesQuery.data ?? [],
      generation_id: null,
    }),
    [previewStore, draft, templateId, palette, categoriesQuery.data],
  );

  const theme = getStorefrontTheme(
    templateId,
    brandColor,
    palette,
    draft?.display_font,
    draft?.theme_overrides,
  );

  function handleFieldChange(path: string, value: string) {
    const next = cloneStorefrontContent(draft);
    ensureHomeBlocksOnStorefront(next);
    if (setEditableStorefrontPath(next, path, value)) {
      onDraftChange(next);
    }
  }

  async function handleImageUpload(path: string, file: File) {
    const { url } = await api.uploadStorefrontImage(store.id, file);
    const next = cloneStorefrontContent(draft);
    ensureHomeBlocksOnStorefront(next);

    if (path === "media.hero_video_url") {
      next.media = { ...next.media, hero_video_url: url };
      onDraftChange(next);
      return;
    }

    if (/^products\.\d+\.image_url$/.test(path)) {
      onDraftChange(setDraftField(next, path, url));
      return;
    }

    if (setEditableStorefrontPath(next, path, url)) {
      onDraftChange(next);
    }
  }

  function renderPage() {
    switch (activePage) {
      case "products":
        return <ProductsPageView />;
      case "cart":
        return <CartPageView />;
      case "checkout":
        return <CheckoutPageView />;
      case "about":
        return <PageRenderer page="about" store={store} storefront={previewData.storefront} />;
      case "contact":
        return <PageRenderer page="contact" store={store} storefront={previewData.storefront} />;
      case "faq":
        return <PageRenderer page="faq" store={store} storefront={previewData.storefront} />;
      default:
        return <HomePageView />;
    }
  }

  function handleBlockReorder(
    page: StorefrontContentPageSlug,
    blockId: string,
    direction: "up" | "down",
  ) {
    onDraftChange(reorderPageBlock(draft, page, blockId, direction));
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-canvas shadow-elevated">
      <div className="flex items-center gap-2 border-b border-border bg-secondary px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
        <span className="ml-3 truncate rounded bg-card px-3 py-1 text-xs text-ink-soft">
          {getStorefrontUrl(store.slug)}
        </span>
        {!readOnly ? (
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-primary">
            Click section labels or text to edit
          </span>
        ) : null}
      </div>
      <div className="max-h-[72vh] overflow-y-auto">
        <StorefrontProvider value={previewData}>
          <StorefrontThemeProvider
            theme={theme}
            mode={readOnly ? "preview" : "edit"}
            shellChrome={activePage === "home" ? "content-only" : "full"}
            editable={
              readOnly
                ? undefined
                : {
                    onFieldChange: handleFieldChange,
                    onImageUpload: handleImageUpload,
                    selectedPath,
                    onSelectPath: setSelectedPath,
                  }
            }
          >
            <BlockEditorProvider
              value={{
                selectedBlock: readOnly ? null : selectedBlock,
                onSelectBlock: readOnly ? () => {} : (onSelectBlock ?? (() => {})),
                onReorderBlock: readOnly
                  ? () => {}
                  : (page, blockId, direction) => handleBlockReorder(page, blockId, direction),
              }}
            >
              <CartProvider storeId={store.id}>
                <StoreShell>{renderPage()}</StoreShell>
              </CartProvider>
            </BlockEditorProvider>
          </StorefrontThemeProvider>
        </StorefrontProvider>
      </div>
    </div>
  );
}
