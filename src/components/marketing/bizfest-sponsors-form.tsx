"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, ShoppingBag } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { storefrontApi } from "@/lib/api/storefront";
import {
  BIZFEST_EXHIBITION_SPACE_PACKAGES,
  BIZFEST_EXPO_BOOTH_PACKAGES,
  BIZFEST_SPONSOR_INTERESTS,
  BIZFEST_SPONSOR_TIERS,
  type BizfestSponsorInterest,
} from "@/lib/marketing/bizfest-signup";
import { readMarketingAttribution } from "@/lib/storefront/marketing-attribution";

type FormState = {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  interests: BizfestSponsorInterest[];
  tier_interest: string;
  booth_package: string;
  space_package: string;
  booth_quantity: string;
  message: string;
};

function parseDefaultInterests(focus: string | null): BizfestSponsorInterest[] {
  if (focus === "booth") return ["expo_booth"];
  if (focus === "space") return ["exhibition_space"];
  if (focus === "sponsorship") return ["sponsorship"];
  return ["sponsorship"];
}

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
  "min-h-[120px] w-full resize-y rounded-xl border border-border bg-canvas-raised px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

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

export function BizFestSponsorsForm() {
  const searchParams = useSearchParams();
  const defaultInterests = useMemo(
    () => parseDefaultInterests(searchParams.get("focus")),
    [searchParams],
  );

  const [form, setForm] = useState<FormState>({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    interests: defaultInterests,
    tier_interest: "",
    booth_package: "",
    space_package: "",
    booth_quantity: "1",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleInterest = (interest: BizfestSponsorInterest) => {
    setForm((prev) => {
      const has = prev.interests.includes(interest);
      const interests = has
        ? prev.interests.filter((item) => item !== interest)
        : [...prev.interests, interest];
      return { ...prev, interests };
    });
  };

  const wantsSponsorship = form.interests.includes("sponsorship");
  const wantsBooth = form.interests.includes("expo_booth");
  const wantsSpace = form.interests.includes("exhibition_space");

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.interests.length === 0) {
      setError("Select at least one sponsorship or expo option.");
      return;
    }

    setSubmitting(true);

    try {
      const attribution = readMarketingAttribution();
      await storefrontApi.submitBizfestPartnerInquiry({
        inquiry_type: "sponsor",
        company_name: form.company_name.trim(),
        contact_name: form.contact_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        interests: form.interests,
        tier_interest: wantsSponsorship && form.tier_interest ? form.tier_interest : undefined,
        booth_package: wantsBooth && form.booth_package ? form.booth_package : undefined,
        space_package: wantsSpace && form.space_package ? form.space_package : undefined,
        booth_quantity:
          wantsBooth && form.booth_quantity
            ? Math.min(50, Math.max(1, Number.parseInt(form.booth_quantity, 10) || 1))
            : undefined,
        message: form.message.trim() || undefined,
        ...attribution,
        programme: "bizfest-1",
      });
      setDone(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not submit inquiry.";
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
            <h1 className="font-modern-sans mt-4 text-2xl font-bold sm:text-3xl">Inquiry received</h1>
            <p className="mx-auto mt-3 max-w-md text-sm text-ink-soft sm:text-base">
              Thanks for your interest in sponsoring BizFest. Our team will follow up with package details,
              booth or space pricing, and next steps.
            </p>
            <Link
              href="/grants"
              className="mt-8 inline-flex h-11 items-center justify-center rounded-xl border border-border px-6 text-sm font-semibold text-ink"
            >
              Back to BizFest
            </Link>
          </div>
        ) : (
          <>
            <p className="font-modern-sans text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">
              BizFest 1.0 sponsors
            </p>
            <h1 className="font-modern-sans mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Sponsor BizFest
            </h1>
            <p className="mt-2 max-w-xl text-sm text-ink-soft sm:text-base">
              Fund the festival, book an expo booth, or reserve brand space at the BizFest Conference &amp;
              Expo. We&apos;ll send pricing and availability after you submit.
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-6">
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-ink">
                  What are you interested in?<span className="text-primary"> *</span>
                </legend>
                <p className="text-xs text-ink-soft">
                  Select all that apply — sponsorship packages, paid expo booths, or exhibition spaces.
                </p>
                <div className="space-y-2">
                  {BIZFEST_SPONSOR_INTERESTS.map((option) => {
                    const checked = form.interests.includes(option.value);
                    return (
                      <label
                        key={option.value}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                          checked
                            ? "border-primary bg-primary/5"
                            : "border-border bg-canvas-raised hover:border-primary/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                          checked={checked}
                          onChange={() => toggleInterest(option.value)}
                        />
                        <span className="text-sm font-medium text-ink">{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {wantsSponsorship ? (
                <Field label="Sponsorship tier interest" hint="Optional — we can tailor a package for you.">
                  <select
                    className={selectClass}
                    value={form.tier_interest}
                    onChange={(e) => update("tier_interest", e.target.value)}
                  >
                    <option value="">Select a tier (optional)</option>
                    {BIZFEST_SPONSOR_TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {tier}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}

              {wantsBooth ? (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Expo booth package" hint="We'll confirm pricing and availability.">
                    <select
                      className={selectClass}
                      value={form.booth_package}
                      onChange={(e) => update("booth_package", e.target.value)}
                    >
                      <option value="">Select booth type (optional)</option>
                      {BIZFEST_EXPO_BOOTH_PACKAGES.map((pkg) => (
                        <option key={pkg} value={pkg}>
                          {pkg}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Number of booths">
                    <input
                      type="number"
                      min={1}
                      max={50}
                      className={inputClass}
                      value={form.booth_quantity}
                      onChange={(e) => update("booth_quantity", e.target.value)}
                    />
                  </Field>
                </div>
              ) : null}

              {wantsSpace ? (
                <Field
                  label="Exhibition / brand space"
                  hint="Backdrop walls, demo zones, lounge areas, and other branded spaces."
                >
                  <select
                    className={selectClass}
                    value={form.space_package}
                    onChange={(e) => update("space_package", e.target.value)}
                  >
                    <option value="">Select space type (optional)</option>
                    {BIZFEST_EXHIBITION_SPACE_PACKAGES.map((pkg) => (
                      <option key={pkg} value={pkg}>
                        {pkg}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}

              <div className="border-t border-border pt-6">
                <p className="text-sm font-medium text-ink">Your details</p>
                <p className="mt-1 text-xs text-ink-soft">So we can send packages, floor plans, and invoices.</p>
              </div>

              <Field label="Company / organisation" required>
                <input
                  className={inputClass}
                  value={form.company_name}
                  onChange={(e) => update("company_name", e.target.value)}
                  required
                  maxLength={200}
                />
              </Field>

              <Field label="Contact name" required>
                <input
                  className={inputClass}
                  value={form.contact_name}
                  onChange={(e) => update("contact_name", e.target.value)}
                  required
                  maxLength={160}
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Email" required>
                  <input
                    type="email"
                    className={inputClass}
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    required
                  />
                </Field>
                <Field label="Phone" required>
                  <input
                    type="tel"
                    className={inputClass}
                    value={form.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    required
                    maxLength={40}
                  />
                </Field>
              </div>

              <Field
                label="Message"
                hint="Goals, preferred dates, products to showcase, or anything else we should know."
              >
                <textarea
                  className={textareaClass}
                  value={form.message}
                  onChange={(e) => update("message", e.target.value)}
                  maxLength={2000}
                />
              </Field>

              {error ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60 sm:w-auto sm:px-8"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    Submit inquiry
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}

export function BizFestSponsorsFormFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-ink-soft">
      Loading…
    </div>
  );
}
