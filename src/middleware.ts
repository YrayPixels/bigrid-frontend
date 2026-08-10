import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isCodeWorkbenchEnabled } from "@/lib/features";
import {
  getStorefrontUrl,
  isPlatformRootHost,
  parseStoreSlugFromHost,
  resolveCustomDomainSlug,
  STORE_PLATFORM_DOMAIN,
} from "@/lib/store-host";

function supportsSubdomainStorefronts(): boolean {
  return !STORE_PLATFORM_DOMAIN.endsWith(".vercel.app");
}

/** Canonicalize legacy path storefront URLs to https://{slug}.bizgrid.shop/... */
function redirectPathStorefrontToSubdomain(request: NextRequest): NextResponse | null {
  const { pathname, search } = request.nextUrl;
  if (!pathname.startsWith("/s/")) return null;

  const host = request.headers.get("host");
  if (!isPlatformRootHost(host) || !supportsSubdomainStorefronts()) {
    return null;
  }

  const remainder = pathname.slice("/s/".length);
  const slash = remainder.indexOf("/");
  const slug = slash === -1 ? remainder : remainder.slice(0, slash);
  const suffix = slash === -1 ? "" : remainder.slice(slash);

  if (!slug || parseStoreSlugFromHost(`${slug}.${STORE_PLATFORM_DOMAIN}`) !== slug) {
    return null;
  }

  // Prefer getStorefrontUrl for localhost vs production host choice.
  const base = getStorefrontUrl(slug).replace(/\/$/, "");
  return NextResponse.redirect(`${base}${suffix}${search}`, 308);
}

function applyWebContainerIsolation(res: NextResponse) {
  // WebContainer needs SharedArrayBuffer, which requires crossOriginIsolated.
  res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  res.headers.set("Cross-Origin-Embedder-Policy", "credentialless");
  return res;
}

function isWorkbenchPath(pathname: string): boolean {
  return (
    pathname === "/admin/builder/workbench" ||
    pathname.startsWith("/admin/builder/workbench/") ||
    pathname === "/admin/builder/custom" ||
    pathname.startsWith("/admin/builder/custom/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/s/")) {
    const redirect = redirectPathStorefrontToSubdomain(request);
    if (redirect) return redirect;
    return NextResponse.next();
  }

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Admin / sell route protection
  if (pathname.startsWith("/admin") || pathname.startsWith("/sell")) {
    const authPresent = request.cookies.get("storehaus_auth_present")?.value;
    if (!authPresent) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  if (!isCodeWorkbenchEnabled() && isWorkbenchPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/website";
    url.searchParams.set("mode", "create");
    return NextResponse.redirect(url);
  }

  const host = request.headers.get("host");
  let slug = parseStoreSlugFromHost(host);

  if (!slug && host && !isPlatformRootHost(host)) {
    slug = await resolveCustomDomainSlug(host);
  }

  if (!slug) {
    // Isolation headers are only needed while the code workbench (WebContainer) is enabled.
    if (isCodeWorkbenchEnabled()) {
      return applyWebContainerIsolation(NextResponse.next());
    }
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  const suffix = pathname === "/" ? "" : pathname;
  url.pathname = `/s/${slug}${suffix}`;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
