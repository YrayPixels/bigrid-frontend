import { NextResponse } from "next/server";
import { requireBearerAuth, forwardAuthHeaders } from "@/lib/api/route-auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

/**
 * Proxy Realtime ephemeral token minting to Laravel OpenTokenController.
 * Keeps the OpenAI platform key off the browser.
 */
export async function POST(req: Request) {
  const authResult = requireBearerAuth(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  if (!API_BASE) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_API_BASE_URL is not configured." },
      { status: 503 },
    );
  }

  try {
    const rawBody = await req.text();
    const res = await fetch(`${API_BASE}/storehause/ai/open-token`, {
      method: "POST",
      headers: forwardAuthHeaders(req),
      body: rawBody || JSON.stringify({ muted: true }),
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to mint realtime token.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 502 },
    );
  }
}
