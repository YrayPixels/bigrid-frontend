import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isCodeWorkbenchEnabled } from "@/lib/features";
import {
  isPlatformRootHost,
  parseStoreSlugFromHost,
  resolveCustomDomainSlug,
} from "@/lib/store-host";

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

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/s/") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
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
