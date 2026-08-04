import type { Metadata } from "next";
import Link from "next/link";
import { StoreDirectoryCard } from "@/components/marketing/store-directory-card";
import { MarketingChrome } from "@/components/seo/marketing-chrome";
import { storefrontApi } from "@/lib/api/storefront";

export const metadata: Metadata = {
  title: "Browse Live Stores Built on Bizgrid",
  description:
    "Explore published merchant storefronts on Bizgrid — fashion, beauty, food, and more across Africa.",
  alternates: { canonical: "/stores" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Browse Live Stores Built on Bizgrid",
    description:
      "Explore published merchant storefronts on Bizgrid — fashion, beauty, food, and more across Africa.",
    url: "/stores",
  },
};

export const revalidate = 60;

export default async function StoresDirectoryPage() {
  let stores: Awaited<ReturnType<typeof storefrontApi.listPublished>> = [];
  try {
    stores = await storefrontApi.listPublished();
  } catch {
    stores = [];
  }

  return (
    <MarketingChrome currentPath="/stores">
      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.07] via-transparent to-accent/10" />
          <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-20">
            <p className="font-mono text-[10px] font-bold tracking-widest text-primary uppercase">
              Live on Bizgrid
            </p>
            <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold tracking-tight md:text-5xl">
              Stores
            </h1>
            <p className="mt-4 max-w-xl text-lg text-ink-soft">
              Real merchant storefronts published on Bizgrid — browse banners, brands, and industries,
              then open any shop.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-14 md:py-16">
          {stores.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-canvas-raised px-6 py-16 text-center">
              <p className="font-display text-xl font-semibold">No published stores yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
                Be the first to launch — build a storefront with AI and publish when you&apos;re ready.
              </p>
              <Link
                href="/signup"
                className="mt-6 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Start free
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8 flex items-end justify-between gap-4">
                <p className="text-sm text-ink-soft">
                  {stores.length} live {stores.length === 1 ? "store" : "stores"}
                </p>
              </div>
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {stores.map((store) => (
                  <li key={store.slug}>
                    <StoreDirectoryCard store={store} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </main>
    </MarketingChrome>
  );
}
