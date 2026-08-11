"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { storefrontApi } from "@/lib/api/storefront";
import { getToken } from "@/lib/api/client";
import {
  captureMarketingAttributionFromUrl,
  getOrCreateVisitSessionId,
} from "@/lib/storefront/marketing-attribution";
import { isPlatformRootHost } from "@/lib/store-host";

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

export function PlatformVisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isPlatformRootHost(window.location.host)) return;
    if (!pathname || isExcludedPath(pathname)) return;
    if (isLoggedIn()) return;

    const sessionId = getOrCreateVisitSessionId();
    const attribution = captureMarketingAttributionFromUrl();
    const sentKey = `storehaus_platform_visit_sent:${pathname}`;
    if (window.sessionStorage.getItem(sentKey) === "1") return;
    window.sessionStorage.setItem(sentKey, "1");

    void storefrontApi
      .recordPlatformVisit({
        session_id: sessionId || undefined,
        path: pathname,
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
