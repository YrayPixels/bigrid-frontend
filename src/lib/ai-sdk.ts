import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModelV1 } from "ai";
import { getPlatformAiConfig } from "@/lib/platform-ai-config";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

type ProviderBundle = {
  chat: (model: string) => LanguageModelV1;
};

function createProviderBundle(provider: "openai" | "deepseek", apiKey: string): ProviderBundle {
  if (provider === "deepseek") {
    const deepseek = createOpenAI({
      apiKey,
      baseURL: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1",
    });

    return {
      chat: (model: string) => deepseek(model),
    };
  }

  const openai = createOpenAI({ apiKey });

  return {
    chat: (model: string) => openai(model),
  };
}

function resolveLocalDevApiKey(provider: "openai" | "deepseek"): string | undefined {
  if (API_BASE) {
    return undefined;
  }

  if (provider === "deepseek") {
    return process.env.DEEPSEEK_API_KEY ?? process.env.OPENAI_API_KEY;
  }

  return process.env.OPENAI_API_KEY;
}

async function getProviderBundle(): Promise<ProviderBundle> {
  const config = await getPlatformAiConfig();
  const apiKey = resolveLocalDevApiKey(config.provider);

  if (!apiKey) {
    throw new Error(
      config.available
        ? `AI is configured in platform admin (${config.provider}) — use the backend chat proxy instead of local SDK keys.`
        : "AI is not configured yet. Add provider keys in the platform admin AI settings page.",
    );
  }

  return createProviderBundle(config.provider, apiKey);
}

export async function getChatModel(): Promise<LanguageModelV1> {
  const config = await getPlatformAiConfig();
  const provider = await getProviderBundle();

  return provider.chat(config.chat_model);
}

export async function getConfiguredChatModelName(): Promise<string> {
  const config = await getPlatformAiConfig();

  return config.chat_model;
}

export async function getConfiguredThinkingModelName(): Promise<string> {
  const config = await getPlatformAiConfig();

  return process.env.NEXT_PUBLIC_OPENAI_THINKING_MODEL ?? config.chat_model;
}
