"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Store as StoreIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api/client";
import { INDUSTRY_OPTIONS, type Industry } from "@/lib/api/types";

const DEFAULT_BRAND_COLOR = "#0E7C66";

export default function AdminOnboardingPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();

  const [step, setStep] = useState(0);
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState<Industry | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    else if (!loading && user?.has_store) router.replace("/admin");
  }, [loading, user, router]);

  const steps = ["Business", "Industry"];
  const onboardingShellWidth = "max-w-2xl";
  const canNext =
    (step === 0 && businessName.trim().length > 1 && description.trim().length > 9) ||
    (step === 1 && !!industry);

  async function submit(selectedIndustry: Industry | null = industry) {
    if (!selectedIndustry) {
      toast.error("Choose an industry to continue");
      return;
    }

    setSubmitting(true);
    try {
      await api.createStore({
        business_name: businessName.trim(),
        industry: selectedIndustry,
        description: description.trim(),
        brand_color: DEFAULT_BRAND_COLOR,
        logo_url: null,
      });
      await refresh();
      toast.success("Store created. Opening your dashboard...");
      router.replace("/admin");
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
        <div className={`mx-auto mb-8 flex w-full items-center gap-2 ${onboardingShellWidth}`}>
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-hero text-primary-foreground">
              <StoreIcon className="h-4 w-4" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">Storehaus</span>
          </div>
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
                  This helps set up your storefront profile. 1-3 sentences is plenty.
                </span>
              </label>
            </div>
          )}

          {step === 1 && (
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
                      onClick={() => {
                        setIndustry(option.value);
                        void submit(option.value);
                      }}
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
            ) : submitting ? (
              <span className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-soft">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating store...
              </span>
            ) : (
              <span className="text-sm text-ink-soft">Select an industry to finish setup.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
