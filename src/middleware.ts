import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
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

  const host = request.headers.get("host");
  let slug = parseStoreSlugFromHost(host);

  if (!slug && host && !isPlatformRootHost(host)) {
    slug = await resolveCustomDomainSlug(host);
  }

  if (!slug) {
    // Apply on every main-app document route so client-side navigation from
    // /login or /admin does not leave the page without isolation headers.
    return applyWebContainerIsolation(NextResponse.next());
  }

  const url = request.nextUrl.clone();
  const suffix = pathname === "/" ? "" : pathname;
  url.pathname = `/s/${slug}${suffix}`;

  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
