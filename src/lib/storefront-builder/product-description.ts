import { parseJsonObject } from "@/lib/storefront-builder/agents/agentThinking";
import {
  getAssistantMessageContent,
  postChat,
} from "@/lib/storefront-builder/agents/openaiChat";

export type GenerateProductDescriptionInput = {
  name: string;
  category?: string | null;
  price?: number | null;
  currency?: string | null;
  existing_description?: string | null;
  style?: string | null;
  business_name?: string | null;
  industry?: string | null;
  instruction?: string | null;
};

export type ProductDescriptionTarget = {
  id: string;
  name: string;
  category?: string | null;
  price?: number | null;
  currency?: string | null;
  existing_description?: string | null;
};

type ProductKind =
  | "console"
  | "phone"
  | "laptop"
  | "tablet"
  | "headphones"
  | "mouse_pad"
  | "accessory"
  | "footwear"
  | "apparel"
  | "beauty"
  | "general";

function inferProductKind(name: string, category?: string | null): ProductKind {
  const text = `${name} ${category ?? ""}`.toLowerCase();
  if (/\b(ps\s*[345]|playstation|xbox|nintendo\s*switch|gaming console)\b/.test(text)) {
    return "console";
  }
  if (/\b(iphone|galaxy|pixel|smartphone|android phone|mobile phone)\b/.test(text)) {
    return "phone";
  }
  if (/\b(ipad|tablet)\b/.test(text)) return "tablet";
  if (/\b(macbook|latitude|thinkpad|elitebook|chromebook|laptop|notebook)\b/.test(text)) {
    return "laptop";
  }
  if (/\b(headphone|earbud|airpods|earphone|headset)\b/.test(text)) return "headphones";
  if (/\b(mouse\s*pad|mousepad)\b/.test(text)) return "mouse_pad";
  if (/\b(mouse|keyboard|charger|cable|adapter|case|cover)\b/.test(text)) return "accessory";
  if (/\b(shoe|sneaker|boot|heel|sandal)\b/.test(text)) return "footwear";
  if (/\b(hoodie|tee|t-shirt|dress|trouser|jeans|apparel|clothing)\b/.test(text)) {
    return "apparel";
  }
  if (/\b(serum|cleanser|moisturizer|skincare|cream|lotion)\b/.test(text)) return "beauty";
  return "general";
}

function brandClause(businessName?: string | null): string {
  const brand = businessName?.trim();
  return brand ? ` Available at ${brand}.` : "";
}

function wantsQualityFocus(instruction?: string | null): boolean {
  return /\b(quality|unique|uniqueness|premium|stand\s*out|luxury|craftsmanship)\b/i.test(
    instruction ?? "",
  );
}

/**
 * Local copy when the AI chat proxy fails. Must sound product-specific —
 * never reuse one generic blurb across the whole catalog.
 */
export function fallbackDescription(
  product: Pick<ProductDescriptionTarget, "name" | "category" | "existing_description">,
  businessName?: string | null,
  instruction?: string | null,
): string {
  const name = product.name.trim() || "This product";
  const kind = inferProductKind(name, product.category);
  const quality = wantsQualityFocus(instruction);
  const brand = brandClause(businessName);

  switch (kind) {
    case "console":
      return quality
        ? `The ${name} is built for immersive play — fast load times, sharp visuals, and a setup that feels distinctly next-gen.${brand}`
        : `Step into next-gen gaming with the ${name}: responsive performance, rich graphics, and a console experience made for long sessions.${brand}`;
    case "phone":
      return quality
        ? `The ${name} stands out with a crisp display, dependable everyday performance, and a finish that feels premium in hand.${brand}`
        : `A capable smartphone for calls, camera moments, and daily apps — the ${name} keeps up without the fuss.${brand}`;
    case "laptop":
      return quality
        ? `The ${name} pairs a durable build with smooth everyday performance — made for work, study, and long battery days.${brand}`
        : `Get work done on the ${name}: a reliable laptop with a clear screen and performance suited to business and school.${brand}`;
    case "tablet":
      return `The ${name} is made for reading, streaming, and light work on a portable screen that stays sharp and responsive.${brand}`;
    case "headphones":
      return quality
        ? `The ${name} delivers clear sound and a comfortable fit — everyday listening with a quality feel.${brand}`
        : `Clear audio and all-day comfort in the ${name} — ready for calls, music, and commute listening.${brand}`;
    case "mouse_pad":
      return quality
        ? `A smooth, stable ${name} with a surface built for precise tracking — a small desk upgrade that feels intentional.${brand}`
        : `Give your desk a cleaner glide with this ${name}: a stable surface for accurate mouse control day after day.${brand}`;
    case "accessory":
      return `A practical ${name} designed to pair cleanly with your setup — simple, useful, and ready for daily use.${brand}`;
    case "footwear":
      return quality
        ? `The ${name} balances comfort and style — solid construction with a look that stands out.${brand}`
        : `Step into the ${name}: comfortable everyday footwear with a clean finish.${brand}`;
    case "apparel":
      return quality
        ? `The ${name} is cut for everyday wear with fabric and finish chosen to feel a step above basic.${brand}`
        : `An easy wardrobe staple — the ${name} is comfortable, versatile, and ready to wear.${brand}`;
    case "beauty":
      return `The ${name} is formulated for daily care — lightweight feel, noticeable results, and a routine that fits real life.${brand}`;
    default: {
      const category = product.category?.trim();
      if (quality) {
        return category
          ? `The ${name} is a standout ${category.toLowerCase()} pick — thoughtful details and quality you can feel.${brand}`
          : `The ${name} is chosen for quality and a distinct everyday feel — not just another generic option.${brand}`;
      }
      return category
        ? `Meet the ${name}, a ${category.toLowerCase()} essential built for real everyday use.${brand}`
        : `Meet the ${name} — a practical pick ready for everyday use.${brand}`;
    }
  }
}

/**
 * Product copy via the Next.js chat proxy (same path the builder tools use).
 * Keeps generation on the JS/OpenAI tool side rather than PHP agents.
 */
export async function generateProductDescriptionCopy(
  input: GenerateProductDescriptionInput,
): Promise<string> {
  const batch = await generateProductDescriptionsBatch({
    products: [
      {
        id: "single",
        name: input.name,
        category: input.category,
        price: input.price,
        currency: input.currency,
        existing_description: input.existing_description,
      },
    ],
    style: input.style,
    business_name: input.business_name,
    industry: input.industry,
    instruction: input.instruction,
  });

  const description = batch.descriptions.single?.trim() || "";
  if (!description) {
    throw new Error(batch.error || "Description generation failed.");
  }
  return description;
}

async function requestDescriptionBatch(args: {
  products: ProductDescriptionTarget[];
  style: string;
  instruction: string;
  business_name?: string | null;
  industry?: string | null;
}): Promise<Record<string, string>> {
  const data = await postChat({
    messages: [
      {
        role: "system",
        content: [
          "You write compelling product descriptions for an online store.",
          `Brand tone: ${args.style}.`,
          `Merchant instruction: ${args.instruction}`,
          "Each description must clearly reflect that product's exact name (e.g. PS5, Dell Latitude 5900, mouse pad) — never a truncated or wrong name.",
          "Do NOT use filler lines like 'Ready for everyday use, with quality that matches the name on the label.'",
          "Do NOT start every description with '{name} from {store}'. Mention the store naturally at most once, or omit it.",
          "Write a short, punchy description (2-3 sentences max) per product.",
          "Focus on benefits and what makes that specific product useful — not generic praise.",
          'Return ONLY valid JSON: { "descriptions": { "<product_id>": "..." } }',
          "Include every product id from the input. Do not invent extra ids.",
        ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify({
          store: args.business_name ?? null,
          industry: args.industry ?? null,
          products: args.products.map((product) => ({
            id: product.id,
            name: product.name,
            category: product.category ?? null,
            price: product.price ?? null,
            currency: product.currency ?? "NGN",
            current_description: product.existing_description ?? null,
          })),
        }),
      },
    ],
    // Do not send tool_choice without tools — providers reject it (mapped as 502).
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const parsed = parseJsonObject<{ descriptions?: Record<string, unknown> }>(
    getAssistantMessageContent(data),
    {},
  );
  const raw = parsed.descriptions && typeof parsed.descriptions === "object" ? parsed.descriptions : {};
  const descriptions: Record<string, string> = {};

  for (const product of args.products) {
    const value = raw[product.id];
    if (typeof value === "string" && value.trim()) {
      descriptions[product.id] = value.trim();
    }
  }

  return descriptions;
}

/**
 * Generate descriptions for many products in one model call.
 * Falls back to product-aware local copy if the AI request fails.
 */
export async function generateProductDescriptionsBatch(args: {
  products: ProductDescriptionTarget[];
  style?: string | null;
  business_name?: string | null;
  industry?: string | null;
  instruction?: string | null;
}): Promise<{ descriptions: Record<string, string>; error?: string; used_fallback: boolean }> {
  const products = args.products.filter((product) => product.name.trim());
  const descriptions: Record<string, string> = {};

  if (!products.length) {
    return { descriptions, error: "No products to describe.", used_fallback: false };
  }

  const style = args.style?.trim() || "professional";
  const instruction =
    args.instruction?.trim() ||
    "Match each description to that product's exact name and the store brand.";

  let lastError: string | undefined;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const generated = await requestDescriptionBatch({
        products,
        style,
        instruction,
        business_name: args.business_name,
        industry: args.industry,
      });

      for (const product of products) {
        descriptions[product.id] =
          generated[product.id] ||
          fallbackDescription(product, args.business_name, instruction);
      }

      const usedFallback = products.some((product) => !generated[product.id]);
      return { descriptions, used_fallback: usedFallback };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Description generation failed.";
    }
  }

  for (const product of products) {
    descriptions[product.id] = fallbackDescription(product, args.business_name, instruction);
  }

  return {
    descriptions,
    used_fallback: true,
    error: lastError,
  };
}
