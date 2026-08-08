const ATTRIBUTION_KEY = "storehaus_marketing_attribution";
const VISIT_SESSION_KEY = "storehaus_visit_session";

export type MarketingAttribution = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
};

function trimParam(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed.slice(0, 120);
}

/** Read utm_* from the current URL and persist for the visit session. */
export function captureMarketingAttributionFromUrl(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): MarketingAttribution {
  if (typeof window === "undefined") return {};

  const params = new URLSearchParams(search);
  const next: MarketingAttribution = {
    utm_source: trimParam(params.get("utm_source")),
    utm_medium: trimParam(params.get("utm_medium")),
    utm_campaign: trimParam(params.get("utm_campaign")),
    utm_content: trimParam(params.get("utm_content")),
  };

  const hasAny = Object.values(next).some(Boolean);
  if (hasAny) {
    window.sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(next));
    return next;
  }

  return readMarketingAttribution();
}

export function readMarketingAttribution(): MarketingAttribution {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.sessionStorage.getItem(ATTRIBUTION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as MarketingAttribution;
    return {
      utm_source: trimParam(parsed.utm_source ?? null),
      utm_medium: trimParam(parsed.utm_medium ?? null),
      utm_campaign: trimParam(parsed.utm_campaign ?? null),
      utm_content: trimParam(parsed.utm_content ?? null),
    };
  } catch {
    return {};
  }
}

export function getOrCreateVisitSessionId(): string {
  if (typeof window === "undefined") return "";

  let sessionId = window.sessionStorage.getItem(VISIT_SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    window.sessionStorage.setItem(VISIT_SESSION_KEY, sessionId);
  }
  return sessionId;
}
