const UPDATE_CHECK_MS = 15 * 60 * 1000;

/**
 * Register the Sell PWA service worker.
 * New versions activate immediately (skipWaiting) and reload once they take control.
 */
export function registerPosServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  let refreshing = false;
  const reloadOnce = () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  };

  const warmShell = () => {
    const urls = ["/sell", "/sell/checkout", "/sell/sales", "/manifest.webmanifest"];
    for (const url of urls) {
      void fetch(url, { credentials: "same-origin", cache: "reload" }).catch(() => {});
    }
  };

  const register = () => {
    // Any new controlling worker (first install or update) should refresh the page
    // so the merchant lands on the new shell + hashed assets.
    navigator.serviceWorker.addEventListener("controllerchange", reloadOnce);

    void navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        // Activate anything already waiting from a prior visit.
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        const checkForUpdates = () => {
          void reg.update().catch(() => {});
        };
        checkForUpdates();
        window.setInterval(checkForUpdates, UPDATE_CHECK_MS);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") checkForUpdates();
        });

        if (navigator.serviceWorker.controller) {
          warmShell();
        }
      })
      .catch(() => {
        // Registration can fail on insecure origins other than localhost.
      });
  };

  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
}
