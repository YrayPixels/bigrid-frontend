import { generateText, streamText, type CoreMessage, type LanguageModelV1 } from "ai";
import { getChatModel, getThinkingModel } from "@/lib/ai-sdk";

export type PostChatBody = {
  model?: string | LanguageModelV1;
  messages: unknown[];
  tools?: unknown[];
  tool_choice?: "auto" | "none" | "required" | Record<string, unknown>;
  temperature?: number;
  response_format?: { type: "json_object" };
};

export type ChatCompletionResponse = {
  choices?: Array<{ message?: { role?: string; content?: string | null; tool_calls?: unknown[] } }>;
};

export { getThinkingModel };

function toCoreMessages(messages: unknown[]): CoreMessage[] {
  return messages.map((msg) => {
    const m = msg as Record<string, unknown>;
    return {
      role: (m.role as CoreMessage["role"]) ?? "user",
      content: (m.content as string) ?? "",
    } as CoreMessage;
  });
}

/** AI SDK path — for simple text/JSON calls (no tools) */
async function aiSdkChat(body: PostChatBody): Promise<ChatCompletionResponse> {
  const messages = toCoreMessages(body.messages);
  const model = typeof body.model === "string" || !body.model
    ? getChatModel()
    : body.model;

  const result = await generateText({
    model,
    messages,
    temperature: body.temperature,
    ...(body.tool_choice === "none" ? { toolChoice: "none" as const } : {}),
    ...(body.response_format?.type === "json_object"
      ? {
          providerOptions: {
            openai: { responseFormat: { type: "json_object" as const } },
          },
        }
      : {}),
  });

  return {
    choices: [{
      message: {
        role: "assistant",
        content: result.text,
        tool_calls: result.toolCalls?.map((tc) => ({
          id: tc.toolCallId,
          type: "function" as const,
          function: {
            name: tc.toolName,
            arguments: JSON.stringify(tc.args),
          },
        })),
      },
    }],
  };
}

/** Raw fetch path — for tool-calling calls (OpenAI function format) */
async function rawFetchChat(body: PostChatBody): Promise<ChatCompletionResponse> {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const model = typeof body.model === "string" && body.model
    ? body.model
    : (process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini");

  const payload: Record<string, unknown> = {
    model,
    messages: body.messages,
    temperature: body.temperature ?? 0.7,
  };

  if (Array.isArray(body.tools) && body.tools.length > 0) {
    payload.tools = body.tools;
    payload.tool_choice = body.tool_choice ?? "auto";
  }

  if (body.response_format?.type === "json_object") {
    payload.response_format = { type: "json_object" };
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || `Chat failed (${res.status})`);
  return JSON.parse(text) as ChatCompletionResponse;
}

export async function callOpenAiChat(body: PostChatBody): Promise<ChatCompletionResponse> {
  const hasTools = Array.isArray(body.tools) && body.tools.length > 0;

  // Use raw fetch for tool-calling calls (preserves OpenAI function format)
  if (hasTools) {
    return rawFetchChat(body);
  }

  // Use AI SDK for simple text/JSON calls
  return aiSdkChat(body);
}

export async function postChat(body: PostChatBody): Promise<ChatCompletionResponse> {
  if (typeof window === "undefined") {
    return callOpenAiChat(body);
  }

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Chat failed (${response.status})`);
  return JSON.parse(text) as ChatCompletionResponse;
}

export async function postChatStream(args: {
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  onDelta: (delta: string) => void;
  signal?: AbortSignal;
}): Promise<{ text: string }> {
  // Server-side: stream directly via AI SDK (relative fetch URLs break in Node).
  if (typeof window === "undefined") {
    const result = streamText({
      model: getChatModel(),
      messages: args.messages,
      temperature: args.temperature,
      abortSignal: args.signal,
    });

    let fullText = "";
    for await (const delta of result.textStream) {
      fullText += delta;
      args.onDelta(delta);
    }
    return { text: fullText };
  }

  const res = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: args.messages,
      temperature: args.temperature,
    }),
    signal: args.signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Chat stream failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  // AI SDK data stream protocol: lines that start with "0:" contain text deltas.
  // Other lines (e.g. "e:", "d:") are metadata; ignore for now.
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const newlineIdx = buffer.indexOf("\n");
      if (newlineIdx === -1) break;
      const line = buffer.slice(0, newlineIdx).trimEnd();
      buffer = buffer.slice(newlineIdx + 1);

      if (!line) continue;
      if (!line.startsWith("0:")) continue;

      const payload = line.slice(2);
      try {
        // Text deltas are JSON-string encoded.
        const delta = JSON.parse(payload) as string;
        if (typeof delta === "string" && delta.length > 0) {
          fullText += delta;
          args.onDelta(delta);
        }
      } catch {
        // Ignore malformed lines; streaming must be resilient.
      }
    }
  }

  return { text: fullText };
}

export function getAssistantMessageContent(data: {
  choices?: Array<{ message?: { content?: string | null } }>;
}): string {
  const raw = data?.choices?.[0]?.message?.content;
  return typeof raw === "string" ? raw : "";
}
