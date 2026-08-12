/* Bizgrid Sell offline shell
 *
 * VERSION is a human-readable cache family (synced with pwa-version.ts).
 * BUILD_ID is stamped at build time via scripts/stamp-pwa-build.mjs so every
 * deploy changes this file and browsers detect a new service worker.
 */
const VERSION = "1.0.21";
const BUILD_ID = "dev";
const CACHE = `bizgrid-sell-${VERSION}-${BUILD_ID}`;
const PRECACHE = ["/sell", "/sell/checkout", "/sell/sales", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            await cache.add(url);
          } catch {
            // Ignore individual precache failures (auth redirects, etc.).
          }
        }),
      );
      // Activate as soon as installed so deploys roll out without a tap.
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "GET_VERSION") {
    event.source?.postMessage({ type: "VERSION", version: VERSION, buildId: BUILD_ID });
  }
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

function isApiPath(pathname) {
  return pathname.startsWith("/api/") || pathname.includes("/v1/");
}

function isSellAsset(pathname) {
  return (
    pathname === "/sell" ||
    pathname.startsWith("/sell/") ||
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/_next/image") ||
    pathname.startsWith("/icons/") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/bizgridlogo.png" ||
    pathname === "/favicon.ico"
  );
}

async function putInCache(request, response) {
  if (!response || !response.ok) return;
  try {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  } catch {
    // Quota / opaque failures — ignore.
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;
  const network = await fetch(request);
  await putInCache(request, network);
  return network;
}

async function networkFirst(request, { fallbackPath } = {}) {
  try {
    const network = await fetch(request);
    await putInCache(request, network);
    return network;
  } catch {
    const cached = await caches.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (fallbackPath) {
      const fallback = await caches.match(fallbackPath);
      if (fallback) return fallback;
    }
    return new Response("Offline — open Sell once while online to cache this page.", {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isApiPath(url.pathname)) return;
  if (!isSellAsset(url.pathname)) return;

  // Build artifacts + icons: prefer cache so cold offline starts work.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/bizgridlogo.png" ||
    url.pathname === "/favicon.ico"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Sell navigations and RSC payloads: network when available, cache offline.
  const isNavigate = request.mode === "navigate" || request.destination === "document";
  event.respondWith(
    networkFirst(request, {
      fallbackPath: isNavigate || url.pathname.startsWith("/sell") ? "/sell" : undefined,
    }),
  );
});
