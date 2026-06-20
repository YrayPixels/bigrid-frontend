import type { Industry, Store, StorefrontContent } from "@/lib/api/types";
import type { BrandColorContext } from "@/lib/storefront-builder/color-resolver";
import { resolveBrandColorForMessage } from "@/lib/storefront-builder/local-ai";

type ResolveColorRequest = {
  message: string;
  context?: BrandColorContext;
};

function contextToStore(context?: BrandColorContext): Store | null {
  if (!context) return null;

  return {
    id: "color-resolve",
    slug: "color-resolve",
    business_name: context.business_name ?? "",
    industry: (context.industry as Industry | undefined) ?? "other",
    description: context.description ?? "",
    brand_color: context.current_color ?? "#0E7C66",
    logo_url: null,
    storefront_template_id: "ai_pick",
  };
}

function contextToStorefront(context?: BrandColorContext): StorefrontContent | null {
  if (!context?.current_palette) return null;
  return { palette: context.current_palette } as StorefrontContent;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ResolveColorRequest | null;

  if (!body?.message?.trim()) {
    return Response.json({ message: "Invalid request." }, { status: 422 });
  }

  const resolved = await resolveBrandColorForMessage(
    body.message.trim(),
    contextToStore(body.context),
    contextToStorefront(body.context),
  );

  if (!resolved) {
    return Response.json({ message: "Could not resolve a brand color." }, { status: 503 });
  }

  return Response.json(resolved);
}
