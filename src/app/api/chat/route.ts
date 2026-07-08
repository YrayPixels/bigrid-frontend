import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    if (!rawBody) {
      return NextResponse.json({ error: "Request body is required." }, { status: 422 });
    }

    if (API_BASE) {
      const res = await fetch(`${API_BASE}/storehause/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: rawBody,
      });

      const text = await res.text();
      return new NextResponse(text, {
        status: res.status,
        headers: {
          "Content-Type": res.headers.get("content-type") ?? "application/json",
        },
      });
    }

    const { callOpenAiChat } = await import("@/lib/storefront-builder/agents/openaiChat");
    const body = JSON.parse(rawBody);
    const data = await callOpenAiChat(body);

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Chat proxy failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
