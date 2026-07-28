import { NextResponse } from "next/server";

/**
 * Extracts the Bearer token from the Authorization header.
 * Returns the token string if present, or a 401 NextResponse if missing.
 */
export function requireBearerAuth(req: Request): string | NextResponse {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized. Bearer token required." }, { status: 401 });
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    return NextResponse.json({ error: "Unauthorized. Bearer token required." }, { status: 401 });
  }

  return token;
}

/**
 * Copies Authorization (+ Content-Type/Accept) from the incoming request
 * and merges with any extra headers provided.
 */
export function forwardAuthHeaders(req: Request, extra?: HeadersInit): HeadersInit {
  const auth = req.headers.get("Authorization");
  const contentType = req.headers.get("Content-Type");

  const base: Record<string, string> = {
    Accept: "application/json",
  };

  if (auth) {
    base.Authorization = auth;
  }

  if (contentType) {
    base["Content-Type"] = contentType;
  } else {
    base["Content-Type"] = "application/json";
  }

  if (extra) {
    if (extra instanceof Headers) {
      extra.forEach((value, key) => {
        base[key] = value;
      });
    } else if (Array.isArray(extra)) {
      for (const [key, value] of extra) {
        base[key] = value;
      }
    } else {
      Object.assign(base, extra);
    }
  }

  return base;
}
