import { streamText, type CoreMessage } from "ai";
import { NextResponse } from "next/server";
import { getChatModel } from "@/lib/ai-sdk";

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

    // For now: we stream plain text only (no tools). This is used by bolt-style code generation.
    const result = streamText({
      model: getChatModel(),
      messages,
      temperature: body.temperature,
    });

    // Use the AI SDK's streaming Response (text/event-stream).
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

