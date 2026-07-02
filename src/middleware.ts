import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseStoreSlugFromHost } from "@/lib/store-host";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // WebContainer requires SharedArrayBuffer which requires crossOriginIsolated.
  // Scope this to builder/workbench routes to avoid affecting storefront embeds.
  const needsIsolation =
    pathname.startsWith("/admin/builder") ||
    pathname.startsWith("/admin/website");

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/s/") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    const res = NextResponse.next();
    if (needsIsolation) {
      res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
      res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    }
    return res;
  }

  const host = request.headers.get("host");
  const slug = parseStoreSlugFromHost(host);

  if (!slug) {
    const res = NextResponse.next();
    if (needsIsolation) {
      res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
      res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
    }
    return res;
  }

  const url = request.nextUrl.clone();
  const suffix = pathname === "/" ? "" : pathname;
  url.pathname = `/s/${slug}${suffix}`;

  const res = NextResponse.rewrite(url);
  if (needsIsolation) {
    res.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    res.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
