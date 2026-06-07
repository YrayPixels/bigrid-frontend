import { notFound } from "next/navigation";
import { storefrontApi } from "@/lib/api/storefront";
import type { PublicStorefront } from "@/lib/api/types";

export async function loadStorefront(slug: string): Promise<PublicStorefront> {
  try {
    return await storefrontApi.getBySlug(slug);
  } catch {
    notFound();
  }
}
