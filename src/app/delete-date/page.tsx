import type { Metadata } from "next";
import Link from "next/link";
import { BizgridLogo } from "@/components/bizgrid-logo";
import { DELETE_DATA_PAGE } from "@/lib/legal/delete-data";

export const metadata: Metadata = {
  title: "Delete your data — Bizgrid",
  description:
    "Request deletion of personal information Bizgrid holds about your merchant account, shopper profile, or order history.",
  alternates: { canonical: "/delete-date" },
  robots: { index: true, follow: true },
};

export default function DeleteDatePage() {
  const { title, lastUpdated, contactEmail, sections } = DELETE_DATA_PAGE;
  const mailto = `mailto:${contactEmail}?subject=${encodeURIComponent("Data deletion request")}`;

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans selection:bg-primary/20">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="flex items-center">
            <BizgridLogo size={32} showWordmark wordmarkClassName="text-xl font-bold tracking-tight" />
          </Link>
          <Link href="/" className="text-sm text-ink-soft transition-colors hover:text-ink">
            Back to home
          </Link>
        </div>
      </header>

      <main className="px-6 py-12">
        <article className="mx-auto max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-widest text-ink-soft">Privacy</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-3 text-sm text-ink-soft">Last updated: {lastUpdated}</p>

          <div className="mt-8 rounded-2xl border border-border bg-canvas-raised p-6">
            <p className="text-sm leading-7 text-ink-soft">
              Ready to submit a request? Email us and we will guide you through verification.
            </p>
            <a
              href={mailto}
              className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-soft transition hover:opacity-90"
            >
              Request data deletion
            </a>
          </div>

          <div className="mt-10 space-y-10">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-lg font-semibold tracking-tight">{section.heading}</h2>
                <div className="mt-3 space-y-3 whitespace-pre-line text-sm leading-7 text-ink-soft">
                  {section.body}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-12 text-sm text-ink-soft">
            Also see our{" "}
            <Link href="/privacy" className="font-medium text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </article>
      </main>

      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between font-mono text-[10px] text-ink-soft">
          <span>© {new Date().getFullYear()} BIZGRID INC.</span>
          <Link href="/" className="transition-colors hover:text-primary">
            bizgrid.shop
          </Link>
        </div>
      </footer>
    </div>
  );
}
