"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { storefrontApi } from "@/lib/api/storefront";
import { getToken } from "@/lib/api/client";
import {
  captureMarketingAttributionFromUrl,
  getOrCreateVisitSessionId,
} from "@/lib/storefront/marketing-attribution";
import { isGrantsHost, isPlatformRootHost } from "@/lib/store-host";

const EXCLUDED_PREFIXES = ["/admin", "/sell", "/s", "/api", "/preview"] as const;

function isExcludedPath(pathname: string): boolean {
  return EXCLUDED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isLoggedIn(): boolean {
  if (typeof window === "undefined") return true;
  if (getToken()) return true;
  return document.cookie.includes("storehaus_auth_present=1");
}

/** Map grants.bizgrid.shop browser paths onto canonical /grants… routes. */
function resolveTrackedPath(pathname: string, host: string): string {
  if (!isGrantsHost(host)) return pathname;

  if (!pathname || pathname === "/") return "/grants";
  if (pathname === "/grants" || pathname.startsWith("/grants/")) return pathname;
  return `/grants${pathname}`;
}

function shouldTrackHost(host: string): boolean {
  return isPlatformRootHost(host) || isGrantsHost(host);
}

export function PlatformVisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const host = window.location.host;
    if (!shouldTrackHost(host)) return;

    const trackedPath = resolveTrackedPath(pathname || "/", host);
    if (!trackedPath || isExcludedPath(trackedPath)) return;
    if (isLoggedIn()) return;

    const sessionId = getOrCreateVisitSessionId();
    const attribution = captureMarketingAttributionFromUrl();
    const sentKey = `storehaus_platform_visit_sent:${trackedPath}`;
    if (window.sessionStorage.getItem(sentKey) === "1") return;
    window.sessionStorage.setItem(sentKey, "1");

    void storefrontApi
      .recordPlatformVisit({
        session_id: sessionId || undefined,
        path: trackedPath,
        referrer: document.referrer || undefined,
        ...attribution,
      })
      .catch(() => {
        // Best-effort analytics; allow retry on next mount for this path.
        window.sessionStorage.removeItem(sentKey);
      });
  }, [pathname]);

  return null;
}
