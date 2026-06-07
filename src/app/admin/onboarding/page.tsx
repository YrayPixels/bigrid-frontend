"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, Store as StoreIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api/client";
import {
  INDUSTRY_OPTIONS,
  STOREFRONT_TEMPLATE_OPTIONS,
  type Industry,
  type StorefrontTemplateId,
} from "@/lib/api/types";

const BRAND_COLORS = ["#0E7C66", "#1F6FEB", "#D97706", "#DB2777", "#7C3AED", "#0F172A"];
const FASHION_TEMPLATE_THUMBNAIL =
  "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=600&q=80";

function TemplateMiniPreview({
  variant,
  brandColor,
}: {
  variant: "balanced" | "editorial" | "grid" | "lookbook" | "spark";
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

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    else if (!loading && user?.has_store) router.replace("/admin");
  }, [loading, user, router]);

  const templateOptions = STOREFRONT_TEMPLATE_OPTIONS.filter(
    (
      option,
    ): option is (typeof STOREFRONT_TEMPLATE_OPTIONS)[number] & {
      value: StorefrontTemplateId;
    } => option.value !== "ai_pick",
  );
  const steps = ["Template", "Business", "Industry", "Brand"];
  const canNext =
    (step === 0 && !!storefrontTemplateId) ||
    (step === 1 && businessName.trim().length > 1 && description.trim().length > 9) ||
    (step === 2 && !!industry) ||
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
      toast.success("Store created. Choose how to add your content.");
      router.replace(`/admin?setup=content&fresh=${store.id}`);
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
      <div className="relative w-full px-6 py-12">
        <div className="mb-8 flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-hero text-primary-foreground">
            <StoreIcon className="h-4 w-4" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">Storehaus</span>
        </div>

        <ol className="mb-8 flex items-center gap-3 text-sm">
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

        <div className="rounded-2xl border border-border bg-card p-8 shadow-elevated">
          {step === 0 && (
            <div className="space-y-5">
              <header>
                <h1 className="font-display text-2xl font-bold">Choose a storefront template</h1>
                <p className="mt-1 text-sm text-ink-soft">
                  Start with a layout. Next, you can ask AI to fill it or edit it yourself.
                </p>
              </header>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {templateOptions.map((option) => {
                  const active = storefrontTemplateId === option.value;
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
                            {option.bestFor}
                          </span>
                        </div>
                        <p className="mt-2 text-sm">{option.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 1 && (
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
                  The AI uses this to write your hero, about page, and SEO. 1-3 sentences is plenty.
                </span>
              </label>
            </div>
          )}

          {step === 2 && (
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
                {submitting ? "Creating store..." : "Generate my storefront"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
