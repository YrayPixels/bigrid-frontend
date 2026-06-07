"use client";

import { useStorefront } from "@/lib/storefront/store-context";

export default function FaqPage() {
  const { storefront } = useStorefront();
  const page = storefront.pages?.faq;

  return (
    <div className="w-full px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-bold tracking-tight">
        {page?.title ?? "Frequently asked questions"}
      </h1>
      <div className="mt-8 space-y-4">
        {(page?.items ?? []).map((item) => (
          <details key={item.question} className="rounded-2xl border border-border bg-card p-5">
            <summary className="cursor-pointer font-semibold">{item.question}</summary>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
