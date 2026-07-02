import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV1 } from "ai";

/**
 * AI SDK configuration for StoreHause.
 * Uses OpenAI as the default provider with the Vercel AI SDK.
 */
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

const DEFAULT_MODEL = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";
const VISION_MODEL = process.env.OPENAI_VISION_MODEL ?? "gpt-4o";

export function getChatModel(): LanguageModelV1 {
  return openai(DEFAULT_MODEL);
}

export function getThinkingModel(): LanguageModelV1 {
  const model = process.env.NEXT_PUBLIC_OPENAI_THINKING_MODEL ?? DEFAULT_MODEL;
  return openai(model);
}

export function getVisionModel(): LanguageModelV1 {
  return openai(VISION_MODEL);
}
