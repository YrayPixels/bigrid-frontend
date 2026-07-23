import type { Metadata } from "next";
import TrackOrderPageClient from "./page.client";
import { getStorefrontBaseUrl } from "@/lib/site-seo";
import { loadStorefront } from "@/lib/storefront/load-storefront";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = getStorefrontBaseUrl(slug);

  try {
    const data = await loadStorefront(slug);
    const storeName = data.store.business_name || slug;
    return {
      metadataBase: new URL(baseUrl),
      title: `${storeName} — Track order`,
      description: `Track your order at ${storeName}.`,
      alternates: { canonical: "./" },
      robots: { index: false, follow: false },
    };
  } catch {
    return {
      metadataBase: new URL(baseUrl),
      title: `${slug} — Track order`,
      description: "Track your order.",
      alternates: { canonical: "./" },
      robots: { index: false, follow: false },
    };
  }
}

export default function TrackOrderPage() {
  return <TrackOrderPageClient />;
}
