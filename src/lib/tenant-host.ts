// Tenant resolution from hostname.
// schoolname.platform.com → slug = "schoolname"
// localhost / preview hosts → no tenant
// Custom domains are resolved server-side via getTenantByHost.

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
  "mail",
  "static",
  "assets",
  "cdn",
  "schoolos",
]);

const PLATFORM_DOMAINS = ["schoolos.app"];

export function parseTenantSlugFromHost(host: string | undefined | null): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0].toLowerCase();
  if (hostname === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) return null;

  // Check known platform domains: schoolname.<platform>
  for (const platform of PLATFORM_DOMAINS) {
    if (hostname.endsWith("." + platform)) {
      const prefix = hostname.slice(0, hostname.length - platform.length - 1);
      const slug = prefix.split(".")[0];
      if (!slug || RESERVED.has(slug)) return null;
      // Preview hosts can have UUIDs / hashes — skip those.
      if (slug.length > 32 || /^[a-f0-9-]{32,}$/.test(slug)) return null;
      return slug;
    }
  }
  // Otherwise host is likely a custom domain — caller must resolve server-side.
  return null;
}

export function isPlatformRootHost(host: string | undefined | null): boolean {
  if (!host) return true;
  const hostname = host.split(":")[0].toLowerCase();
  return (
    hostname === "localhost" ||
    PLATFORM_DOMAINS.some((d) => hostname === d || hostname === "www." + d)
  );
}
