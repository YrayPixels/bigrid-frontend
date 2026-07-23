import type { BuilderBusinessProfile, BuilderSession } from "@/lib/api/types";

export type BuilderProductFocus = {
  product_id?: string;
  product_name: string;
};

export function sanitizeProductFocus(value: unknown): BuilderProductFocus | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const productName =
    typeof record.product_name === "string" ? record.product_name.trim() : "";
  if (!productName) return null;
  return {
    product_name: productName,
    ...(typeof record.product_id === "string" && record.product_id.trim()
      ? { product_id: record.product_id.trim() }
      : {}),
  };
}

export function withProductFocus(
  profile: BuilderBusinessProfile,
  focus: BuilderProductFocus | null,
): BuilderBusinessProfile {
  return {
    ...profile,
    last_product_focus: focus,
  };
}

export function getProductFocus(
  profileOrSession: BuilderBusinessProfile | BuilderSession | null | undefined,
): BuilderProductFocus | null {
  if (!profileOrSession) return null;
  const profile =
    "business_profile" in profileOrSession
      ? profileOrSession.business_profile
      : profileOrSession;
  return sanitizeProductFocus(profile?.last_product_focus);
}

/** Merchant is referring to a product without naming it (it / again / the description). */
export function looksLikeContextualProductReference(message: string): boolean {
  const text = message.trim();
  if (!text) return false;
  if (
    /\b(it|its|it's|this|that|again|same (one|product)|the (product|item|description|photo|image|one))\b/i.test(
      text,
    )
  ) {
    return true;
  }
  return /^(check again|try again|update (the )?description|rewrite (the )?description|improve (the )?description|fix the description|update (the )?(photo|image))[\s!.?]*$/i.test(
    text,
  );
}

/**
 * Prefer last focused product when the merchant didn't name a product in this message,
 * even if the planner hallucinated a different product_name.
 */
export function resolveProductNameFromContext(args: {
  message: string;
  proposedName?: string | null;
  focus?: BuilderProductFocus | null;
}): string | undefined {
  const proposed = args.proposedName?.trim() || undefined;
  const focusName = args.focus?.product_name?.trim() || undefined;
  const message = args.message.trim();
  const lower = message.toLowerCase();

  if (proposed && lower.includes(proposed.toLowerCase())) {
    return proposed;
  }
  if (focusName && lower.includes(focusName.toLowerCase())) {
    return focusName;
  }
  if (looksLikeContextualProductReference(message) && focusName) {
    return focusName;
  }
  if (!proposed && focusName && message.length < 80) {
    // Short follow-ups like "make it more premium" after working on a product.
    if (/\b(description|photo|image|price|stock|update|rewrite|improve|check)\b/i.test(message)) {
      return focusName;
    }
  }
  return proposed;
}

export function formatProductFocusHint(focus: BuilderProductFocus | null | undefined): string {
  if (!focus?.product_name) return "";
  return (
    `### Recent product focus\n` +
    `The merchant was most recently working on: "${focus.product_name}"` +
    (focus.product_id ? ` (id: ${focus.product_id})` : "") +
    `.\n` +
    `If they say "it", "its description", "check again", or otherwise omit the product name, use this product — never invent a different product.`
  );
}
