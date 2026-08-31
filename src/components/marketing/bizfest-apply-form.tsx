"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, ShoppingBag } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { storefrontApi } from "@/lib/api/storefront";
import {
  BIZFEST_CATEGORIES,
  BIZFEST_HOW_HEARD,
  BIZFEST_SELL_CHANNELS,
  BIZFEST_SOCIAL_LINKS,
} from "@/lib/marketing/bizfest-signup";
import { readMarketingAttribution } from "@/lib/storefront/marketing-attribution";
import { trackPlatformEvent } from "@/lib/analytics/platform-events";

type FormState = {
  owner_name: string;
  business_name: string;
  email: string;
  phone: string;
  category: string;
  city: string;
  what_you_sell: string;
  sell_channels: string;
  unique_value: string;
  online_presence_url: string;
  how_heard: string;
  team_type: "solo" | "team" | "";
};

const INITIAL: FormState = {
  owner_name: "",
  business_name: "",
  email: "",
  phone: "",
  category: "",
  city: "",
  what_you_sell: "",
  sell_channels: "",
  unique_value: "",
  online_presence_url: "",
  how_heard: "",
  team_type: "",
};

function Field({
  label,
  required,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block text-left">
      <span className="text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-primary"> *</span> : null}
      </span>
      <div className="mt-1.5">{children}</div>
      {hint ? <p className="mt-1 text-xs text-ink-soft">{hint}</p> : null}
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-canvas-raised px-3.5 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const selectClass = inputClass;
const textareaClass =
  "min-h-[96px] w-full resize-y rounded-xl border border-border bg-canvas-raised px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function BrandChip({
  label,
  className,
  labelClassName,
}: {
  label: string;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <span className={className}>
      <ShoppingBag className="h-3.5 w-3.5 text-primary" aria-hidden strokeWidth={2.25} />
      <span className={labelClassName}>{label}</span>
      <ShoppingBag className="h-3.5 w-3.5 text-accent" aria-hidden strokeWidth={2.25} />
    </span>
  );
}

export function BizFestApplyForm() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [followedSocial, setFollowedSocial] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ hasStore: boolean } | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validateStep1 = () => {
    if (!form.owner_name.trim() || !form.business_name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError("Please fill in your name, business name, email, and phone.");
      return false;
    }
    if (!form.category || !form.city.trim()) {
      setError("Please select a category and enter your city.");
      return false;
    }
    setError(null);
    return true;
  };

  const onNext = () => {
    if (validateStep1()) setStep(2);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!form.what_you_sell.trim() || !form.sell_channels || !form.unique_value.trim()) {
      setError("Please complete the business details on this step.");
      return;
    }
    if (!form.how_heard || !form.team_type) {
      setError("Please tell us how you heard about BizFest and whether you're solo or a team.");
      return;
    }
    if (!followedSocial) {
      setError("Please follow Bizgrid on social media, then confirm below to continue.");
      return;
    }

    setSubmitting(true);
    setError(null);
    trackPlatformEvent("bizfest_apply_clicked", { source: "footer", once: false });

    try {
      const attribution = readMarketingAttribution();
      const result = await storefrontApi.submitBizfestApplication({
        owner_name: form.owner_name.trim(),
        business_name: form.business_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        category: form.category,
        city: form.city.trim(),
        what_you_sell: form.what_you_sell.trim(),
        sell_channels: form.sell_channels,
        unique_value: form.unique_value.trim(),
        online_presence_url: form.online_presence_url.trim() || undefined,
        how_heard: form.how_heard,
        team_type: form.team_type as "solo" | "team",
        followed_social: true,
        ...attribution,
        programme: "bizfest-1",
      });
      setDone({ hasStore: Boolean(result.data?.has_store) });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not submit application.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas font-sans text-ink selection:bg-primary/20">
      <header className="border-b border-border bg-canvas-raised/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/grants" className="flex items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink">
            <ArrowLeft className="h-4 w-4" />
            Back to BizFest
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/grants"
              className="font-modern-sans flex items-center gap-2 text-sm font-bold tracking-tight text-ink"
            >
              <BrandChip
                label="BizFest 1.0"
                className="inline-flex items-center gap-1.5"
                labelClassName="tracking-tight"
              />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        {done ? (
          <div className="rounded-2xl border border-border bg-canvas-raised p-8 text-center shadow-soft sm:p-12">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <h1 className="font-modern-sans mt-4 text-2xl font-bold sm:text-3xl">Application received</h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-ink-soft sm:text-base">
              Thanks for applying to BizFest. We&apos;ll review your application and follow up by email.
              {done.hasStore
                ? " We also matched an existing Bizgrid store to your email."
                : " Next, create your free Bizgrid store so you can activate and compete."}
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              {!done.hasStore ? (
                <Link
                  href="/signup?from=bizfest"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground"
                >
                  Create your Bizgrid store
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
              <Link
                href="/grants"
                className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-6 text-sm font-semibold text-ink"
              >
                Back to BizFest
              </Link>
            </div>
            <div className="mx-auto mt-10 max-w-sm border-t border-border pt-8">
              <p className="text-sm font-medium text-ink">Stay close to BizFest updates</p>
              <p className="mt-1 text-xs text-ink-soft">Follow Bizgrid for tips, deadlines, and announcements.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {BIZFEST_SOCIAL_LINKS.map((link) => (
                  <a
                    key={link.id}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="font-modern-sans text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">
              BizFest 1.0 application
            </p>
            <h1 className="font-modern-sans mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Apply to participate
            </h1>
            <p className="mt-2 max-w-xl text-sm text-ink-soft sm:text-base">
              Tell us about your business. Please provide accurate details — free to apply.
            </p>

            <div className="mt-6 flex gap-2">
              <span
                className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-primary" : "bg-border"}`}
              />
              <span
                className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-primary" : "bg-border"}`}
              />
            </div>
            <p className="mt-2 text-xs text-ink-soft">Step {step} of 2</p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              {step === 1 ? (
                <>
                  <Field label="Your full name" required>
                    <input
                      className={inputClass}
                      value={form.owner_name}
                      onChange={(e) => update("owner_name", e.target.value)}
                      placeholder="Adaobi Okeke"
                      required
                    />
                  </Field>
                  <Field label="Business name" required>
                    <input
                      className={inputClass}
                      value={form.business_name}
                      onChange={(e) => update("business_name", e.target.value)}
                      placeholder="Ada Fashion"
                      required
                    />
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Email address" required>
                      <input
                        type="email"
                        className={inputClass}
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        placeholder="you@email.com"
                        required
                      />
                    </Field>
                    <Field label="Phone number" required>
                      <input
                        className={inputClass}
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        placeholder="08012345678"
                        required
                      />
                    </Field>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Business category" required>
                      <select
                        className={selectClass}
                        value={form.category}
                        onChange={(e) => update("category", e.target.value)}
                        required
                      >
                        <option value="">Select category</option>
                        {BIZFEST_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="City" required>
                      <input
                        className={inputClass}
                        value={form.city}
                        onChange={(e) => update("city", e.target.value)}
                        placeholder="Lagos"
                        required
                      />
                    </Field>
                  </div>
                  <button
                    type="button"
                    onClick={onNext}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground sm:w-auto"
                  >
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <>
                  <Field label="What do you sell?" required hint="Brief summary of your products or services">
                    <textarea
                      className={textareaClass}
                      value={form.what_you_sell}
                      onChange={(e) => update("what_you_sell", e.target.value)}
                      placeholder="Ready-to-wear dresses and accessories for young women…"
                      required
                    />
                  </Field>
                  <Field label="How do you sell today?" required>
                    <select
                      className={selectClass}
                      value={form.sell_channels}
                      onChange={(e) => update("sell_channels", e.target.value)}
                      required
                    >
                      <option value="">Select channel</option>
                      {BIZFEST_SELL_CHANNELS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label="What makes your business unique?"
                    required
                    hint="Your unique value — why customers choose you"
                  >
                    <textarea
                      className={textareaClass}
                      value={form.unique_value}
                      onChange={(e) => update("unique_value", e.target.value)}
                      placeholder="Custom fits, fast Lagos delivery, and quality fabrics…"
                      required
                    />
                  </Field>
                  <Field label="Instagram, WhatsApp, or website link" hint="Optional">
                    <input
                      type="url"
                      className={inputClass}
                      value={form.online_presence_url}
                      onChange={(e) => update("online_presence_url", e.target.value)}
                      placeholder="https://instagram.com/yourshop"
                    />
                  </Field>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="How did you hear about BizFest?" required>
                      <select
                        className={selectClass}
                        value={form.how_heard}
                        onChange={(e) => update("how_heard", e.target.value)}
                        required
                      >
                        <option value="">Select option</option>
                        {BIZFEST_HOW_HEARD.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Applying as" required>
                      <select
                        className={selectClass}
                        value={form.team_type}
                        onChange={(e) => update("team_type", e.target.value as FormState["team_type"])}
                        required
                      >
                        <option value="">Select option</option>
                        <option value="solo">Individual / solo founder</option>
                        <option value="team">With a team / staff</option>
                      </select>
                    </Field>
                  </div>

                  <div className="rounded-2xl border border-border bg-canvas px-4 py-4 sm:px-5">
                    <p className="text-sm font-semibold text-ink">Follow Bizgrid on social</p>
                    <p className="mt-1 text-xs text-ink-soft">
                      Stay updated on BizFest deadlines, tips, and announcements.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {BIZFEST_SOCIAL_LINKS.map((link) => (
                        <a
                          key={link.id}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-canvas-raised px-4 text-sm font-semibold text-ink transition hover:border-primary hover:text-primary"
                        >
                          Follow on {link.label}
                        </a>
                      ))}
                    </div>
                    <label className="mt-4 flex cursor-pointer items-start gap-3 text-left text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={followedSocial}
                        onChange={(e) => setFollowedSocial(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        required
                      />
                      <span>
                        I follow Bizgrid on Instagram, TikTok, X, and LinkedIn{" "}
                        <span className="text-primary">*</span>
                      </span>
                    </label>
                  </div>

                  <p className="text-xs leading-relaxed text-ink-soft">
                    By clicking Submit, you agree to receive communications about BizFest and updates
                    from Bizgrid. You may opt out at any time.
                  </p>

                  {error ? (
                    <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                      {error}
                    </p>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setStep(1);
                      }}
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-6 text-sm font-semibold text-ink"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground disabled:opacity-60 sm:flex-none"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting…
                        </>
                      ) : (
                        <>
                          Submit application
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {step === 1 && error ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </form>
          </>
        )}
      </main>
    </div>
  );
}
