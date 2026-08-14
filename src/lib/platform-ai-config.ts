export type AiProviderName = "openai" | "deepseek" | "gemini";

export type PlatformAiConfig = {
  provider: AiProviderName;
  chat_model: string;
  vision_model: string;
  available: boolean;
  vision_available: boolean;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
const SESSION_STORAGE_KEY = "storehaus_platform_ai_config";

let cachedConfig: PlatformAiConfig | null = null;
/** Deduplicate concurrent /ai/config fetches (common on agent turns). */
let inflight: Promise<PlatformAiConfig> | null = null;
let authClearBound = false;

function readSessionCache(): PlatformAiConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlatformAiConfig;
    if (!parsed?.chat_model || !parsed?.provider) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionCache(config: PlatformAiConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore quota / private-mode failures — memory cache still works.
  }
}

function bindAuthClear(): void {
  if (authClearBound || typeof window === "undefined") return;
  authClearBound = true;
  void import("@/lib/api/client").then(({ onAuthLogout }) => {
    onAuthLogout(() => clearPlatformAiConfigCache());
  });
}

export function clearPlatformAiConfigCache(): void {
  cachedConfig = null;
  inflight = null;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export async function getPlatformAiConfig(token?: string): Promise<PlatformAiConfig> {
  if (!API_BASE) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is not configured. AI provider settings are managed in the platform admin.",
    );
  }

  bindAuthClear();

  if (cachedConfig) return cachedConfig;

  const fromSession = readSessionCache();
  if (fromSession) {
    cachedConfig = fromSession;
    return fromSession;
  }

  if (inflight) return inflight;

  inflight = (async () => {
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
    writeSessionCache(json.data);
    return json.data;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}
