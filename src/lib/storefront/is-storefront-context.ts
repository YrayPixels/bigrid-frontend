import { isStorefrontHost } from "@/lib/store-host";

/** True when the current URL is a live merchant storefront (path, subdomain, or custom domain). */
export function isStorefrontContext(pathname: string | null | undefined): boolean {
  if (pathname?.startsWith("/s/")) {
    return true;
  }

  if (typeof window === "undefined") {
    return false;
  }

  return (
    isStorefrontHost(window.location.host) ||
    Boolean(document.documentElement.dataset.storefrontTemplate)
  );
}
