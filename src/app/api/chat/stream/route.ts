import { streamText, type CoreMessage } from "ai";
import { NextResponse } from "next/server";
import { getChatModel } from "@/lib/ai-sdk";
import { consumeAiStream } from "@/lib/ai-stream";
import { requireBearerAuth, forwardAuthHeaders } from "@/lib/api/route-auth";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

type AllowedRole = "system" | "user" | "assistant" | "tool";

type Body = {
  model?: string;
  messages?: Array<{
    role?: AllowedRole;
    content?: string | null;
    tool_calls?: unknown[];
    tool_call_id?: string;
  }>;
  temperature?: number;
  tools?: unknown[];
  tool_choice?: unknown;
  stream?: boolean;
};

function toCoreMessages(messages: Body["messages"]): CoreMessage[] {
  return (Array.isArray(messages) ? messages : []).map((m) => {
    const role: AllowedRole = m?.role ?? "user";
    return {
      role: role === "tool" ? "user" : role,
      content: m?.content ?? "",
    } as CoreMessage;
  });
}

export async function POST(req: Request) {
  const authResult = requireBearerAuth(req);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const rawBody = await req.text();
    if (!rawBody) {
      return NextResponse.json({ error: "Request body is required." }, { status: 422 });
    }

    let body: Body;
    try {
      body = JSON.parse(rawBody) as Body;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const messages = Array.isArray(body.messages) ? body.messages : [];
    if (!messages.length) {
      return NextResponse.json({ error: "Expected body.messages to be a non-empty array" }, { status: 400 });
    }

    const tools = Array.isArray(body.tools) ? body.tools : [];
    const hasTools = tools.length > 0;

    // Strip orphan tool_choice when no tools (providers reject it).
    const forwardPayload: Record<string, unknown> = {
      messages: body.messages,
      temperature: body.temperature,
      model: body.model,
    };
    if (hasTools) {
      forwardPayload.tools = tools;
      if (body.tool_choice !== undefined) forwardPayload.tool_choice = body.tool_choice;
    }

    if (API_BASE) {
      const res = await fetch(`${API_BASE}/storehause/ai/chat/stream`, {
        method: "POST",
        headers: forwardAuthHeaders(req),
        body: JSON.stringify(forwardPayload),
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        return NextResponse.json({ error: text || `Chat stream failed (${res.status})` }, { status: res.status });
      }

      // With tools: pass through raw OpenAI SSE so tool_calls survive.
      if (hasTools) {
        return new NextResponse(res.body, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
          },
        });
      }

      // Text-only: rewrite to AI SDK data stream for existing bolt consumers.
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          await consumeAiStream(res.body!, (delta) => {
            controller.enqueue(encoder.encode(`0:${JSON.stringify(delta)}\n`));
          });
          controller.close();
        },
      });

      return new NextResponse(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
        },
      });
    }

    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "AI backend not configured. Contact support." },
        { status: 503 },
      );
    }

    // Local fallback with tools: raw provider SSE.
    if (hasTools) {
      const apiKey = process.env.OPENAI_API_KEY ?? process.env.DEEPSEEK_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "Configure OPENAI_API_KEY for local tool streaming." },
          { status: 503 },
        );
      }

      const baseUrl = process.env.DEEPSEEK_API_KEY
        ? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1"
        : process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";

      const providerRes = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...forwardPayload,
          model: body.model || process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
          stream: true,
        }),
      });

      if (!providerRes.ok || !providerRes.body) {
        const text = await providerRes.text().catch(() => "");
        return NextResponse.json(
          { error: text || `Chat stream failed (${providerRes.status})` },
          { status: providerRes.status },
        );
      }

      return new NextResponse(providerRes.body, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
        },
      });
    }

    const result = streamText({
      model: await getChatModel(),
      messages: toCoreMessages(body.messages),
      temperature: body.temperature,
    });

    return result.toDataStreamResponse({
      headers: {
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Chat stream proxy failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
