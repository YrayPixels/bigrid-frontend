import { PWA_VERSION } from "@/lib/pos-offline/pwa-version";

export type PwaVersionInfo = {
  version: string;
  buildId: string | null;
};

const GET_VERSION_TIMEOUT_MS = 2000;

/** The version currently controlling this page, per the active service worker. */
export function getInstalledVersion(): Promise<PwaVersionInfo> {
  const fallback: PwaVersionInfo = { version: PWA_VERSION, buildId: null };
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return Promise.resolve(fallback);
  }
  const controller = navigator.serviceWorker.controller;
  if (!controller) return Promise.resolve(fallback);

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => resolve(fallback), GET_VERSION_TIMEOUT_MS);
    channel.port1.onmessage = (event) => {
      window.clearTimeout(timer);
      if (event.data?.type === "VERSION") {
        resolve({ version: event.data.version ?? PWA_VERSION, buildId: event.data.buildId ?? null });
      } else {
        resolve(fallback);
      }
    };
    controller.postMessage({ type: "GET_VERSION" }, [channel.port2]);
  });
}

/** The version currently deployed, read fresh from the network (bypasses the SW cache). */
export async function getLatestVersion(): Promise<PwaVersionInfo | null> {
  try {
    const res = await fetch("/sw.js", { cache: "reload" });
    if (!res.ok) return null;
    const text = await res.text();
    const version = text.match(/const VERSION = "([^"]*)";/)?.[1];
    const buildId = text.match(/const BUILD_ID = "([^"]*)";/)?.[1];
    if (!version) return null;
    return { version, buildId: buildId ?? null };
  } catch {
    return null;
  }
}

export function versionsMatch(a: PwaVersionInfo | null, b: PwaVersionInfo | null): boolean {
  if (!a || !b) return true; // Unknown — don't claim there's an update.
  if (a.version !== b.version) return false;
  if (a.buildId && b.buildId && a.buildId !== b.buildId) return false;
  return true;
}
