import { postChat } from "@/lib/storefront-builder/agents/openaiChat";

export type GenerateProductDescriptionInput = {
  name: string;
  category?: string | null;
  price?: number | null;
  currency?: string | null;
  existing_description?: string | null;
  style?: string | null;
  business_name?: string | null;
  industry?: string | null;
};

/**
 * Product copy via the Next.js chat proxy (same path the builder tools use).
 * Keeps generation on the JS/OpenAI tool side rather than PHP agents.
 */
export async function generateProductDescriptionCopy(
  input: GenerateProductDescriptionInput,
): Promise<string> {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Product name is required.");
  }

  const style = input.style?.trim() || "professional";
  const currency = input.currency?.trim() || "NGN";
  const lines = [
    `Name: ${name}`,
    input.category?.trim() ? `Category: ${input.category.trim()}` : null,
    input.price != null && Number.isFinite(input.price)
      ? `Price: ${input.price} ${currency}`
      : null,
    input.existing_description?.trim()
      ? `Current description: ${input.existing_description.trim()}`
      : null,
    input.business_name?.trim() ? `Store: ${input.business_name.trim()}` : null,
    input.industry?.trim() ? `Industry: ${input.industry.trim()}` : null,
  ].filter(Boolean);

  const data = await postChat({
    messages: [
      {
        role: "system",
        content: [
          "You write compelling product descriptions for an online store.",
          `Brand tone: ${style}.`,
          "Write a short, punchy description (2-3 sentences max).",
          "Focus on benefits and sensory details — not just features.",
          'Return ONLY valid JSON: { "description": string }',
        ].join("\n"),
      },
      {
        role: "user",
        content: `Write a description for this product:\n${lines.join("\n")}`,
      },
    ],
    tool_choice: "none",
    temperature: 0.7,
    response_format: { type: "json_object" },
  });

  const content = data?.choices?.[0]?.message?.content;
  const parsed = typeof content === "string" ? JSON.parse(content) : null;
  const description =
    typeof parsed?.description === "string" ? parsed.description.trim() : "";

  if (!description) {
    throw new Error("Description generation failed.");
  }

  return description;
}
