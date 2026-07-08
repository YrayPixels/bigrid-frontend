import { streamText, type CoreMessage } from "ai";
import { NextResponse } from "next/server";
import { getChatModel } from "@/lib/ai-sdk";
import { consumeAiStream } from "@/lib/ai-stream";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

type AllowedRole = "system" | "user" | "assistant";

type Body = {
  model?: string;
  messages?: Array<{ role?: AllowedRole; content?: string }>;
  temperature?: number;
};

function toCoreMessages(messages: Body["messages"]): CoreMessage[] {
  return (Array.isArray(messages) ? messages : []).map((m) => {
    const role: AllowedRole = m?.role ?? "user";
    return {
      role,
      content: m?.content ?? "",
    };
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const messages = toCoreMessages(body.messages);
    if (!messages.length) {
      return NextResponse.json({ error: "Expected body.messages to be a non-empty array" }, { status: 400 });
    }

    if (API_BASE) {
      const res = await fetch(`${API_BASE}/storehause/ai/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages,
          temperature: body.temperature,
          model: body.model,
        }),
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        return NextResponse.json({ error: text || `Chat stream failed (${res.status})` }, { status: res.status });
      }

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

    const result = streamText({
      model: await getChatModel(),
      messages,
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
