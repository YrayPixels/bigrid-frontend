"use client";

import { useMemo, useState } from "react";
import type { Store, StorefrontContent, StorefrontTemplateId } from "@/lib/api/types";
import { HomePageView } from "@/components/storefront/pages/home-page";
import { ProductsPageView } from "@/components/storefront/pages/products-page-view";
import { PageRenderer } from "@/components/storefront/blocks/page-renderer";
import { CartProvider } from "@/lib/storefront/cart-context";
import { StorefrontProvider } from "@/lib/storefront/store-context";
import { StorefrontThemeProvider } from "@/lib/storefront/theme-context";
import { applyTemplateToDraft, normalizeStorefrontContent } from "@/lib/storefront/draft";
import { resolveStorefrontTemplate, getStorefrontTheme } from "@/lib/storefront/template";
import { getStorefrontUrl } from "@/lib/store-host";
import { StoreShell } from "@/components/storefront/store-shell";
import { cn } from "@/lib/utils";

type GuestPage = "home" | "products" | "about" | "faq";

const PAGES: Array<{ id: GuestPage; label: string }> = [
  { id: "home", label: "Home" },
  { id: "products", label: "Products" },
  { id: "about", label: "About" },
  { id: "faq", label: "FAQ" },
];

export function GuestStorefrontBrowser({
  store,
  storefront,
}: {
  store: Store;
  storefront: StorefrontContent;
}) {
  const [activePage, setActivePage] = useState<GuestPage>("home");
  const templateId: StorefrontTemplateId = resolveStorefrontTemplate(store, storefront);
  const brandColor = storefront.palette?.primary ?? store.brand_color;
  const palette = storefront.palette;

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
      storefront: normalizeStorefrontContent(
        applyTemplateToDraft(storefront, templateId, palette),
        previewStore,
      ),
      categories: [],
      generation_id: null,
      discounts: [],
      checkout: {
        payments_enabled: false,
        paystack_public_key: null,
      },
    }),
    [previewStore, storefront, templateId, palette],
  );

  const theme = getStorefrontTheme(
    templateId,
    brandColor,
    palette,
    storefront.display_font,
    storefront.theme_overrides,
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-canvas shadow-elevated">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary px-3 py-2 sm:px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-accent/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
        <span className="ml-1 min-w-0 flex-1 truncate rounded bg-card px-2.5 py-1 text-[11px] text-ink-soft sm:ml-2 sm:text-xs">
          {getStorefrontUrl(store.slug)}
        </span>
        <div className="flex w-full gap-1 overflow-x-auto pt-1 sm:w-auto sm:pt-0">
          {PAGES.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => setActivePage(page.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                activePage === page.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-ink-soft hover:text-ink",
              )}
            >
              {page.label}
            </button>
          ))}
        </div>
      </div>
      <div className="max-h-[min(78vh,900px)] overflow-y-auto">
        <StorefrontProvider value={previewData}>
          <StorefrontThemeProvider theme={theme} mode="edit" shellChrome="content-only">
            <CartProvider storeId={previewStore.id}>
              <StoreShell>
                {activePage === "home" ? <HomePageView /> : null}
                {activePage === "products" ? <ProductsPageView /> : null}
                {activePage === "about" ? (
                  <PageRenderer page="about" store={previewStore} storefront={previewData.storefront} />
                ) : null}
                {activePage === "faq" ? (
                  <PageRenderer page="faq" store={previewStore} storefront={previewData.storefront} />
                ) : null}
              </StoreShell>
            </CartProvider>
          </StorefrontThemeProvider>
        </StorefrontProvider>
      </div>
    </div>
  );
}
