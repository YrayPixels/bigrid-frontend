"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ExternalLink,
  Eye,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  RefreshCcw,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { getStorefrontUrl } from "@/lib/store-host";
import { toast } from "sonner";
import { GeneratingSkeleton } from "@/components/storefront/generating-skeleton";
import { StorefrontPreview } from "@/components/storefront/storefront-preview";
import { VisualStorefrontEditor } from "@/components/storefront/editor/visual-storefront-editor";
import { WebsiteAskAiSheet } from "@/components/admin/website-ask-ai-sheet";
import { WebsiteCreateView } from "@/components/admin/website-create-view";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api/client";
import {
  merchantCache,
  merchantInvalidators,
  useStorefront,
  useStorefrontTemplates,
  useStoreMe,
} from "@/hooks/use-merchant-queries";
import { DEFAULT_STOREFRONT_TEMPLATE_ID, getDefaultStorefrontPalette } from "@/lib/storefront/template";
import {
  PublishStorefrontButton,
  PublishStatusBadge,
} from "@/components/admin/publish-storefront-button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  STOREFRONT_TEMPLATE_OPTIONS,
  isEmailVerified,
  type Store,
  type StorefrontContent,
  type StorefrontPublishState,
  type StorefrontTemplateId,
  type StorefrontTemplateOption,
  type StorefrontTemplatePreview,
} from "@/lib/api/types";

import { getConcreteTemplateOptions } from "@/lib/storefront/template-registry";
import { applyTemplatePreset } from "@/lib/storefront/draft";

type ConcreteTemplateOption = StorefrontTemplateOption & { value: StorefrontTemplateId };

const FASHION_TEMPLATE_THUMBNAIL =
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80";

function TemplateMiniPreview({
  variant,
  brandColor,
}: {
  variant: StorefrontTemplatePreview;
  brandColor: string;
}) {
  if (variant === "beauty") {
    return (
      <div className="h-28 overflow-hidden rounded-lg border border-[#f0d6d0] bg-[#fff7f3] p-2">
        <div className="grid h-full grid-rows-[1fr_0.75fr] gap-2">
          <div className="relative overflow-hidden rounded-xl bg-[#e6a79f]/30">
            <div className="absolute left-3 top-3 h-4 w-20 rounded-full bg-white/80" />
            <div className="absolute bottom-2 right-3 h-12 w-12 rounded-full bg-[#6f2f2b]/80" />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {[0, 1, 2].map((item) => (
              <div key={item} className="rounded-lg bg-white p-1">
                <div className="h-5 rounded-md bg-[#e6a79f]/30" />
                <div className="mt-1 h-1.5 rounded bg-[#6f2f2b]/20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "cosmetics") {
    return (
      <div className="h-28 overflow-hidden rounded-lg border border-[#e2e6d9] bg-white p-2">
        <div className="grid h-full grid-cols-[1.2fr_0.8fr] gap-2">
          <div className="relative overflow-hidden bg-[#fff2df] p-2">
            <div className="h-2 w-12 rounded bg-[#82934c]/80" />
            <div className="mt-2 h-4 w-16 rounded bg-[#82934c]/30" />
            <div className="absolute bottom-2 right-2 h-12 w-8 rounded-t-full bg-white shadow-sm" />
          </div>
          <div className="grid gap-1.5">
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex items-center gap-1 bg-[#f4f6f1] p-1">
                <div className="h-6 w-4 rounded-t-full bg-white" />
                <div className="h-1.5 flex-1 rounded bg-[#82934c]/30" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "editorial") {
    return (
      <div className="h-28 overflow-hidden rounded-lg border border-border bg-background p-3 text-center">
        <div className="mx-auto h-2 w-10 rounded-full" style={{ backgroundColor: brandColor }} />
        <div className="mx-auto mt-3 h-3 w-24 rounded bg-secondary" />
        <div className="mx-auto mt-2 h-2 w-32 rounded bg-secondary" />
        <div className="mt-4 flex justify-center gap-2">
          <div className="h-9 w-9 rounded-full" style={{ backgroundColor: `${brandColor}33` }} />
          <div className="h-9 w-9 rounded-full" style={{ backgroundColor: `${brandColor}22` }} />
          <div className="h-9 w-9 rounded-full" style={{ backgroundColor: `${brandColor}33` }} />
        </div>
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className="h-28 overflow-hidden rounded-lg border border-border bg-background p-3">
        <div className="h-3 w-20 rounded" style={{ backgroundColor: brandColor }} />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-7 rounded bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "lookbook") {
    return (
      <div className="h-28 overflow-hidden rounded-lg border border-border bg-background p-2">
        <div className="grid h-full grid-rows-[0.2fr_1fr_0.28fr] gap-1">
          <div className="h-2 rounded-sm bg-ink" />
          <div className="relative overflow-hidden rounded-md bg-secondary">
            <img
              src={FASHION_TEMPLATE_THUMBNAIL}
              alt=""
              className="h-full w-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-black/15" />
            <div className="absolute inset-x-0 top-3 mx-auto h-2 w-24 rounded bg-white/80" />
          </div>
          <div className="grid grid-cols-4 gap-1">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="rounded-sm bg-secondary" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "minimal") {
    return (
      <div className="h-28 overflow-hidden rounded-lg border border-border bg-[#fbfbdc] p-2">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: brandColor }} />
            <span className="h-2 w-10 rounded bg-[#073e3f]/20" />
          </div>
          <span className="h-3 w-10 rounded-full" style={{ backgroundColor: brandColor }} />
        </div>
        <div className="rounded-t-xl bg-white p-2">
          <div className="mx-auto h-2 w-20 rounded bg-[#073e3f]/20" />
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div key={item} className="space-y-1 rounded bg-[#f0f0f0] p-1">
                <div className="h-8 rounded bg-[#dfe7cf]" />
                <div className="h-1.5 rounded bg-[#073e3f]/20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-28 overflow-hidden rounded-lg border border-border bg-background p-3">
      <div className="h-3 w-20 rounded" style={{ backgroundColor: brandColor }} />
      <div className="mt-3 h-3 w-28 rounded bg-secondary" />
      <div className="mt-2 h-2 w-36 rounded bg-secondary" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="h-7 rounded bg-secondary" />
        <div className="h-7 rounded bg-secondary" />
        <div className="h-7 rounded bg-secondary" />
      </div>
    </div>
  );
}

function TemplateGrid({
  brandColor,
  selectedTemplateId,
  onSelect,
  templateOptions,
}: {
  brandColor: string;
  selectedTemplateId: StorefrontTemplateId;
  onSelect: (templateId: StorefrontTemplateId) => void;
  templateOptions: ConcreteTemplateOption[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {templateOptions.map((option) => {
        const active = selectedTemplateId === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className={`rounded-xl border p-4 text-left transition ${
              active
                ? "border-primary bg-primary/5 text-ink shadow-soft"
                : "border-border bg-background text-ink-soft hover:border-ink/30 hover:text-ink"
            }`}
          >
            <TemplateMiniPreview variant={option.preview} brandColor={brandColor} />
            <div className="mt-4">
              <div className="flex items-start justify-between gap-3">
                <div className="font-display text-base font-semibold">{option.label}</div>
                <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                  {option.bestFor}
                </span>
              </div>
              <p className="mt-2 text-sm">{option.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function getConcreteTemplateId(store: Store): StorefrontTemplateId {
  return store.storefront_template_id && store.storefront_template_id !== "ai_pick"
    ? store.storefront_template_id
    : DEFAULT_STOREFRONT_TEMPLATE_ID;
}

function createStarterStorefront(
  store: Store,
  selectedTemplateId = getConcreteTemplateId(store),
): StorefrontContent {
  const templateId = selectedTemplateId;
  const description =
    store.description || `Tell customers what makes ${store.business_name} special.`;

  const base: StorefrontContent = {
    template: {
      id: templateId,
      source: "merchant_selected",
    },
    palette: getDefaultStorefrontPalette(templateId, store.brand_color),
    data_plugs: {
      home_products_source: "merchant_products",
    },
    hero: {
      headline: `Welcome to ${store.business_name}`,
      subheadline: description,
      cta_label: "Shop now",
    },
    about: {
      title: `About ${store.business_name}`,
      body: description,
    },
    value_props: [
      { title: "Quality products", body: "Describe why customers should trust this store." },
      { title: "Fast fulfilment", body: "Explain how orders are prepared and delivered." },
      {
        title: "Helpful support",
        body: "Tell customers how they can get help before or after buying.",
      },
    ],
    pages: {
      about: {
        title: `About ${store.business_name}`,
        body: description,
        source: "merchant",
      },
      contact: {
        title: "Contact us",
        body: "Have a question? Send us a message and we will get back to you shortly.",
        email: null,
        phone: null,
        source: "merchant",
      },
      faq: {
        title: "Frequently asked questions",
        source: "merchant",
        items: [
          {
            question: "How do I place an order?",
            answer: "Browse products, add items to your cart, and complete checkout.",
          },
          {
            question: "How long does delivery take?",
            answer: "Add your delivery timeline here.",
          },
          {
            question: "Can I return an item?",
            answer: "Add your return policy here.",
          },
        ],
      },
      privacy_policy: {
        title: "Privacy policy",
        body: `This privacy policy explains how ${store.business_name} collects, uses, and protects customer information.`,
        source: "platform_default",
      },
    },
    products: [],
    seo: {
      title: `${store.business_name} | Online Store`,
      description: description.slice(0, 150),
    },
  };

  return applyTemplatePreset(base, templateId, store.brand_color);
}

function StorefrontCreationChoice({
  store,
  generating,
  saving,
  onGenerate,
  onStartEditing,
  onChatCreate,
  templateOptions,
}: {
  store: Store;
  generating: boolean;
  saving: boolean;
  onGenerate: (templateId: StorefrontTemplateId) => void;
  onStartEditing: (templateId: StorefrontTemplateId) => void;
  onChatCreate: () => void;
  templateOptions: ConcreteTemplateOption[];
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<StorefrontTemplateId>(
    getConcreteTemplateId(store),
  );
  const selectedTemplate = templateOptions.find(
    (option) => option.value === selectedTemplateId,
  );

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-ink-soft">
          <Sparkles className="h-4 w-4 text-primary" /> Create your website content
        </div>
        <h2 className="mt-1 font-display text-2xl font-bold">
          Start from {selectedTemplate?.label}
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Chat with AI to build a first draft, generate content for a template, or start editing
          manually.
        </p>
      </div>

      <div className="mt-6">
        <TemplateGrid
          brandColor={store.brand_color}
          selectedTemplateId={selectedTemplateId}
          onSelect={setSelectedTemplateId}
          templateOptions={templateOptions}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <button
          type="button"
          onClick={onChatCreate}
          disabled={generating || saving}
          className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-left shadow-soft transition hover:border-primary disabled:opacity-60"
        >
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MessageSquare className="h-4 w-4" />
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold">Build with chat</h3>
          <p className="mt-2 text-sm text-ink-soft">
            Describe your business in plain language and watch a live preview appear.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onGenerate(selectedTemplateId)}
          disabled={generating || saving}
          className="rounded-xl border border-border bg-background p-5 text-left shadow-soft transition hover:border-ink/30 disabled:opacity-60"
        >
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-ink">
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold">Generate for this look</h3>
          <p className="mt-2 text-sm text-ink-soft">
            AI writes the hero, about section, value props, pages, and SEO for this template.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onStartEditing(selectedTemplateId)}
          disabled={generating || saving}
          className="rounded-xl border border-border bg-background p-5 text-left shadow-soft transition hover:border-ink/30 disabled:opacity-60"
        >
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-ink">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold">Start editing manually</h3>
          <p className="mt-2 text-sm text-ink-soft">
            Create a starter draft immediately and open the website editor.
          </p>
        </button>
      </div>
    </section>
  );
}

function WebsiteRefineView({ store }: { store: Store }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [askAiOpen, setAskAiOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const { data: activeTemplateOptions = STOREFRONT_TEMPLATE_OPTIONS } = useStorefrontTemplates();
  const concreteTemplateOptions = getConcreteTemplateOptions(activeTemplateOptions);

  const storefrontQuery = useStorefront(store.id);
  const storefront = storefrontQuery.data?.storefront ?? null;

  const generate = useMutation({
    mutationFn: ({ storeId, templateId }: { storeId: string; templateId?: StorefrontTemplateId }) =>
      api.generateStorefront(storeId, templateId),
    onSuccess: (data) => {
      merchantCache.setStorefront(queryClient, store.id, data);
      merchantInvalidators.builderSession(queryClient);
      toast.success("Draft generated — publish when you're ready to go live.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Generation failed"),
  });

  const saveStorefront = useMutation({
    mutationFn: ({
      storeId,
      storefront: next,
      templateId,
    }: {
      storeId: string;
      storefront: StorefrontContent;
      templateId: StorefrontTemplateId;
    }) =>
      api.updateStorefront(storeId, {
        storefront: next,
        storefront_template_id: templateId,
      }),
    onSuccess: (data) => {
      merchantCache.setStorefront(queryClient, store.id, data);
      merchantInvalidators.builderSession(queryClient);
      merchantInvalidators.store(queryClient);
      toast.success("Draft saved.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save edits"),
  });

  const publishStorefront = useMutation({
    mutationFn: () => {
      if (!isEmailVerified(user)) {
        throw new Error("Verify your email before publishing your storefront.");
      }
      return api.publishStorefront(store.id);
    },
    onSuccess: (data) => {
      merchantCache.setStoreMe(queryClient, data.store);
      merchantCache.setStorefront(queryClient, store.id, {
        storefront: data.storefront ?? storefrontQuery.data?.storefront ?? null,
        publish: data.publish,
      });
      toast.success(data.message);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not publish storefront"),
  });

  const generationPending = generate.isPending;
  const publishState: StorefrontPublishState | undefined =
    storefrontQuery.data?.publish ??
    ({
      status: store.status ?? "draft",
      published_at: store.published_at ?? null,
      is_published: store.is_published ?? false,
      has_unpublished_changes: store.has_unpublished_changes ?? !!storefront,
    } satisfies StorefrontPublishState);
  const liveStoreUrl = getStorefrontUrl(store.slug);
  const canViewLive = publishState?.is_published;

  if (storefrontQuery.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">Website</span>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {store.business_name}
          </h1>
          <p className="mt-1 hidden text-sm text-ink-soft sm:block">
            Design, preview, and publish your storefront at {liveStoreUrl}.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <PublishStatusBadge publish={publishState} />
          <PublishStorefrontButton
            store={store}
            publish={publishState}
            publishing={publishStorefront.isPending}
            disabled={!storefront}
            onPublish={() => publishStorefront.mutate()}
          />
          <button
            type="button"
            onClick={() => setActionsOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card text-ink shadow-soft hover:bg-secondary lg:hidden"
            aria-label="More website actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          <div className="hidden flex-wrap items-center gap-2 lg:flex">
            <button
              type="button"
              onClick={() => setAskAiOpen(true)}
              className="inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-ink shadow-soft hover:border-primary"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Ask AI
            </button>
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              disabled={!storefront}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-ink shadow-soft hover:bg-secondary disabled:opacity-60"
            >
              <Eye className="h-4 w-4" />
              Preview draft
            </button>
            {canViewLive ? (
              <a
                href={liveStoreUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-ink shadow-soft hover:bg-secondary"
              >
                <ExternalLink className="h-4 w-4" />
                View live store
              </a>
            ) : (
              <span
                title="Publish your storefront to share the live link."
                className="inline-flex cursor-not-allowed items-center gap-2 rounded-md border border-border bg-card/60 px-4 py-2 text-sm font-semibold text-ink-soft opacity-70"
              >
                <ExternalLink className="h-4 w-4" />
                View live store
              </span>
            )}
            <Link
              href="/admin/website?mode=create"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-ink shadow-soft hover:bg-secondary"
            >
              <MessageSquare className="h-4 w-4" />
              Rebuild with AI
            </Link>
            <button
              type="button"
              onClick={() =>
                generate.mutate({
                  storeId: store.id,
                  templateId: getConcreteTemplateId(store),
                })
              }
              disabled={generationPending}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-ink shadow-soft hover:bg-secondary disabled:opacity-60"
            >
              {generationPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              {generationPending ? "Regenerating..." : "Regenerate"}
            </button>
          </div>
        </div>
      </div>

      <Sheet open={actionsOpen} onOpenChange={setActionsOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md">
          <SheetHeader className="shrink-0 border-b border-border px-5 py-4 pr-12 text-left">
            <SheetTitle>Website actions</SheetTitle>
            <SheetDescription>Preview, AI tools, and storefront links.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
            <button
              type="button"
              onClick={() => {
                setActionsOpen(false);
                setAskAiOpen(true);
              }}
              className="flex w-full items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-3 py-3 text-left text-sm font-semibold"
            >
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              Ask AI
            </button>
            <button
              type="button"
              onClick={() => {
                setActionsOpen(false);
                setPreviewOpen(true);
              }}
              disabled={!storefront}
              className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-3 text-left text-sm font-semibold disabled:opacity-60"
            >
              <Eye className="h-4 w-4 shrink-0" />
              Preview draft
            </button>
            {canViewLive ? (
              <a
                href={liveStoreUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => setActionsOpen(false)}
                className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-3 text-left text-sm font-semibold"
              >
                <ExternalLink className="h-4 w-4 shrink-0" />
                View live store
              </a>
            ) : (
              <span className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg border border-border px-3 py-3 text-left text-sm font-semibold text-ink-soft opacity-70">
                <ExternalLink className="h-4 w-4 shrink-0" />
                View live store
                <span className="ml-auto text-xs font-normal">Publish first</span>
              </span>
            )}
            <Link
              href="/admin/website?mode=create"
              onClick={() => setActionsOpen(false)}
              className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-3 text-left text-sm font-semibold"
            >
              <MessageSquare className="h-4 w-4 shrink-0" />
              Rebuild with AI
            </Link>
            <button
              type="button"
              onClick={() => {
                setActionsOpen(false);
                generate.mutate({
                  storeId: store.id,
                  templateId: getConcreteTemplateId(store),
                });
              }}
              disabled={generationPending}
              className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-3 text-left text-sm font-semibold disabled:opacity-60"
            >
              {generationPending ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4 shrink-0" />
              )}
              {generationPending ? "Regenerating..." : "Regenerate"}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {storefront ? (
        <section className="mt-8">
          <VisualStorefrontEditor
            store={store}
            storefront={storefront}
            saving={saveStorefront.isPending}
            onSave={async (updatedStorefront, templateId, brandColor) => {
              if (brandColor !== store.brand_color) {
                try {
                  const updatedStore = await api.updateMyStore({ brand_color: brandColor });
                  merchantCache.setStoreMe(queryClient, updatedStore);
                } catch {
                  merchantCache.setStoreMe(queryClient, {
                    ...store,
                    brand_color: brandColor,
                  });
                }
              }
              saveStorefront.mutate({
                storeId: store.id,
                storefront: updatedStorefront,
                templateId,
              });
            }}
          />
        </section>
      ) : generationPending ? (
        <section className="mt-8">
          <GeneratingSkeleton />
        </section>
      ) : (
        <StorefrontCreationChoice
          store={store}
          generating={generationPending}
          saving={saveStorefront.isPending}
          templateOptions={concreteTemplateOptions}
          onChatCreate={() => router.replace("/admin/website?mode=create")}
          onGenerate={(templateId) => generate.mutate({ storeId: store.id, templateId })}
          onStartEditing={(templateId) =>
            saveStorefront.mutate({
              storeId: store.id,
              storefront: createStarterStorefront(store, templateId),
              templateId,
            })
          }
        />
      )}

      {previewOpen && storefront ? (
        <div className="fixed inset-0 z-50 bg-black/60 p-4 backdrop-blur-sm sm:p-6">
          <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-canvas shadow-elevated">
            <div className="flex items-center justify-between gap-4 border-b border-border bg-card px-4 py-3 sm:px-6">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                  Preview
                </div>
                <h2 className="font-display text-lg font-bold">{store.business_name}</h2>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-background hover:bg-secondary"
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <StorefrontPreview store={store} content={storefront} />
            </div>
          </div>
        </div>
      ) : null}

      <WebsiteAskAiSheet
        open={askAiOpen}
        onOpenChange={setAskAiOpen}
        storeId={store.id}
        draft={storefront}
      />
    </div>
  );
}

function WebsiteHubInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const forceCreate = searchParams.get("mode") === "create";

  const storeQuery = useStoreMe({ enabled: !!user });
  const store = storeQuery.data;
  const storefrontQuery = useStorefront(store?.id, { enabled: !!store && !forceCreate });

  useEffect(() => {
    if (storeQuery.isFetched && !storeQuery.data && user) {
      router.replace("/admin/onboarding");
    }
  }, [storeQuery.isFetched, storeQuery.data, user, router]);

  if (storeQuery.isLoading || (!forceCreate && store && storefrontQuery.isLoading)) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!store) return null;

  const hasDraft = !!storefrontQuery.data?.storefront;
  const showCreate = forceCreate || !hasDraft;

  if (showCreate) {
    return (
      <WebsiteCreateView
        onDraftChanged={() => {
          merchantInvalidators.storefront(queryClient);
        }}
      />
    );
  }

  return <WebsiteRefineView store={store} />;
}

export default function WebsiteEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[50vh] place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <WebsiteHubInner />
    </Suspense>
  );
}
