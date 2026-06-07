"use client";

import type { Store, StorefrontContent } from "@/lib/api/types";
import { StorefrontEditorCanvas } from "@/components/storefront/editor/storefront-editor-canvas";
import { resolveStorefrontTemplate } from "@/lib/storefront/template";

type StorefrontPreviewProps = {
  store: Store;
  content: StorefrontContent;
  domainLabel?: string;
};

export function StorefrontPreview({ store, content }: StorefrontPreviewProps) {
  const templateId = resolveStorefrontTemplate(store, content);

  return (
    <StorefrontEditorCanvas
      store={store}
      draft={content}
      brandColor={content.palette?.primary ?? store.brand_color}
      palette={content.palette}
      templateId={templateId}
      activePage="home"
      onDraftChange={() => {}}
      readOnly
    />
  );
}
