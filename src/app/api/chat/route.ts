import { NextResponse } from "next/server";
import { callOpenAiChat } from "@/lib/storefront-builder/agents/openaiChat";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { model, messages, tools, tool_choice, temperature, response_format } = body ?? {};
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "Expected body.messages to be an array" }, { status: 400 });
    }

    const data = await callOpenAiChat({
      model,
      messages,
      tools,
      tool_choice,
      temperature,
      response_format,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Chat proxy failed";
    const status = message.includes("Missing OPENAI_API_KEY") ? 500 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
