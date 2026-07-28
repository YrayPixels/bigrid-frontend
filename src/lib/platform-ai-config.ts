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

export async function getPlatformAiConfig(token?: string): Promise<PlatformAiConfig> {
  if (!API_BASE) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is not configured. AI provider settings are managed in the platform admin.",
    );
  }

  if (cachedConfig && Date.now() < cacheExpiresAt) {
    return cachedConfig;
  }

  // If no token is provided and we're in a browser context, try to get it from localStorage
  let authToken = token;
  if (!authToken && typeof window !== "undefined") {
    const { getToken } = await import("@/lib/api/client");
    authToken = getToken() ?? undefined;
  }

  const headers: Record<string, string> = {};
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const res = await fetch(`${API_BASE}/storehause/ai/config`, {
    cache: "no-store",
    headers: Object.keys(headers).length > 0 ? headers : undefined,
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
