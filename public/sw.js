/* Bizgrid Sell offline shell */
const CACHE = "bizgrid-sell-v1";
const PRECACHE = ["/sell", "/sell/checkout", "/sell/sales", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await Promise.all(
        PRECACHE.map(async (url) => {
          try {
            await cache.add(url);
          } catch {
            // Ignore individual precache failures (auth redirects, etc.).
          }
        }),
      );
      await self.skipWaiting();
    }),
  );
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

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API calls — IndexedDB owns offline data.
  if (url.pathname.startsWith("/api/") || url.pathname.includes("/v1/")) {
    return;
  }

  const isSellShell =
    url.pathname === "/sell" ||
    url.pathname.startsWith("/sell/") ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest";

  if (!isSellShell) return;

  event.respondWith(
    (async () => {
      try {
        const network = await fetch(request);
        const cache = await caches.open(CACHE);
        cache.put(request, network.clone());
        return network;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (url.pathname.startsWith("/sell")) {
          const fallback = await caches.match("/sell");
          if (fallback) return fallback;
        }
        throw new Error("Offline and not cached");
      }
    })(),
  );
});
