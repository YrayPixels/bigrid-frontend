"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BusinessProfileFields } from "@/components/admin/business-profile-fields";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api/client";
import { INDUSTRY_OPTIONS, type Industry } from "@/lib/api/types";
import {
  isBusinessProfileComplete,
  isValidStoreSlug,
  slugifyStore,
  type BusinessProfileInput,
} from "@/lib/business-profile";
import { STORE_PLATFORM_DOMAIN } from "@/lib/store-host";

const DEFAULT_BRAND_COLOR = "#0E7C66";

const EMPTY_PROFILE: BusinessProfileInput = {
  business_location: null,
  weekly_orders: null,
  payment_currencies: [],
  staff_count: null,
  physical_store_count: null,
};

export default function AdminOnboardingPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();

  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [storeSlug, setStoreSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [industry, setIndustry] = useState<Industry | null>(null);
  const [description, setDescription] = useState("");
  const [businessProfile, setBusinessProfile] = useState<BusinessProfileInput>(EMPTY_PROFILE);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    else if (!loading && user?.has_store) router.replace("/admin");
  }, [loading, user, router]);

  useEffect(() => {
    if (!slugTouched) {
      setStoreSlug(slugifyStore(businessName));
    }
  }, [businessName, slugTouched]);

  const steps = ["Business", "Operations", "Industry"];
  const onboardingShellWidth = "max-w-2xl";
  const canNext =
    (step === 0 &&
      businessName.trim().length > 1 &&
      isValidStoreSlug(storeSlug) &&
      description.trim().length > 9) ||
    (step === 1 && isBusinessProfileComplete(businessProfile)) ||
    (step === 2 && !!industry);

  async function submit() {
    if (!industry) {
      toast.error("Choose an industry to continue");
      return;
    }

    if (!isBusinessProfileComplete(businessProfile)) {
      toast.error("Complete your business profile to continue");
      return;
    }

    setSubmitting(true);
    try {
      await api.createStore({
        business_name: businessName.trim(),
        slug: storeSlug,
        industry,
        description: description.trim(),
        brand_color: DEFAULT_BRAND_COLOR,
        logo_url: null,
        business_location: businessProfile.business_location!,
        weekly_orders: businessProfile.weekly_orders!,
        payment_currencies: businessProfile.payment_currencies,
        staff_count: businessProfile.staff_count!,
        physical_store_count: businessProfile.physical_store_count!,
      });
      await refresh();
      toast.success("Store created. Let's build your website.");
      router.replace("/admin/builder?from=onboarding");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create store");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-canvas">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="relative min-h-full bg-canvas">
      <div className="absolute inset-x-0 top-0 h-72 bg-gradient-mesh opacity-60" />
      <div className="relative w-full px-6 py-8 lg:py-12">
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
          {step === 0 && (
            <div className="space-y-5">
              <header>
                <h1 className="font-display text-2xl font-bold">You&apos;re almost done!</h1>
                <p className="mt-1 text-sm text-ink-soft">Tell us a little bit about your business.</p>
              </header>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Business name <span className="text-destructive">*</span>
                </span>
                <input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Acme Coffee"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Store URL <span className="text-destructive">*</span>
                </span>
                <div className="flex overflow-hidden rounded-md border border-border bg-background shadow-soft focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                  <input
                    value={storeSlug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setStoreSlug(slugifyStore(e.target.value));
                    }}
                    placeholder="your-store"
                    className="min-w-0 flex-1 px-3 py-2 text-sm outline-none"
                  />
                  <span className="flex items-center border-l border-border bg-secondary/60 px-3 text-sm text-ink-soft">
                    .{STORE_PLATFORM_DOMAIN}
                  </span>
                </div>
                <span className="mt-1 block text-xs text-ink-soft">
                  Connect a custom domain later from Settings → Domains (Growth and Scale plans).
                </span>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium">
                  Short description <span className="text-destructive">*</span>
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="What do you sell? Who is it for? Where are you based?"
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <span className="mt-1 block text-xs text-ink-soft">
                  This helps set up your storefront profile. 1-3 sentences is plenty.
                </span>
              </label>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <header>
                <h1 className="font-display text-2xl font-bold">How does your business operate?</h1>
                <p className="mt-1 text-sm text-ink-soft">
                  This helps us tailor checkout, payouts, and growth recommendations.
                </p>
              </header>
              <BusinessProfileFields value={businessProfile} onChange={setBusinessProfile} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <header>
                <h1 className="font-display text-2xl font-bold">What industry are you in?</h1>
                <p className="mt-1 text-sm text-ink-soft">
                  Choose the closest category so your dashboard starts with the right defaults.
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
                      disabled={submitting}
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

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep((currentStep) => Math.max(0, currentStep - 1))}
              disabled={step === 0 || submitting}
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
                onClick={() => void submit()}
                disabled={!canNext || submitting}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary/90 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating store...
                  </>
                ) : (
                  <>
                    Create store <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
