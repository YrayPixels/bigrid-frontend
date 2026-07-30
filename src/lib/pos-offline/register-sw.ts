const RELOAD_FLAG = "bizgrid_sell_sw_reload";

/**
 * Register the Sell PWA service worker and ensure it controls this page so
 * JS/CSS chunks are cached for a later offline cold start.
 */
export function registerPosServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const warmShell = () => {
    const urls = ["/sell", "/sell/checkout", "/sell/sales", "/manifest.webmanifest"];
    for (const url of urls) {
      void fetch(url, { credentials: "same-origin", cache: "reload" }).catch(() => {});
    }
  };

  const register = () => {
    void navigator.serviceWorker
      .register("/sw.js")
      .then(() => {
        // First time the SW takes control, reload once so this document's
        // /_next/static assets are fetched under the SW and cached.
        if (!navigator.serviceWorker.controller) {
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (sessionStorage.getItem(RELOAD_FLAG)) return;
            sessionStorage.setItem(RELOAD_FLAG, "1");
            window.location.reload();
          });
          return;
        }
        warmShell();
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
