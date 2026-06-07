"use client";

import { useMemo, useState } from "react";
import type {
  Store,
  StorefrontColorPalette,
  StorefrontContent,
  StorefrontTemplateId,
} from "@/lib/api/types";
import { StoreShell } from "@/components/storefront/store-shell";
import { HomePageView } from "@/components/storefront/pages/home-page";
import { ProductsPageView } from "@/components/storefront/pages/products-page-view";
import { ContentPageView } from "@/components/storefront/pages/content-page-view";
import { FaqPageView } from "@/components/storefront/pages/faq-page-view";
import { api } from "@/lib/api/client";
import { CartProvider } from "@/lib/storefront/cart-context";
import { StorefrontProvider } from "@/lib/storefront/store-context";
import { StorefrontThemeProvider } from "@/lib/storefront/theme-context";
import { applyTemplateToDraft, setDraftField } from "@/lib/storefront/draft";
import { getStorefrontTheme } from "@/lib/storefront/template";
import { getStoreSubdomainHost } from "@/lib/store-host";

export type EditorPage = "home" | "products" | "about" | "contact" | "faq";

type StorefrontEditorCanvasProps = {
  store: Store;
  draft: StorefrontContent;
  brandColor: string;
  palette?: StorefrontColorPalette;
  templateId: StorefrontTemplateId;
  activePage: EditorPage;
  onDraftChange: (draft: StorefrontContent) => void;
  readOnly?: boolean;
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

  const previewData = useMemo(
    () => ({
      store: previewStore,
      storefront: applyTemplateToDraft(draft, templateId, palette),
      generation_id: null,
    }),
    [previewStore, draft, templateId, palette],
  );

  const theme = getStorefrontTheme(templateId, brandColor, palette);

  function handleFieldChange(path: string, value: string) {
    onDraftChange(setDraftField(draft, path, value));
  }

  async function handleImageUpload(path: string, file: File) {
    const { url } = await api.uploadStorefrontImage(store.id, file);
    onDraftChange(setDraftField(draft, path, url));
  }

  function renderPage() {
    switch (activePage) {
      case "products":
        return <ProductsPageView />;
      case "about":
        return (
          <ContentPageView
            title={draft.pages?.about?.title ?? draft.about.title}
            body={draft.pages?.about?.body ?? draft.about.body}
            titlePath="about.title"
            bodyPath="about.body"
          />
        );
      case "contact": {
        const contact = draft.pages?.contact;
        const details = [
          contact?.email ? `Email: ${contact.email}` : null,
          contact?.phone ? `Phone: ${contact.phone}` : null,
        ]
          .filter(Boolean)
          .join("\n");
        return (
          <ContentPageView
            title={contact?.title ?? "Contact us"}
            body={[contact?.body ?? "", details].filter(Boolean).join("\n\n")}
            titlePath="pages.contact.title"
            bodyPath="pages.contact.body"
          />
        );
      }
      case "faq":
        return (
          <FaqPageView
            title={draft.pages?.faq?.title ?? "Frequently asked questions"}
            items={draft.pages?.faq?.items ?? []}
          />
        );
      default:
        return <HomePageView />;
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-canvas shadow-elevated">
      <div className="flex items-center gap-2 border-b border-border bg-secondary px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
        <span className="ml-3 truncate rounded bg-card px-3 py-1 text-xs text-ink-soft">
          {store.subdomain_host ?? getStoreSubdomainHost(store.slug)}
        </span>
        {!readOnly ? (
          <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-primary">
            Click text, double-click images
          </span>
        ) : null}
      </div>
      <div className="max-h-[72vh] overflow-y-auto">
        <StorefrontProvider value={previewData}>
          <StorefrontThemeProvider
            theme={theme}
            mode={readOnly ? "preview" : "edit"}
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
            <CartProvider storeId={store.id}>
              <StoreShell>{renderPage()}</StoreShell>
            </CartProvider>
          </StorefrontThemeProvider>
        </StorefrontProvider>
      </div>
    </div>
  );
}
