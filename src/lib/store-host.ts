const RESERVED = new Set([
  "www",
  "app",
  "api",
  "admin",
  "dashboard",
  "portal",
  "docs",
  "help",
  "status",
  "blog",
  "privacy",
  "mail",
  "static",
  "assets",
  "cdn",
]);

export const STORE_PLATFORM_DOMAIN =
  process.env.NEXT_PUBLIC_STORE_PLATFORM_DOMAIN ?? "bizgrid.shop";

function supportsSubdomainStorefronts(): boolean {
  return !STORE_PLATFORM_DOMAIN.endsWith(".vercel.app");
}

export function getStoreSubdomainHost(slug: string) {
  return `${slug}.${STORE_PLATFORM_DOMAIN}`;
}

/** Public storefront URL on this app (subdomain-hosted). */
export function getStorefrontUrl(slug: string): string {
  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;

    if (hostname === "localhost" || hostname.endsWith(".localhost")) {
      return `${protocol}//${slug}.localhost${port ? `:${port}` : ""}`;
    }

    if (hostname === STORE_PLATFORM_DOMAIN || hostname === `www.${STORE_PLATFORM_DOMAIN}`) {
      if (!supportsSubdomainStorefronts()) {
        return `${protocol}//${STORE_PLATFORM_DOMAIN}/s/${slug}`;
      }

      return `${protocol}//${slug}.${STORE_PLATFORM_DOMAIN}`;
    }
  }

  if (process.env.NODE_ENV === "development") {
    return `http://${slug}.localhost:3000`;
  }

  if (!supportsSubdomainStorefronts()) {
    return `https://${STORE_PLATFORM_DOMAIN}/s/${slug}`;
  }

  return `https://${slug}.${STORE_PLATFORM_DOMAIN}`;
}

export function parseStoreSlugFromHost(host: string | undefined | null): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase();

  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }

  if (hostname.endsWith(".localhost")) {
    const prefix = hostname.slice(0, -".localhost".length);
    const slug = prefix.split(".")[0];
    if (!slug || RESERVED.has(slug)) return null;
    return slug;
  }

  if (hostname.endsWith("." + STORE_PLATFORM_DOMAIN)) {
    const prefix = hostname.slice(0, hostname.length - STORE_PLATFORM_DOMAIN.length - 1);
    const slug = prefix.split(".")[0];
    if (!slug || RESERVED.has(slug)) return null;
    return slug;
  }

  return null;
}

export function isPlatformRootHost(host: string | undefined | null): boolean {
  if (!host) return true;
  const hostname = host.split(":")[0].toLowerCase();
  return (
    hostname === "localhost" ||
    /^\d+\.\d+\.\d+\.\d+$/.test(hostname) ||
    hostname === STORE_PLATFORM_DOMAIN ||
    hostname === `www.${STORE_PLATFORM_DOMAIN}`
  );
}

export function isStorefrontHost(host: string | undefined | null): boolean {
  if (parseStoreSlugFromHost(host) !== null) {
    return true;
  }

  return Boolean(host && !isPlatformRootHost(host));
}

const customDomainSlugCache = new Map<string, { slug: string | null; expiresAt: number }>();

export async function resolveCustomDomainSlug(host: string | undefined | null): Promise<string | null> {
  if (!host || isPlatformRootHost(host) || parseStoreSlugFromHost(host)) {
    return null;
  }

  const hostname = host.split(":")[0].toLowerCase();
  const cached = customDomainSlugCache.get(hostname);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.slug;
  }

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  if (!apiBase) {
    return null;
  }

  try {
    const res = await fetch(
      `${apiBase}/storehause/public/storefronts/resolve-host?host=${encodeURIComponent(hostname)}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 300 },
      },
    );

    const slug = res.ok
      ? ((await res.json().catch(() => null)) as { slug?: string } | null)?.slug ?? null
      : null;

    customDomainSlugCache.set(hostname, {
      slug: typeof slug === "string" ? slug : null,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return typeof slug === "string" ? slug : null;
  } catch {
    return null;
  }
}
