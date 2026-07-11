import { NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
const BACKEND_CHAT_TIMEOUT_MS = 180_000;

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    if (!rawBody) {
      return NextResponse.json({ error: "Request body is required." }, { status: 422 });
    }

    if (API_BASE) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), BACKEND_CHAT_TIMEOUT_MS);

      try {
        const res = await fetch(`${API_BASE}/storehause/ai/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: rawBody,
          signal: controller.signal,
        });

        const text = await res.text();
        return new NextResponse(text, {
          status: res.status,
          headers: {
            "Content-Type": res.headers.get("content-type") ?? "application/json",
          },
        });
      } catch (error) {
        const aborted =
          (error instanceof Error && error.name === "AbortError") ||
          (typeof error === "object" &&
            error !== null &&
            "name" in error &&
            (error as { name?: string }).name === "AbortError");

        const socketClosed =
          error instanceof Error &&
          (/other side closed|UND_ERR_SOCKET|ECONNRESET|fetch failed/i.test(error.message) ||
            /other side closed|UND_ERR_SOCKET|ECONNRESET/i.test(String((error as Error & { cause?: unknown }).cause ?? "")));

        if (aborted) {
          return NextResponse.json(
            {
              error: "AI request timed out.",
              detail: "The backend took too long to respond. Try again, or use a faster chat model for the Executor.",
            },
            { status: 504 },
          );
        }

        if (socketClosed) {
          return NextResponse.json(
            {
              error: "AI backend closed the connection.",
              detail:
                "Laravel on :8000 dropped the socket (often PHP's 30s limit). Restart the backend after the timeout fix, then retry.",
            },
            { status: 502 },
          );
        }

        throw error;
      } finally {
        clearTimeout(timer);
      }
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
