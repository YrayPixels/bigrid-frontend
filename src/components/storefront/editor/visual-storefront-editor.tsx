"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStorefrontTemplates } from "@/hooks/use-merchant-queries";
import {
  ChevronDown,
  ExternalLink,
  Loader2,
  Monitor,
  Save,
  Smartphone,
  Tablet,
} from "lucide-react";
import { getConcreteTemplateOptions } from "@/lib/storefront/template-registry";
import type {
  Store,
  StorefrontColorPalette,
  StorefrontContent,
  StorefrontTemplateId,
  StorefrontTemplateOption,
  StorefrontThemeBodyFont,
  StorefrontThemeButtonRadius,
  StorefrontThemeButtonStyle,
  StorefrontThemeDensity,
  StorefrontThemeOverrides,
} from "@/lib/api/types";
import { STOREFRONT_TEMPLATE_OPTIONS } from "@/lib/api/types";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getStorefrontUrl } from "@/lib/store-host";
import {
  StorefrontEditorCanvas,
  type EditorPage,
} from "@/components/storefront/editor/storefront-editor-canvas";
import { BlockEditorPanel } from "@/components/storefront/editor/block-editor-panel";
import type { SelectedBlockRef } from "@/lib/storefront/blocks/block-draft";
import type { StorefrontContentPageSlug } from "@/lib/storefront/blocks/types";
import {
  reorderPageBlock,
  setBlockPropField,
} from "@/lib/storefront/blocks/block-draft";
import {
  applyTemplatePreset,
  applyTemplateToDraft,
  cloneStorefrontContent,
  normalizeStorefrontContent,
  setDraftField,
} from "@/lib/storefront/draft";
import { getProductPlugSource } from "@/lib/storefront/product-plugs";
import {
  clearStorefrontStyleOverrides,
  getDefaultStorefrontPalette,
  resolveStorefrontTemplate,
  STOREFRONT_BODY_FONT_OPTIONS,
  STOREFRONT_FONT_OPTIONS,
  STOREFRONT_PALETTE_PRESETS,
  STOREFRONT_THEME_PRESETS,
} from "@/lib/storefront/template";

type ConcreteTemplateOption = StorefrontTemplateOption & { value: StorefrontTemplateId };

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
  { id: "cart", label: "Cart" },
  { id: "checkout", label: "Checkout" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
  { id: "faq", label: "FAQ" },
];

const AUTOSAVE_DELAY_MS = 900;

function fontKeyFromCss(css: string | undefined): string | null {
  if (!css) return null;
  const match = Object.entries(STOREFRONT_FONT_OPTIONS).find(([, option]) => option.css === css);
  return match?.[0] ?? null;
}

function StyleOptionButton({
  active,
  title,
  description,
  onClick,
}: {
  active: boolean;
  title: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
        active ? "border-primary bg-primary/5" : "border-border hover:border-ink/30"
      }`}
    >
      <div className="font-semibold">{title}</div>
      {description ? <div className="text-xs leading-5 text-ink-soft">{description}</div> : null}
    </button>
  );
}

function EditorControlSection({
  title,
  children,
  open,
  onOpenChange,
}: {
  title: string;
  children: ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="overflow-hidden rounded-xl border border-border bg-background/60"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm font-semibold transition hover:bg-secondary"
          aria-expanded={open}
        >
          <span>{title}</span>
          <ChevronDown
            className={`h-4 w-4 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border px-3 pb-3 pt-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

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
  const [draft, setDraft] = useState(() => normalizeStorefrontContent(cloneStorefrontContent(storefront), store));
  const [templateId, setTemplateId] = useState<StorefrontTemplateId>(() =>
    resolveStorefrontTemplate(store, storefront),
  );
  const [palette, setPalette] = useState<StorefrontColorPalette>(() => ({
    ...getDefaultStorefrontPalette(resolveStorefrontTemplate(store, storefront), store.brand_color),
    ...storefront.palette,
  }));
  const [activePage, setActivePage] = useState<EditorPage>("home");
  const [selectedBlock, setSelectedBlock] = useState<SelectedBlockRef | null>(null);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [openSection, setOpenSection] = useState("template-style");
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const brandColor = palette.primary;
  const { data: activeTemplateOptions = STOREFRONT_TEMPLATE_OPTIONS } = useStorefrontTemplates();
  const concreteTemplateOptions = useMemo(
    () => getConcreteTemplateOptions(activeTemplateOptions),
    [activeTemplateOptions],
  );

  useEffect(() => {
    const nextTemplateId = resolveStorefrontTemplate(store, storefront);
    setDraft(normalizeStorefrontContent(cloneStorefrontContent(storefront), store));
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
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    onSave(applyTemplateToDraft(draft, templateId, palette), templateId, brandColor);
  }

  useEffect(() => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }

    if (!isDirty || saving) return;

    autosaveTimerRef.current = setTimeout(() => {
      onSave(applyTemplateToDraft(draft, templateId, palette), templateId, brandColor);
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [brandColor, draft, isDirty, onSave, palette, saving, templateId]);

  function updateDraftField(path: string, value: string) {
    setDraft((current) => setDraftField(current, path, value));
  }

  function handlePageChange(page: EditorPage) {
    setActivePage(page);
    setSelectedBlock(null);
  }

  function handleBlockPropChange(
    page: StorefrontContentPageSlug,
    blockId: string,
    field: string,
    value: string,
  ) {
    setDraft((current) => setBlockPropField(current, page, blockId, field, value));
  }

  function handleBlockReorder(
    page: StorefrontContentPageSlug,
    blockId: string,
    direction: "up" | "down",
  ) {
    setDraft((current) => reorderPageBlock(current, page, blockId, direction));
  }

  function selectTemplate(nextTemplateId: StorefrontTemplateId) {
    const nextPalette = getDefaultStorefrontPalette(nextTemplateId, store.brand_color);
    setTemplateId(nextTemplateId);
    setPalette(nextPalette);
    setDraft((current) => applyTemplatePreset(current, nextTemplateId, store.brand_color));
  }

  function resetStyleToTemplateDefault() {
    setDraft((current) => clearStorefrontStyleOverrides(current));
  }

  function setDisplayFont(fontKey: string | null) {
    setDraft((current) => {
      const next = { ...current };
      if (!fontKey) {
        delete next.display_font;
        return next;
      }
      const option = STOREFRONT_FONT_OPTIONS[fontKey];
      if (!option) return current;
      next.display_font = option.css;
      return next;
    });
  }

  function setBodyFont(fontKey: StorefrontThemeBodyFont | null) {
    setDraft((current) => {
      const nextOverrides: StorefrontThemeOverrides = { ...current.theme_overrides };
      if (!fontKey) {
        delete nextOverrides.body_font;
      } else {
        nextOverrides.body_font = fontKey;
      }
      const next = { ...current };
      if (Object.keys(nextOverrides).length > 0) {
        next.theme_overrides = nextOverrides;
      } else {
        delete next.theme_overrides;
      }
      return next;
    });
  }

  function setButtonStyle(value: StorefrontThemeButtonStyle | null) {
    setDraft((current) => {
      const nextOverrides: StorefrontThemeOverrides = { ...current.theme_overrides };
      if (!value) {
        delete nextOverrides.button_style;
      } else {
        nextOverrides.button_style = value;
      }
      const next = { ...current };
      if (Object.keys(nextOverrides).length > 0) {
        next.theme_overrides = nextOverrides;
      } else {
        delete next.theme_overrides;
      }
      return next;
    });
  }

  function setButtonRadius(value: StorefrontThemeButtonRadius | null) {
    setDraft((current) => {
      const nextOverrides: StorefrontThemeOverrides = { ...current.theme_overrides };
      if (!value) {
        delete nextOverrides.button_radius;
      } else {
        nextOverrides.button_radius = value;
      }
      const next = { ...current };
      if (Object.keys(nextOverrides).length > 0) {
        next.theme_overrides = nextOverrides;
      } else {
        delete next.theme_overrides;
      }
      return next;
    });
  }

  function setDensity(value: StorefrontThemeDensity | null) {
    setDraft((current) => {
      const nextOverrides: StorefrontThemeOverrides = { ...current.theme_overrides };
      if (!value || value === "default") {
        delete nextOverrides.density;
      } else {
        nextOverrides.density = value;
      }
      const next = { ...current };
      if (Object.keys(nextOverrides).length > 0) {
        next.theme_overrides = nextOverrides;
      } else {
        delete next.theme_overrides;
      }
      return next;
    });
  }

  function updatePaletteColor(key: keyof StorefrontColorPalette, value: string) {
    setPalette((current) => ({ ...current, [key]: value }));
  }

  const displayFontKey = fontKeyFromCss(draft.display_font);
  const bodyFontKey = draft.theme_overrides?.body_font ?? null;
  const buttonStyle = draft.theme_overrides?.button_style ?? null;
  const buttonRadius = draft.theme_overrides?.button_radius ?? null;
  const density = draft.theme_overrides?.density ?? null;
  const hasStyleOverrides =
    Boolean(draft.display_font) ||
    Boolean(draft.theme_overrides && Object.keys(draft.theme_overrides).length > 0);

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
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${
              saving
                ? "bg-blue-100 text-blue-800"
                : isDirty
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {saving ? "Autosaving..." : isDirty ? "Autosave pending" : "Saved"}
          </span>
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
                onClick={() => handlePageChange(page.id)}
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
              selectedBlock={selectedBlock}
              onSelectBlock={setSelectedBlock}
            />
          </div>
        </div>

        <aside className="space-y-3">
          <BlockEditorPanel
            draft={draft}
            activePage={activePage}
            selectedBlock={selectedBlock}
            onClose={() => setSelectedBlock(null)}
            onUpdateProp={handleBlockPropChange}
            onReorder={handleBlockReorder}
          />

          <EditorControlSection
            title="Template style"
            open={openSection === "template-style"}
            onOpenChange={(open) => setOpenSection(open ? "template-style" : "")}
          >
            <div className="space-y-2">
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
          </EditorControlSection>

          <EditorControlSection
            title="Color palette"
            open={openSection === "color-palette"}
            onOpenChange={(open) => setOpenSection(open ? "color-palette" : "")}
          >
            <p className="text-xs leading-5 text-ink-soft">
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
          </EditorControlSection>

          <EditorControlSection
            title="Typography"
            open={openSection === "typography"}
            onOpenChange={(open) => setOpenSection(open ? "typography" : "")}
          >
            <p className="text-xs leading-5 text-ink-soft">
              Headings and body text. Leave on template default to keep the design&apos;s standard fonts.
            </p>
            <div className="mt-3 space-y-2">
              <div className="text-xs font-medium text-ink-soft">Display font (headings)</div>
              <StyleOptionButton
                active={!displayFontKey}
                title="Template default"
                onClick={() => setDisplayFont(null)}
              />
              {Object.entries(STOREFRONT_FONT_OPTIONS).map(([key, option]) => (
                <StyleOptionButton
                  key={key}
                  active={displayFontKey === key}
                  title={option.label}
                  description={option.description}
                  onClick={() => setDisplayFont(key)}
                />
              ))}
            </div>
            <div className="mt-4 space-y-2">
              <div className="text-xs font-medium text-ink-soft">Body font</div>
              <StyleOptionButton
                active={!bodyFontKey}
                title="Template default"
                onClick={() => setBodyFont(null)}
              />
              {(Object.keys(STOREFRONT_BODY_FONT_OPTIONS) as StorefrontThemeBodyFont[]).map(
                (key) => {
                  const option = STOREFRONT_BODY_FONT_OPTIONS[key];
                  return (
                    <StyleOptionButton
                      key={key}
                      active={bodyFontKey === key}
                      title={option.label}
                      description={option.description}
                      onClick={() => setBodyFont(key)}
                    />
                  );
                },
              )}
            </div>
          </EditorControlSection>

          <EditorControlSection
            title="Style"
            open={openSection === "style"}
            onOpenChange={(open) => setOpenSection(open ? "style" : "")}
          >
            <p className="text-xs leading-5 text-ink-soft">
              Fine-tune buttons and spacing without changing the template layout.
            </p>
            {hasStyleOverrides ? (
              <button
                type="button"
                onClick={resetStyleToTemplateDefault}
                className="mt-3 w-full rounded-lg border border-border px-3 py-2 text-left text-sm font-semibold transition hover:border-ink/30"
              >
                Reset style to template default
              </button>
            ) : null}

            <div className="mt-4 space-y-2">
              <div className="text-xs font-medium text-ink-soft">Button shape</div>
              <StyleOptionButton
                active={!buttonStyle}
                title="Template default"
                onClick={() => setButtonStyle(null)}
              />
              {(
                [
                  { value: "rounded" as const, title: "Rounded", description: "Soft corners" },
                  { value: "square" as const, title: "Square", description: "Sharp edges" },
                  { value: "pill" as const, title: "Pill", description: "Fully rounded" },
                ] as const
              ).map((option) => (
                <StyleOptionButton
                  key={option.value}
                  active={buttonStyle === option.value}
                  title={option.title}
                  description={option.description}
                  onClick={() => setButtonStyle(option.value)}
                />
              ))}
            </div>

            <div className="mt-4 space-y-2">
              <div className="text-xs font-medium text-ink-soft">Button radius</div>
              <StyleOptionButton
                active={!buttonRadius}
                title="Template default"
                onClick={() => setButtonRadius(null)}
              />
              {(
                [
                  { value: "none" as const, title: "None" },
                  { value: "md" as const, title: "Medium" },
                  { value: "full" as const, title: "Full" },
                ] as const
              ).map((option) => (
                <StyleOptionButton
                  key={option.value}
                  active={buttonRadius === option.value}
                  title={option.title}
                  onClick={() => setButtonRadius(option.value)}
                />
              ))}
            </div>

            <div className="mt-4 space-y-2">
              <div className="text-xs font-medium text-ink-soft">Density</div>
              <StyleOptionButton
                active={!density}
                title="Template default"
                onClick={() => setDensity(null)}
              />
              {(
                [
                  {
                    value: "compact" as const,
                    title: "Compact",
                    description: "Tighter spacing, denser product grid",
                  },
                  {
                    value: "airy" as const,
                    title: "Airy",
                    description: "More breathing room, wider product cards",
                  },
                ] as const
              ).map((option) => (
                <StyleOptionButton
                  key={option.value}
                  active={density === option.value}
                  title={option.title}
                  description={option.description}
                  onClick={() => setDensity(option.value)}
                />
              ))}
            </div>
          </EditorControlSection>

          <EditorControlSection
            title="Images"
            open={openSection === "images"}
            onOpenChange={(open) => setOpenSection(open ? "images" : "")}
          >
            <p className="text-xs leading-5 text-ink-soft">
              Double-click any image in the preview to upload a replacement. The Minimalistic hero
              also accepts video (MP4, WebM, MOV). Product, hero, about, and category media update
              instantly in the draft.
            </p>
          </EditorControlSection>

          <EditorControlSection
            title="Product data plug"
            open={openSection === "product-data-plug"}
            onOpenChange={(open) => setOpenSection(open ? "product-data-plug" : "")}
          >
            <p className="text-xs leading-5 text-ink-soft">
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
          </EditorControlSection>

          <EditorControlSection
            title="SEO"
            open={openSection === "seo"}
            onOpenChange={(open) => setOpenSection(open ? "seo" : "")}
          >
            <label className="block text-xs font-medium text-ink-soft">
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
          </EditorControlSection>

          {draft.pages?.contact ? (
            <EditorControlSection
              title="Contact details"
              open={openSection === "contact-details"}
              onOpenChange={(open) => setOpenSection(open ? "contact-details" : "")}
            >
              <label className="block text-xs font-medium text-ink-soft">
                Email
                <input
                  value={draft.pages.contact.email ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      pages: {
                        ...current.pages!,
                        contact: {
                          ...current.pages!.contact!,
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
                          ...current.pages!.contact!,
                          phone: event.target.value || null,
                          source: "merchant",
                        },
                      },
                    }))
                  }
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
            </EditorControlSection>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
