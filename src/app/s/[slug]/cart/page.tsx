import type { Metadata } from "next";
import { headers } from "next/headers";
import CartPageClient from "./page.client";
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
    const title = `${storeName} — Cart`;
    const description = `View your cart for ${storeName}.`;
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
      title: `${slug} — Cart`,
      description: "Your cart.",
      alternates: { canonical: "./" },
      robots: { index: false, follow: false },
    };
  }
}

export default function CartPage() {
  return <CartPageClient />;
}
