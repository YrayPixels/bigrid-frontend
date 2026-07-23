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

function fallbackDescription(
  product: Pick<ProductDescriptionTarget, "name" | "category" | "existing_description">,
  businessName?: string | null,
): string {
  const brand = businessName?.trim();
  const category = product.category?.trim();
  const lead = brand
    ? `${product.name} from ${brand}`
    : product.name;
  const middle = category
    ? ` — a carefully chosen ${category.toLowerCase()} option`
    : "";
  const tail = product.existing_description?.trim()
    ? ` Built around what shoppers expect from ${product.name}.`
    : `. Ready for everyday use, with quality that matches the name on the label.`;
  return `${lead}${middle}${tail}`.replace(/\s+/g, " ").trim();
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

/**
 * Generate descriptions for many products in one model call.
 * Falls back to name/brand template copy if the AI request fails.
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

  try {
    const data = await postChat({
      messages: [
        {
          role: "system",
          content: [
            "You write compelling product descriptions for an online store.",
            `Brand tone: ${style}.`,
            `Merchant instruction: ${instruction}`,
            "Each description must clearly reflect that product's name and the store brand when provided.",
            "Write a short, punchy description (2-3 sentences max) per product.",
            "Focus on benefits and sensory details — not just features.",
            'Return ONLY valid JSON: { "descriptions": { "<product_id>": "..." } }',
            "Include every product id from the input. Do not invent extra ids.",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            store: args.business_name ?? null,
            industry: args.industry ?? null,
            products: products.map((product) => ({
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
      tool_choice: "none",
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const parsed = parseJsonObject<{ descriptions?: Record<string, unknown> }>(
      getAssistantMessageContent(data),
      {},
    );
    const raw = parsed.descriptions && typeof parsed.descriptions === "object" ? parsed.descriptions : {};

    for (const product of products) {
      const value = raw[product.id];
      if (typeof value === "string" && value.trim()) {
        descriptions[product.id] = value.trim();
      }
    }

    // Fill any missing ids with a local name/brand template so we still update.
    for (const product of products) {
      if (!descriptions[product.id]) {
        descriptions[product.id] = fallbackDescription(product, args.business_name);
      }
    }

    return { descriptions, used_fallback: false };
  } catch (error) {
    for (const product of products) {
      descriptions[product.id] = fallbackDescription(product, args.business_name);
    }
    return {
      descriptions,
      used_fallback: true,
      error: error instanceof Error ? error.message : "Description generation failed.",
    };
  }
}
