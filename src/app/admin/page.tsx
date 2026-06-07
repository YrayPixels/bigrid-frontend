"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Eye, Loader2, Pencil, RefreshCcw, Save, Sparkles, X } from "lucide-react";
import { getStoreSubdomainHost, getStorefrontUrl } from "@/lib/store-host";
import { toast } from "sonner";
import { GeneratingSkeleton } from "@/components/storefront/generating-skeleton";
import { StorefrontPreview } from "@/components/storefront/storefront-preview";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api/client";
import {
  STOREFRONT_TEMPLATE_OPTIONS,
  type Store,
  type StorefrontContent,
  type StorefrontTemplateId,
} from "@/lib/api/types";

function NextCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 opacity-60 shadow-soft">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-base font-semibold">{title}</h4>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
          Soon
        </span>
      </div>
      <p className="mt-2 text-sm text-ink-soft">{body}</p>
    </div>
  );
}

type StorefrontDraft = {
  templateId: StorefrontTemplateId;
  heroHeadline: string;
  heroSubheadline: string;
  heroCtaLabel: string;
  aboutTitle: string;
  aboutBody: string;
  seoTitle: string;
  seoDescription: string;
  valueProps: { title: string; body: string }[];
};

const concreteTemplateOptions = STOREFRONT_TEMPLATE_OPTIONS.filter(
  (
    option,
  ): option is (typeof STOREFRONT_TEMPLATE_OPTIONS)[number] & {
    value: StorefrontTemplateId;
  } => option.value !== "ai_pick",
);

const FASHION_TEMPLATE_THUMBNAIL =
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80";

function TemplateMiniPreview({
  variant,
  brandColor,
}: {
  variant: "balanced" | "editorial" | "grid" | "lookbook" | "spark";
  brandColor: string;
}) {
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
}: {
  brandColor: string;
  selectedTemplateId: StorefrontTemplateId;
  onSelect: (templateId: StorefrontTemplateId) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {concreteTemplateOptions.map((option) => {
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

function getDraftFromStorefront(store: Store, storefront: StorefrontContent): StorefrontDraft {
  const chosenTemplate = store.storefront_template_id;
  const templateId =
    storefront.template?.id ??
    (chosenTemplate && chosenTemplate !== "ai_pick" ? chosenTemplate : "classic");

  return {
    templateId,
    heroHeadline: storefront.hero.headline,
    heroSubheadline: storefront.hero.subheadline,
    heroCtaLabel: storefront.hero.cta_label,
    aboutTitle: storefront.about.title,
    aboutBody: storefront.about.body,
    seoTitle: storefront.seo.title,
    seoDescription: storefront.seo.description,
    valueProps: storefront.value_props.slice(0, 3).map((valueProp) => ({ ...valueProp })),
  };
}

function getConcreteTemplateId(store: Store): StorefrontTemplateId {
  return store.storefront_template_id && store.storefront_template_id !== "ai_pick"
    ? store.storefront_template_id
    : "classic";
}

function createStarterStorefront(
  store: Store,
  selectedTemplateId = getConcreteTemplateId(store),
): StorefrontContent {
  const templateId = selectedTemplateId;
  const description =
    store.description || `Tell customers what makes ${store.business_name} special.`;

  return {
    template: {
      id: templateId,
      source: "merchant_selected",
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
}

function StorefrontCreationChoice({
  store,
  generating,
  saving,
  onGenerate,
  onStartEditing,
}: {
  store: Store;
  generating: boolean;
  saving: boolean;
  onGenerate: (templateId: StorefrontTemplateId) => void;
  onStartEditing: (templateId: StorefrontTemplateId) => void;
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<StorefrontTemplateId>(
    getConcreteTemplateId(store),
  );
  const selectedTemplate = concreteTemplateOptions.find(
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
          You have selected the template. Now choose whether AI should fill the page content, or
          start with an editable draft and write it yourself.
        </p>
      </div>

      <div className="mt-6">
        <TemplateGrid
          brandColor={store.brand_color}
          selectedTemplateId={selectedTemplateId}
          onSelect={setSelectedTemplateId}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => onGenerate(selectedTemplateId)}
          disabled={generating || saving}
          className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-left shadow-soft transition hover:border-primary disabled:opacity-60"
        >
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </div>
          <h3 className="mt-4 font-display text-lg font-semibold">Ask AI to generate content</h3>
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

function StorefrontEditor({
  store,
  storefront,
  saving,
  onSave,
}: {
  store: Store;
  storefront: StorefrontContent;
  saving: boolean;
  onSave: (updated: StorefrontContent, templateId: StorefrontTemplateId) => void;
}) {
  const [draft, setDraft] = useState(() => getDraftFromStorefront(store, storefront));

  useEffect(() => {
    setDraft(getDraftFromStorefront(store, storefront));
  }, [store, storefront]);

  function updateValueProp(
    index: number,
    field: keyof StorefrontDraft["valueProps"][number],
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      valueProps: current.valueProps.map((valueProp, valuePropIndex) =>
        valuePropIndex === index ? { ...valueProp, [field]: value } : valueProp,
      ),
    }));
  }

  function submit() {
    const updated: StorefrontContent = {
      ...storefront,
      template: {
        id: draft.templateId,
        source: "merchant_selected",
      },
      hero: {
        headline: draft.heroHeadline.trim(),
        subheadline: draft.heroSubheadline.trim(),
        cta_label: draft.heroCtaLabel.trim(),
      },
      about: {
        title: draft.aboutTitle.trim(),
        body: draft.aboutBody.trim(),
      },
      value_props: draft.valueProps.map((valueProp) => ({
        title: valueProp.title.trim(),
        body: valueProp.body.trim(),
      })),
      pages: storefront.pages
        ? {
            ...storefront.pages,
            about: {
              ...storefront.pages.about,
              title: draft.aboutTitle.trim(),
              body: draft.aboutBody.trim(),
              source: "merchant",
            },
          }
        : storefront.pages,
      seo: {
        title: draft.seoTitle.trim(),
        description: draft.seoDescription.trim(),
      },
    };

    onSave(updated, draft.templateId);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-ink-soft">
            <Pencil className="h-4 w-4 text-primary" /> Edit published website
          </div>
          <h2 className="mt-1 font-display text-xl font-bold">Storefront content</h2>
          <p className="mt-1 text-sm text-ink-soft">
            Changes are saved to the live storefront content, so merchants can edit after launch.
          </p>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saving ? "Saving..." : "Save live edits"}
        </button>
      </div>

      <div className="mt-6">
        <span className="mb-3 block text-sm font-medium">Template</span>
        <TemplateGrid
          brandColor={store.brand_color}
          selectedTemplateId={draft.templateId}
          onSelect={(templateId) => setDraft((current) => ({ ...current, templateId }))}
        />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">CTA label</span>
          <input
            value={draft.heroCtaLabel}
            onChange={(event) =>
              setDraft((current) => ({ ...current, heroCtaLabel: event.target.value }))
            }
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <label className="block lg:col-span-2">
          <span className="mb-1.5 block text-sm font-medium">Hero headline</span>
          <input
            value={draft.heroHeadline}
            onChange={(event) =>
              setDraft((current) => ({ ...current, heroHeadline: event.target.value }))
            }
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <label className="block lg:col-span-2">
          <span className="mb-1.5 block text-sm font-medium">Hero subheadline</span>
          <textarea
            value={draft.heroSubheadline}
            rows={3}
            onChange={(event) =>
              setDraft((current) => ({ ...current, heroSubheadline: event.target.value }))
            }
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">About title</span>
          <input
            value={draft.aboutTitle}
            onChange={(event) =>
              setDraft((current) => ({ ...current, aboutTitle: event.target.value }))
            }
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">SEO title</span>
          <input
            value={draft.seoTitle}
            onChange={(event) =>
              setDraft((current) => ({ ...current, seoTitle: event.target.value }))
            }
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <label className="block lg:col-span-2">
          <span className="mb-1.5 block text-sm font-medium">About body</span>
          <textarea
            value={draft.aboutBody}
            rows={4}
            onChange={(event) =>
              setDraft((current) => ({ ...current, aboutBody: event.target.value }))
            }
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <label className="block lg:col-span-2">
          <span className="mb-1.5 block text-sm font-medium">SEO description</span>
          <textarea
            value={draft.seoDescription}
            rows={2}
            onChange={(event) =>
              setDraft((current) => ({ ...current, seoDescription: event.target.value }))
            }
            className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
      </div>

      <div className="mt-6">
        <h3 className="font-display text-base font-semibold">Value propositions</h3>
        <div className="mt-3 grid gap-3">
          {draft.valueProps.map((valueProp, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-xl border border-border bg-background p-4 md:grid-cols-2"
            >
              <input
                value={valueProp.title}
                onChange={(event) => updateValueProp(index, "title", event.target.value)}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                aria-label={`Value proposition ${index + 1} title`}
              />
              <input
                value={valueProp.body}
                onChange={(event) => updateValueProp(index, "body", event.target.value)}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                aria-label={`Value proposition ${index + 1} body`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [previewOpen, setPreviewOpen] = useState(false);

  const storeQuery = useQuery({
    queryKey: ["store", "me"],
    queryFn: () => api.getMyStore(),
    enabled: !!user,
  });

  const store = storeQuery.data;

  useEffect(() => {
    if (storeQuery.isFetched && !storeQuery.data && user) {
      router.replace("/admin/onboarding");
    }
  }, [storeQuery.isFetched, storeQuery.data, user, router]);

  const storefrontQuery = useQuery({
    queryKey: ["storefront", store?.id],
    queryFn: () => api.getStorefront(store!.id),
    enabled: !!store,
  });

  const generate = useMutation({
    mutationFn: (storeId: string) => api.generateStorefront(storeId),
    onSuccess: (data) => {
      if (store) queryClient.setQueryData(["storefront", store.id], data);
      toast.success("Storefront generated!");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Generation failed"),
  });

  const saveStorefront = useMutation({
    mutationFn: ({
      storeId,
      storefront,
      templateId,
    }: {
      storeId: string;
      storefront: StorefrontContent;
      templateId: StorefrontTemplateId;
    }) =>
      api.updateStorefront(storeId, {
        storefront,
        storefront_template_id: templateId,
      }),
    onSuccess: (data) => {
      if (store) queryClient.setQueryData(["storefront", store.id], data);
      toast.success("Live storefront updated.");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save edits"),
  });

  const generatedStorefront = generate.data;
  const generateStorefront = generate.mutate;
  const generationPending = generate.isPending;

  if (storeQuery.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!store) return null;

  const storefront = storefrontQuery.data ?? generatedStorefront ?? null;
  const liveStoreUrl = getStorefrontUrl(store.slug);

  return (
    <div className="w-full px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
            Your store
          </span>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
            {store.business_name}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {store.subdomain_host ?? getStoreSubdomainHost(store.slug)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            disabled={!storefront}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-ink shadow-soft hover:bg-secondary disabled:opacity-60"
          >
            <Eye className="h-4 w-4" />
            Preview storefront
          </button>
          <a
            href={liveStoreUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-ink shadow-soft hover:bg-secondary"
          >
            <ExternalLink className="h-4 w-4" />
            View live store
          </a>
          <button
            onClick={() => generateStorefront(store.id)}
            disabled={generationPending}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-ink shadow-soft hover:bg-secondary disabled:opacity-60"
          >
            {generationPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
            {generationPending
              ? storefront
                ? "Regenerating..."
                : "Generating..."
              : storefront
                ? "Regenerate with AI"
                : "Generate with AI"}
          </button>
        </div>
      </div>

      {storefront ? (
        <section className="mt-8">
          <StorefrontEditor
            store={store}
            storefront={storefront}
            saving={saveStorefront.isPending}
            onSave={(updatedStorefront, templateId) =>
              saveStorefront.mutate({
                storeId: store.id,
                storefront: updatedStorefront,
                templateId,
              })
            }
          />
        </section>
      ) : null}

      {!storefront && !generationPending ? (
        <StorefrontCreationChoice
          store={store}
          generating={generationPending}
          saving={saveStorefront.isPending}
          onGenerate={(templateId) => generateStorefront(store.id, templateId)}
          onStartEditing={(templateId) =>
            saveStorefront.mutate({
              storeId: store.id,
              storefront: createStarterStorefront(store, templateId),
              templateId,
            })
          }
        />
      ) : generationPending && !storefront ? (
        <section className="mt-8">
          <GeneratingSkeleton />
        </section>
      ) : null}

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

      <section className="mt-12 grid gap-4 sm:grid-cols-3">
        <NextCard
          title="Add products"
          body="Upload your catalog so customers can browse and buy."
        />
        <NextCard
          title="Connect payments"
          body="Wire up Paystack or Flutterwave to start collecting orders."
        />
        <NextCard title="Set up delivery" body="Plug in a courier partner for shipping quotes." />
      </section>
    </div>
  );
}
