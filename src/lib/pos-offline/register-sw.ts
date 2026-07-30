import { PWA_VERSION } from "@/lib/pos-offline/pwa-version";

const RELOAD_FLAG = "bizgrid_sell_sw_reload";
const UPDATE_CHECK_MS = 60 * 60 * 1000;

export type PosPwaUpdateState = {
  updateAvailable: boolean;
  version: string;
};

type UpdateListener = (state: PosPwaUpdateState) => void;

let registration: ServiceWorkerRegistration | null = null;
let updateAvailable = false;
let applyingUpdate = false;
const listeners = new Set<UpdateListener>();

function notify() {
  const state: PosPwaUpdateState = { updateAvailable, version: PWA_VERSION };
  for (const listener of listeners) listener(state);
}

function markUpdateAvailable() {
  if (updateAvailable) return;
  updateAvailable = true;
  notify();
}

function activateWaitingWorker(reg: ServiceWorkerRegistration) {
  const waiting = reg.waiting;
  if (!waiting) return;
  waiting.postMessage({ type: "SKIP_WAITING" });
}

function watchInstalling(sw: ServiceWorker | null, reg: ServiceWorkerRegistration) {
  if (!sw) return;
  sw.addEventListener("statechange", () => {
    if (sw.state !== "installed") return;
    // First install: no controller yet — activate immediately.
    if (!navigator.serviceWorker.controller) {
      activateWaitingWorker(reg);
      return;
    }
    // Existing controller: wait for the merchant to apply the update.
    markUpdateAvailable();
  });
}

/**
 * Subscribe to Sell PWA update availability (e.g. for an “Update” banner).
 */
export function subscribePosPwaUpdate(listener: UpdateListener) {
  listeners.add(listener);
  listener({ updateAvailable, version: PWA_VERSION });
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Activate a waiting service worker and reload into the new version.
 */
export function applyPosPwaUpdate() {
  applyingUpdate = true;
  if (registration?.waiting) {
    activateWaitingWorker(registration);
    return;
  }
  window.location.reload();
}

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
      .then((reg) => {
        registration = reg;

        if (reg.waiting) {
          if (!navigator.serviceWorker.controller) {
            activateWaitingWorker(reg);
          } else {
            markUpdateAvailable();
          }
        }

        watchInstalling(reg.installing, reg);
        reg.addEventListener("updatefound", () => {
          watchInstalling(reg.installing, reg);
        });

        // First time the SW takes control, reload once so this document's
        // /_next/static assets are fetched under the SW and cached.
        if (!navigator.serviceWorker.controller) {
          navigator.serviceWorker.addEventListener("controllerchange", () => {
            if (sessionStorage.getItem(RELOAD_FLAG)) return;
            sessionStorage.setItem(RELOAD_FLAG, "1");
            window.location.reload();
          });
        } else {
          warmShell();
        }

        const checkForUpdates = () => {
          void reg.update().catch(() => {});
        };
        window.setInterval(checkForUpdates, UPDATE_CHECK_MS);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") checkForUpdates();
        });
      })
      .catch(() => {
        // Registration can fail on insecure origins other than localhost.
      });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!applyingUpdate) return;
      window.location.reload();
    });
  };

  if (document.readyState === "complete") {
    register();
  } else {
    window.addEventListener("load", register, { once: true });
  }
}
