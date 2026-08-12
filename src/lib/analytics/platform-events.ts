import { storefrontApi } from "@/lib/api/storefront";
import {
  getOrCreateVisitSessionId,
  readMarketingAttribution,
} from "@/lib/storefront/marketing-attribution";

export type PlatformEventName =
  | "preview_started"
  | "preview_ready"
  | "claim_store_clicked"
  | "preview_signup_completed";

export type PlatformEventSource = "landing" | "preview" | "signup";

type TrackOptions = {
  source?: PlatformEventSource;
  /** Deduplicate within this browser tab session (default true). */
  once?: boolean;
};

/**
 * Best-effort first-party product analytics for the landing preview funnel.
 * Dedupes by event name in sessionStorage so refresh / remounts don't inflate counts.
 */
export function trackPlatformEvent(event: PlatformEventName, options: TrackOptions = {}): void {
  if (typeof window === "undefined") return;

  const once = options.once !== false;
  const sentKey = `storehaus_platform_event:${event}`;
  if (once && window.sessionStorage.getItem(sentKey) === "1") return;
  if (once) window.sessionStorage.setItem(sentKey, "1");

  const sessionId = getOrCreateVisitSessionId();
  const attribution = readMarketingAttribution();

  void storefrontApi
    .recordPlatformEvent({
      event,
      session_id: sessionId || undefined,
      source: options.source,
      ...attribution,
    })
    .catch(() => {
      if (once) window.sessionStorage.removeItem(sentKey);
    });
}
