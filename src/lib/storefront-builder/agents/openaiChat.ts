import { generateText, streamText, type CoreMessage, type LanguageModelV1 } from "ai";
import { consumeAiStream } from "@/lib/ai-stream";
import { getChatModel, getConfiguredThinkingModelName } from "@/lib/ai-sdk";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

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

export { getConfiguredThinkingModelName as getThinkingModelName };

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
    ? await getChatModel()
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

/** Local dev fallback when no backend API base is configured. */
async function rawFetchChat(body: PostChatBody): Promise<ChatCompletionResponse> {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("Configure AI in the platform admin, or set OPENAI_API_KEY for local dev.");
  }

  const model = typeof body.model === "string" && body.model
    ? body.model
    : await getConfiguredThinkingModelName();

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

  const baseUrl = process.env.DEEPSEEK_API_KEY
    ? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1"
    : process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
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

async function proxyChatThroughBackend(body: PostChatBody): Promise<ChatCompletionResponse> {
  const res = await fetch(`${API_BASE}/storehause/ai/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || `Chat failed (${res.status})`);
  return JSON.parse(text) as ChatCompletionResponse;
}

export async function callOpenAiChat(body: PostChatBody): Promise<ChatCompletionResponse> {
  if (API_BASE) {
    return proxyChatThroughBackend(body);
  }

  const hasTools = Array.isArray(body.tools) && body.tools.length > 0;

  if (hasTools) {
    return rawFetchChat(body);
  }

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
  if (API_BASE) {
    const res = await fetch(`${API_BASE}/storehause/ai/chat/stream`, {
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

    const fullText = await consumeAiStream(res.body, args.onDelta);
    return { text: fullText };
  }

  if (typeof window === "undefined") {
    const result = streamText({
      model: await getChatModel(),
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

  const fullText = await consumeAiStream(res.body, args.onDelta);
  return { text: fullText };
}

export function getAssistantMessageContent(data: {
  choices?: Array<{ message?: { content?: string | null } }>;
}): string {
  const raw = data?.choices?.[0]?.message?.content;
  return typeof raw === "string" ? raw : "";
}
