import type { Metadata } from "next";
import { headers } from "next/headers";
import CheckoutPageClient from "./page.client";
import { getSitemapBaseUrl } from "@/lib/site-seo";
import { loadStorefront } from "@/lib/storefront/load-storefront";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const host = (await headers()).get("host");
  const baseUrl = getSitemapBaseUrl(host);

  try {
    const data = await loadStorefront(slug);
    const storeName = data.store.business_name || slug;
    const title = `${storeName} — Checkout`;
    const description = `Checkout securely with ${storeName}.`;
    return {
      metadataBase: new URL(baseUrl),
      title,
      description,
      alternates: { canonical: "./" },
      robots: { index: false, follow: false },
    };
  } catch {
    return {
      metadataBase: new URL(baseUrl),
      title: `${slug} — Checkout`,
      description: "Checkout.",
      alternates: { canonical: "./" },
      robots: { index: false, follow: false },
    };
  }
}

export default function CheckoutPage() {
  return <CheckoutPageClient />;
}
