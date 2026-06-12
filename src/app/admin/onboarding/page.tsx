"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, Store as StoreIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api/client";
import {
  INDUSTRY_OPTIONS,
  STOREFRONT_TEMPLATE_OPTIONS,
  type Industry,
  type StorefrontTemplateRecommendation,
  type StorefrontTemplateId,
  type StorefrontTemplateOption,
  type StorefrontTemplatePreview,
} from "@/lib/api/types";

type ConcreteTemplateOption = StorefrontTemplateOption & { value: StorefrontTemplateId };

function getConcreteTemplateOptions(options: StorefrontTemplateOption[]): ConcreteTemplateOption[] {
  return options.filter((option): option is ConcreteTemplateOption => option.value !== "ai_pick");
}

const BRAND_COLORS = ["#0E7C66", "#1F6FEB", "#D97706", "#DB2777", "#7C3AED", "#0F172A"];
const FASHION_TEMPLATE_THUMBNAIL =
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80";

function TemplateMiniPreview({
  variant,
  brandColor,
}: {
  variant: StorefrontTemplatePreview;
  brandColor: string;
}) {
  if (variant === "spark") {
    return (
      <div className="h-24 overflow-hidden rounded-lg border border-border bg-background p-3">
        <div className="flex h-full items-center justify-center rounded-md bg-secondary">
          <Sparkles className="h-6 w-6" style={{ color: brandColor }} />
        </div>
      </div>
    );
  }

  if (variant === "editorial") {
    return (
      <div className="h-24 overflow-hidden rounded-lg border border-border bg-background p-3 text-center">
        <div className="mx-auto h-2 w-10 rounded-full" style={{ backgroundColor: brandColor }} />
        <div className="mx-auto mt-3 h-3 w-24 rounded bg-secondary" />
        <div className="mx-auto mt-2 h-2 w-32 rounded bg-secondary" />
        <div className="mt-4 flex justify-center gap-2">
          <div className="h-8 w-8 rounded-full" style={{ backgroundColor: `${brandColor}33` }} />
          <div className="h-8 w-8 rounded-full" style={{ backgroundColor: `${brandColor}22` }} />
          <div className="h-8 w-8 rounded-full" style={{ backgroundColor: `${brandColor}33` }} />
        </div>
      </div>
    );
  }

  if (variant === "grid") {
    return (
      <div className="h-24 overflow-hidden rounded-lg border border-border bg-background p-3">
        <div className="h-3 w-20 rounded" style={{ backgroundColor: brandColor }} />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-6 rounded bg-secondary" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "lookbook") {
    return (
      <div className="h-24 overflow-hidden rounded-lg border border-border bg-background p-2">
        <div className="grid h-full grid-rows-[0.2fr_1fr_0.28fr] gap-1">
          <div className="h-2 rounded-sm bg-ink" />
          <div className="relative overflow-hidden rounded-md bg-[#a7aaa5]">
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

  return (
    <div className="h-24 overflow-hidden rounded-lg border border-border bg-background p-3">
      <div className="h-3 w-20 rounded" style={{ backgroundColor: brandColor }} />
      <div className="mt-3 h-3 w-28 rounded bg-secondary" />
      <div className="mt-2 h-2 w-36 rounded bg-secondary" />
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="h-6 rounded bg-secondary" />
        <div className="h-6 rounded bg-secondary" />
        <div className="h-6 rounded bg-secondary" />
      </div>
    </div>
  );
}

export default function AdminOnboardingPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();

  const [step, setStep] = useState(0);
  const [storefrontTemplateId, setStorefrontTemplateId] = useState<StorefrontTemplateId>("classic");
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState<Industry>("food_and_beverage");
  const [description, setDescription] = useState("");
  const [brandColor, setBrandColor] = useState(BRAND_COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [templateOptions, setTemplateOptions] = useState<ConcreteTemplateOption[]>(
    getConcreteTemplateOptions(STOREFRONT_TEMPLATE_OPTIONS),
  );
  const [templateRecommendations, setTemplateRecommendations] = useState<
    StorefrontTemplateRecommendation[]
  >([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    else if (!loading && user?.has_store) router.replace("/admin");
  }, [loading, user, router]);

  useEffect(() => {
    api
      .getStorefrontTemplates()
      .then((options) => {
        const concreteOptions = getConcreteTemplateOptions(options);
        setTemplateOptions(concreteOptions);
        setStorefrontTemplateId((currentTemplateId) =>
          concreteOptions.some((option) => option.value === currentTemplateId)
            ? currentTemplateId
            : (concreteOptions[0]?.value ?? "classic"),
        );
      })
      .catch(() => {
        setTemplateOptions(getConcreteTemplateOptions(STOREFRONT_TEMPLATE_OPTIONS));
      });
  }, []);

  useEffect(() => {
    if (step !== 2) return;

    let cancelled = false;
    setRecommendationsLoading(true);
    api
      .recommendStorefrontTemplates({
        prompt: `${businessName} ${description}`.trim(),
        industry,
        limit: 4,
      })
      .then((recommendations) => {
        if (cancelled) return;
        setTemplateRecommendations(recommendations);
        const firstRecommended = recommendations[0]?.template_id;
        if (firstRecommended) {
          setStorefrontTemplateId(firstRecommended);
        }
      })
      .catch(() => {
        if (!cancelled) setTemplateRecommendations([]);
      })
      .finally(() => {
        if (!cancelled) setRecommendationsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [businessName, description, industry, step]);

  const recommendationByTemplate = useMemo(
    () =>
      new Map(
        templateRecommendations.map((recommendation) => [
          recommendation.template_id,
          recommendation,
        ]),
      ),
    [templateRecommendations],
  );
  const recommendedTemplateOptions = useMemo(() => {
    if (!templateRecommendations.length) return templateOptions;
    const optionById = new Map(templateOptions.map((option) => [option.value, option]));
    const recommendedOptions = templateRecommendations
      .map((recommendation) => optionById.get(recommendation.template_id))
      .filter((option): option is ConcreteTemplateOption => Boolean(option));
    const remainingOptions = templateOptions.filter(
      (option) => !recommendationByTemplate.has(option.value),
    );

    return [...recommendedOptions, ...remainingOptions];
  }, [recommendationByTemplate, templateOptions, templateRecommendations]);

  const steps = ["Business", "Industry", "Template", "Brand"];
  const onboardingShellWidth = step === 2 ? "max-w-5xl" : "max-w-2xl";
  const canNext =
    (step === 0 && businessName.trim().length > 1 && description.trim().length > 9) ||
    (step === 1 && !!industry) ||
    (step === 2 && !!storefrontTemplateId) ||
    step === 3;

  async function submit() {
    setSubmitting(true);
    try {
      const store = await api.createStore({
        business_name: businessName.trim(),
        industry,
        description: description.trim(),
        brand_color: brandColor,
        logo_url: null,
        storefront_template_id: storefrontTemplateId,
      });
      await refresh();
      toast.success("Store created. Opening your builder...");
      router.replace("/admin/builder");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create store");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <div className="absolute inset-x-0 top-0 h-72 bg-gradient-mesh opacity-60" />
      <div className="relative w-full px-6 py-12 lg:py-16">
        <div
          className={`mx-auto mb-8 flex w-full flex-wrap items-center justify-between gap-3 ${onboardingShellWidth}`}
        >
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-hero text-primary-foreground">
              <StoreIcon className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">Storehaus</span>
          </div>
          <button
            type="button"
            onClick={() => router.push("/admin/builder")}
            className="text-sm font-medium text-primary hover:underline"
          >
            Prefer chat? Try the AI builder
          </button>
        </div>

        <ol
          className={`mx-auto mb-8 flex w-full items-center gap-3 overflow-x-auto pb-1 text-sm ${onboardingShellWidth}`}
        >
          {steps.map((label, index) => (
            <li key={label} className="flex items-center gap-3">
              <span
                className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${
                  index < step
                    ? "bg-primary text-primary-foreground"
                    : index === step
                      ? "bg-ink text-background"
                      : "bg-secondary text-ink-soft"
                }`}
              >
                {index < step ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <span className={index === step ? "font-medium text-ink" : "text-ink-soft"}>
                {label}
              </span>
              {index < steps.length - 1 && <span className="ml-1 h-px w-8 bg-border" />}
            </li>
          ))}
        </ol>

        <div
          className={`mx-auto w-full rounded-2xl border border-border bg-card p-8 shadow-elevated ${onboardingShellWidth}`}
        >
          {step === 2 && (
            <div className="space-y-5">
              <header>
                <h1 className="font-display text-2xl font-bold">Choose a recommended template</h1>
                <p className="mt-1 text-sm text-ink-soft">
                  We ranked these options using your business description and industry. You can
                  still choose any active template.
                </p>
              </header>
              {recommendationsLoading ? (
                <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-ink-soft">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Ranking templates...
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {recommendedTemplateOptions.map((option) => {
                  const active = storefrontTemplateId === option.value;
                  const recommendation = recommendationByTemplate.get(option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStorefrontTemplateId(option.value)}
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
                            {recommendation
                              ? `${Math.round(recommendation.score * 100)}% fit`
                              : option.bestFor}
                          </span>
                        </div>
                        <p className="mt-2 text-sm">{option.description}</p>
                        {recommendation ? (
                          <p className="mt-2 rounded-lg bg-primary/5 p-2 text-xs leading-5 text-ink-soft">
                            {recommendation.reason}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 0 && (
            <div className="space-y-5">
              <header>
                <h1 className="font-display text-2xl font-bold">Tell us about your business</h1>
                <p className="mt-1 text-sm text-ink-soft">
                  This becomes the name and tone of your storefront.
                </p>
              </header>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Business name</span>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Acme Coffee"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">Short description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="What do you sell? Who is it for? Where are you based?"
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <span className="mt-1 block text-xs text-ink-soft">
                  This helps us suggest a layout and starter storefront details. 1-3 sentences is plenty.
                </span>
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <header>
                <h1 className="font-display text-2xl font-bold">What industry are you in?</h1>
                <p className="mt-1 text-sm text-ink-soft">
                  We tailor the layout and copy to your category.
                </p>
              </header>
              <div className="grid grid-cols-2 gap-3">
                {INDUSTRY_OPTIONS.map((option) => {
                  const active = industry === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setIndustry(option.value)}
                      className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
                        active
                          ? "border-primary bg-primary/5 text-ink shadow-soft"
                          : "border-border bg-background text-ink-soft hover:border-ink/30 hover:text-ink"
                      }`}
                    >
                      <span className="font-medium">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <header>
                <h1 className="font-display text-2xl font-bold">Pick a brand color</h1>
                <p className="mt-1 text-sm text-ink-soft">
                  Used as the accent across your storefront.
                </p>
              </header>
              <div className="flex flex-wrap gap-3">
                {BRAND_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setBrandColor(color)}
                    aria-label={`Brand color ${color}`}
                    className={`h-12 w-12 rounded-full border-2 transition ${
                      brandColor === color ? "scale-110 border-ink" : "border-transparent"
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              <div className="mt-6 rounded-lg border border-border bg-background p-4">
                <span className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-ink-soft">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Preview
                </span>
                <div className="mt-3 rounded-md p-4" style={{ backgroundColor: `${brandColor}14` }}>
                  <div className="font-display text-lg font-bold" style={{ color: brandColor }}>
                    {businessName || "Your business"}
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">
                    {description || "Your storefront copy will appear here."}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((currentStep) => Math.max(0, currentStep - 1))}
              disabled={step === 0}
              className="inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium text-ink-soft hover:text-ink disabled:invisible"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep((currentStep) => currentStep + 1)}
                disabled={!canNext}
                className="inline-flex items-center gap-1 rounded-md bg-ink px-4 py-2 text-sm font-semibold text-background hover:bg-ink/90 disabled:opacity-50"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {submitting ? "Creating store..." : "Create my storefront"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
