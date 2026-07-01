import { NextResponse } from "next/server";

/**
 * Proxy vision analysis requests to the backend.
 * Avoids browser CORS/direct-IP issues by routing through the Next.js server.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);

    if (!body?.image_url) {
      return NextResponse.json({ error: "image_url is required." }, { status: 422 });
    }

    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
    if (!apiBase) {
      return NextResponse.json({ error: "Backend API URL not configured." }, { status: 503 });
    }

    const res = await fetch(`${apiBase}/storehause/ai/vision/product`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Vision proxy failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
