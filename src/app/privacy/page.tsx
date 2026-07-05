import type { Metadata } from "next";
import Link from "next/link";
import { BizgridLogo } from "@/components/bizgrid-logo";
import { PLATFORM_PRIVACY_POLICY } from "@/lib/legal/platform-privacy-policy";

export const metadata: Metadata = {
  title: "Privacy Policy — Bizgrid",
  description:
    "Learn how Bizgrid collects, uses, and protects information when you use our merchant platform and website.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  const { title, lastUpdated, sections } = PLATFORM_PRIVACY_POLICY;

  return (
    <div className="landing-theme min-h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      <header className="border-b border-foreground/10 px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" className="flex items-center">
            <BizgridLogo size={32} showWordmark wordmarkClassName="text-xl font-black italic tracking-tighter" />
          </Link>
          <Link href="/" className="text-sm text-foreground/60 transition-colors hover:text-foreground">
            Back to home
          </Link>
        </div>
      </header>

      <main className="px-6 py-12">
        <article className="mx-auto max-w-3xl">
          <p className="font-mono text-[10px] uppercase tracking-widest text-foreground/60">Legal</p>
          <h1 className="mt-2 font-display text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-3 text-sm text-foreground/60">Last updated: {lastUpdated}</p>

          <div className="mt-10 space-y-10">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2 className="text-lg font-semibold tracking-tight">{section.heading}</h2>
                <div className="mt-3 space-y-3 whitespace-pre-line text-sm leading-7 text-foreground/70">
                  {section.body}
                </div>
              </section>
            ))}
          </div>
        </article>
      </main>

      <footer className="border-t border-foreground/10 px-6 py-8">
        <div className="mx-auto flex max-w-3xl items-center justify-between font-mono text-[10px] text-foreground/60">
          <span>© {new Date().getFullYear()} BIZGRID INC.</span>
          <Link href="/" className="transition-colors hover:text-foreground">
            bizgrid.shop
          </Link>
        </div>
      </footer>
    </div>
  );
}
