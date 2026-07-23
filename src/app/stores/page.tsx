import type { Metadata } from "next";
import Link from "next/link";
import { BizgridLogo } from "@/components/bizgrid-logo";
import { storefrontApi } from "@/lib/api/storefront";
import { getStorefrontBaseUrl } from "@/lib/site-seo";

export const metadata: Metadata = {
  title: "Stores — Bizgrid",
  description: "Browse live storefronts built and published on Bizgrid.",
  alternates: { canonical: "/stores" },
  robots: { index: true, follow: true },
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
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight">Stores</h1>
          <p className="mt-2 text-ink-soft">
            Live merchant storefronts published on Bizgrid.
          </p>

          {stores.length === 0 ? (
            <p className="mt-10 text-sm text-ink-soft">No published stores yet.</p>
          ) : (
            <ul className="mt-10 divide-y divide-border border-y border-border">
              {stores.map((store) => {
                const href = getStorefrontBaseUrl(store.slug);
                return (
                  <li key={store.slug}>
                    <a
                      href={href}
                      className="flex items-baseline justify-between gap-4 py-4 transition-colors hover:text-primary"
                    >
                      <span className="font-medium">{store.business_name || store.slug}</span>
                      <span className="shrink-0 text-sm text-ink-soft">{store.slug}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
