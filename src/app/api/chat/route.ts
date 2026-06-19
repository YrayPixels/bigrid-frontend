import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY ?? process.env.NEXT_OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing OPENAI_API_KEY env var" }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const { model, messages, tools, tool_choice, temperature, response_format } = body ?? {};
    if (!Array.isArray(messages)) {
      return NextResponse.json({ error: "Expected body.messages to be an array" }, { status: 400 });
    }

    const payload = {
      model: model ?? process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
      messages,
      ...(typeof temperature === "number" ? { temperature } : {}),
      ...(response_format && typeof response_format === "object" ? { response_format } : {}),
      ...(Array.isArray(tools) ? { tools } : {}),
      ...(tool_choice ? { tool_choice } : {}),
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    if (!response.ok) {
      return new NextResponse(text, { status: response.status, headers: { "Content-Type": "text/plain" } });
    }

    return new NextResponse(text, { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Chat proxy failed" }, { status: 500 });
  }
}
