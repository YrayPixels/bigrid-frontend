"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "storehaus-builder-onboarding-handoff-dismissed";

const STEPS = [
  { label: "Pick a look", href: null as string | null },
  { label: "Add products", href: "/admin/products" },
  { label: "Publish", href: "/admin/website" },
] as const;

export function BuilderOnboardingHandoff({
  storeName,
  onBuildWebsite,
  onBrowseLooks,
}: {
  storeName?: string | null;
  onBuildWebsite?: () => void;
  onBrowseLooks?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromOnboarding = searchParams.get("from") === "onboarding";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!fromOnboarding) {
      setVisible(false);
      return;
    }
    if (window.sessionStorage.getItem(STORAGE_KEY) === "1") {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, [fromOnboarding]);

  function dismiss() {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    }
    setVisible(false);
    if (fromOnboarding) {
      router.replace("/admin/builder");
    }
  }

  if (!visible) return null;

  return (
    <div className="rounded-2xl border border-primary/25 bg-primary/5 px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">
            {storeName ? `${storeName} is ready to design` : "Your store is ready to design"}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            We loaded your business details. Pick a look below, or let AI build a first draft.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md p-1 text-ink-soft transition hover:bg-secondary hover:text-ink"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ol className="mt-4 flex flex-wrap items-center gap-2">
        {STEPS.map((step, index) => (
          <li key={step.label} className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-ink">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-[10px] font-semibold text-background">
                {index + 1}
              </span>
              {step.href ? (
                <Link href={step.href} className="hover:underline">
                  {step.label}
                </Link>
              ) : (
                step.label
              )}
            </span>
            {index < STEPS.length - 1 ? <ArrowRight className="h-3.5 w-3.5 text-ink-soft" /> : null}
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => {
            onBrowseLooks?.();
            document.querySelector<HTMLElement>("[data-builder-templates]")?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }}
        >
          Browse looks
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => {
            dismiss();
            onBuildWebsite?.();
          }}
        >
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
          Build my website
        </Button>
        <Button type="button" size="sm" variant="outline" asChild>
          <Link href="/admin/products">Skip to products</Link>
        </Button>
      </div>
    </div>
  );
}
