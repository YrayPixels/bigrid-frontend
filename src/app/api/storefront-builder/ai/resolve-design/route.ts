import type { StorefrontTemplateOption } from "@/lib/api/types";
import { STOREFRONT_TEMPLATE_OPTIONS } from "@/lib/api/types";
import type { DesignDirectionContext } from "@/lib/storefront-builder/design-resolver";
import { resolveDesignDirectionWithAi } from "@/lib/storefront-builder/design-resolver";
import { requireBearerAuth } from "@/lib/api/route-auth";
import { NextResponse } from "next/server";

type ResolveDesignRequest = {
  message: string;
  context?: DesignDirectionContext;
  template_options?: StorefrontTemplateOption[];
};

export async function POST(request: Request) {
  const authResult = requireBearerAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const body = (await request.json().catch(() => null)) as ResolveDesignRequest | null;

  if (!body?.message?.trim()) {
    return Response.json({ message: "Invalid request." }, { status: 422 });
  }

  const resolved = await resolveDesignDirectionWithAi(
    body.message.trim(),
    body.context ?? {},
    body.template_options?.length ? body.template_options : STOREFRONT_TEMPLATE_OPTIONS,
  );

  if (!resolved) {
    return Response.json({ message: "Could not resolve a design direction." }, { status: 503 });
  }

  return Response.json(resolved);
}
