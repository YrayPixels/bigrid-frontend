export type AiProviderName = "openai" | "deepseek";

export type PlatformAiConfig = {
  provider: AiProviderName;
  chat_model: string;
  vision_model: string;
  available: boolean;
  vision_available: boolean;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

let cachedConfig: PlatformAiConfig | null = null;
let cacheExpiresAt = 0;

export function clearPlatformAiConfigCache(): void {
  cachedConfig = null;
  cacheExpiresAt = 0;
}

export async function getPlatformAiConfig(): Promise<PlatformAiConfig> {
  if (!API_BASE) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is not configured. AI provider settings are managed in the platform admin.",
    );
  }

  if (cachedConfig && Date.now() < cacheExpiresAt) {
    return cachedConfig;
  }

  const res = await fetch(`${API_BASE}/storehause/ai/config`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load AI provider settings from the platform admin.");
  }

  const json = (await res.json()) as { data?: PlatformAiConfig };
  if (!json.data) {
    throw new Error("Platform AI settings are unavailable.");
  }

  cachedConfig = json.data;
  cacheExpiresAt = Date.now() + 30_000;

  return json.data;
}
