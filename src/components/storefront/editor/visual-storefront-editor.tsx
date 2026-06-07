"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, Monitor, Save, Smartphone, Tablet } from "lucide-react";
import type {
  Store,
  StorefrontColorPalette,
  StorefrontContent,
  StorefrontTemplateId,
} from "@/lib/api/types";
import { STOREFRONT_TEMPLATE_OPTIONS } from "@/lib/api/types";
import { getStorefrontUrl } from "@/lib/store-host";
import {
  StorefrontEditorCanvas,
  type EditorPage,
} from "@/components/storefront/editor/storefront-editor-canvas";
import {
  applyTemplateToDraft,
  cloneStorefrontContent,
  setDraftField,
} from "@/lib/storefront/draft";
import { getProductPlugSource } from "@/lib/storefront/product-plugs";
import {
  getDefaultStorefrontPalette,
  resolveStorefrontTemplate,
  STOREFRONT_PALETTE_PRESETS,
  STOREFRONT_THEME_PRESETS,
} from "@/lib/storefront/template";

const concreteTemplateOptions = STOREFRONT_TEMPLATE_OPTIONS.filter(
  (
    option,
  ): option is (typeof STOREFRONT_TEMPLATE_OPTIONS)[number] & {
    value: StorefrontTemplateId;
  } => option.value !== "ai_pick",
);

const PALETTE_FIELDS: { key: keyof StorefrontColorPalette; label: string }[] = [
  { key: "primary", label: "Primary" },
  { key: "accent", label: "Accent" },
  { key: "background", label: "Background" },
  { key: "surface", label: "Surface" },
  { key: "text", label: "Text" },
  { key: "muted", label: "Muted text" },
  { key: "border", label: "Border" },
];

const EDITOR_PAGES: { id: EditorPage; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "products", label: "Products" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
  { id: "faq", label: "FAQ" },
];

type VisualStorefrontEditorProps = {
  store: Store;
  storefront: StorefrontContent;
  saving: boolean;
  onSave: (
    updated: StorefrontContent,
    templateId: StorefrontTemplateId,
    brandColor: string,
  ) => void;
};

export function VisualStorefrontEditor({
  store,
  storefront,
  saving,
  onSave,
}: VisualStorefrontEditorProps) {
  const [draft, setDraft] = useState(() => cloneStorefrontContent(storefront));
  const [templateId, setTemplateId] = useState<StorefrontTemplateId>(() =>
    resolveStorefrontTemplate(store, storefront),
  );
  const [palette, setPalette] = useState<StorefrontColorPalette>(() => ({
    ...getDefaultStorefrontPalette(resolveStorefrontTemplate(store, storefront), store.brand_color),
    ...storefront.palette,
  }));
  const [activePage, setActivePage] = useState<EditorPage>("home");
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const brandColor = palette.primary;

  useEffect(() => {
    const nextTemplateId = resolveStorefrontTemplate(store, storefront);
    setDraft(cloneStorefrontContent(storefront));
    setTemplateId(nextTemplateId);
    setPalette({
      ...getDefaultStorefrontPalette(nextTemplateId, store.brand_color),
      ...storefront.palette,
    });
  }, [store, storefront]);

  const isDirty = useMemo(() => {
    return (
      JSON.stringify(draft) !== JSON.stringify(storefront) ||
      templateId !== resolveStorefrontTemplate(store, storefront) ||
      JSON.stringify(palette) !==
        JSON.stringify({
          ...getDefaultStorefrontPalette(
            resolveStorefrontTemplate(store, storefront),
            store.brand_color,
          ),
          ...storefront.palette,
        })
    );
  }, [draft, storefront, templateId, palette, store]);

  const viewportClass =
    viewport === "mobile" ? "max-w-[390px]" : viewport === "tablet" ? "max-w-[768px]" : "w-full";

  function handleSave() {
    onSave(applyTemplateToDraft(draft, templateId, palette), templateId, brandColor);
  }

  function updateDraftField(path: string, value: string) {
    setDraft((current) => setDraftField(current, path, value));
  }

  function selectTemplate(nextTemplateId: StorefrontTemplateId) {
    setTemplateId(nextTemplateId);
    setPalette(getDefaultStorefrontPalette(nextTemplateId));
  }

  function updatePaletteColor(key: keyof StorefrontColorPalette, value: string) {
    setPalette((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-6">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            Visual editor
          </div>
          <h2 className="font-display text-xl font-bold">Edit your storefront</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isDirty ? (
            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              Unsaved changes
            </span>
          ) : null}
          <a
            href={getStorefrontUrl(store.slug)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold hover:bg-secondary"
          >
            <ExternalLink className="h-4 w-4" />
            Live site
          </a>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save
          </button>
        </div>
      </div>

      <div className="grid gap-6 p-4 sm:p-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {EDITOR_PAGES.map((page) => (
              <button
                key={page.id}
                type="button"
                onClick={() => setActivePage(page.id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                  activePage === page.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-ink-soft hover:text-ink"
                }`}
              >
                {page.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setViewport("desktop")}
              className={`grid h-9 w-9 place-items-center rounded-md border ${viewport === "desktop" ? "border-primary bg-primary/10" : "border-border"}`}
              aria-label="Desktop preview"
            >
              <Monitor className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewport("tablet")}
              className={`grid h-9 w-9 place-items-center rounded-md border ${viewport === "tablet" ? "border-primary bg-primary/10" : "border-border"}`}
              aria-label="Tablet preview"
            >
              <Tablet className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewport("mobile")}
              className={`grid h-9 w-9 place-items-center rounded-md border ${viewport === "mobile" ? "border-primary bg-primary/10" : "border-border"}`}
              aria-label="Mobile preview"
            >
              <Smartphone className="h-4 w-4" />
            </button>
          </div>

          <div className={`mx-auto transition-all ${viewportClass}`}>
            <StorefrontEditorCanvas
              store={store}
              draft={draft}
              brandColor={brandColor}
              palette={palette}
              templateId={templateId}
              activePage={activePage}
              onDraftChange={setDraft}
            />
          </div>
        </div>

        <aside className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold">Template style</h3>
            <div className="mt-3 space-y-2">
              {concreteTemplateOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectTemplate(option.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                    templateId === option.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-ink/30"
                  }`}
                >
                  <div className="font-semibold">{option.label}</div>
                  <div className="text-xs text-ink-soft">
                    {option.bestFor} · {STOREFRONT_THEME_PRESETS[option.value].brandColor}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Color palette</h3>
            <p className="mt-1 text-xs leading-5 text-ink-soft">
              Pick a suggested palette, then fine-tune any color.
            </p>
            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => setPalette(getDefaultStorefrontPalette(templateId))}
                className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm transition hover:border-ink/30"
              >
                <div className="font-semibold">Template default</div>
                <div className="mt-2 flex gap-1">
                  {Object.values(getDefaultStorefrontPalette(templateId)).map((color) => (
                    <span
                      key={color}
                      className="h-5 flex-1 rounded"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </button>
              {STOREFRONT_PALETTE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setPalette(preset.palette)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-left text-sm transition hover:border-ink/30"
                >
                  <div className="font-semibold">{preset.label}</div>
                  <div className="mt-2 flex gap-1">
                    {Object.values(preset.palette).map((color) => (
                      <span
                        key={color}
                        className="h-5 flex-1 rounded"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4 space-y-3">
              {PALETTE_FIELDS.map((field) => (
                <label key={field.key} className="block text-xs font-medium text-ink-soft">
                  {field.label}
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="color"
                      value={palette[field.key]}
                      onChange={(event) => updatePaletteColor(field.key, event.target.value)}
                      className="h-9 w-12 cursor-pointer rounded-md border border-border bg-background p-1"
                    />
                    <input
                      value={palette[field.key]}
                      onChange={(event) => updatePaletteColor(field.key, event.target.value)}
                      className="h-9 min-w-0 flex-1 rounded-md border border-border bg-background px-2 font-mono text-xs uppercase"
                    />
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Images</h3>
            <p className="mt-1 text-xs leading-5 text-ink-soft">
              Double-click any image in the preview to upload a replacement. Product, hero, about,
              and category images update instantly in the draft.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">Product data plug</h3>
            <p className="mt-1 text-xs leading-5 text-ink-soft">
              Choose what the homepage product section should plug into.
            </p>
            <div className="mt-3 space-y-2">
              {[
                {
                  value: "merchant_products",
                  title: "Customer products",
                  body: "Use products added to this storefront, with theme products filling empty slots.",
                },
                {
                  value: "theme_products",
                  title: "Theme products",
                  body: "Use the selected design's curated demo products for this section.",
                },
              ].map((option) => {
                const active = getProductPlugSource(draft) === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      updateDraftField("data_plugs.home_products_source", option.value)
                    }
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                      active ? "border-primary bg-primary/5" : "border-border hover:border-ink/30"
                    }`}
                  >
                    <div className="font-semibold">{option.title}</div>
                    <div className="text-xs leading-5 text-ink-soft">{option.body}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">SEO</h3>
            <label className="mt-3 block text-xs font-medium text-ink-soft">
              Page title
              <input
                value={draft.seo.title}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    seo: { ...current.seo, title: event.target.value },
                  }))
                }
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="mt-3 block text-xs font-medium text-ink-soft">
              Meta description
              <textarea
                value={draft.seo.description}
                rows={3}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    seo: { ...current.seo, description: event.target.value },
                  }))
                }
                className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>

          {draft.pages?.contact ? (
            <div>
              <h3 className="text-sm font-semibold">Contact details</h3>
              <label className="mt-3 block text-xs font-medium text-ink-soft">
                Email
                <input
                  value={draft.pages.contact.email ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      pages: {
                        ...current.pages!,
                        contact: {
                          ...current.pages!.contact,
                          email: event.target.value || null,
                          source: "merchant",
                        },
                      },
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
              <label className="mt-3 block text-xs font-medium text-ink-soft">
                Phone
                <input
                  value={draft.pages.contact.phone ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      pages: {
                        ...current.pages!,
                        contact: {
                          ...current.pages!.contact,
                          phone: event.target.value || null,
                          source: "merchant",
                        },
                      },
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
