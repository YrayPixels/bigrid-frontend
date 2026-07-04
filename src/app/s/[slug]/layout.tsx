import type { Metadata } from "next";
import { StorefrontGate } from "@/components/storefront/storefront-gate";
import { loadStorefront } from "@/lib/storefront/load-storefront";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const data = await loadStorefront(slug);
    return {
      title: data.storefront.seo.title,
      description: data.storefront.seo.description,
    };
  } catch {
    return {
      title: `${slug} | Bizgrid`,
      description: "Shop online with Bizgrid.",
    };
  }
}

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <StorefrontGate slug={slug}>{children}</StorefrontGate>;
}
