"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, ShoppingBag } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { storefrontApi } from "@/lib/api/storefront";
import { readMarketingAttribution } from "@/lib/storefront/marketing-attribution";

type FormState = {
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  message: string;
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

export function BizFestPartnersForm() {
  const [form, setForm] = useState<FormState>({
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const attribution = readMarketingAttribution();
      await storefrontApi.submitBizfestPartnerInquiry({
        inquiry_type: "partner",
        company_name: form.company_name.trim(),
        contact_name: form.contact_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
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
              Thanks for your interest in partnering with BizFest. Our team will review your partnership inquiry
              and follow up by email.
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
              BizFest 1.0 partners
            </p>
            <h1 className="font-modern-sans mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Partner with BizFest
            </h1>
            <p className="mt-2 max-w-xl text-sm text-ink-soft sm:text-base">
              Associations, media, accelerators, and community groups — help us reach more Nigerian SMEs going
              online. Looking to sponsor or book expo space?{" "}
              <Link href="/grants/sponsors" className="font-medium text-ink hover:text-primary">
                Use the sponsor form
              </Link>
              .
            </p>

            <form onSubmit={onSubmit} className="mt-8 space-y-5">
              <Field label="Organisation" required>
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
                hint="How you'd like to collaborate — distribution, events, content, member outreach, etc."
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

export function BizFestPartnersFormFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas text-sm text-ink-soft">
      Loading…
    </div>
  );
}
