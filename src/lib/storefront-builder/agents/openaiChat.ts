import { generateText, streamText, type CoreMessage, type LanguageModelV1 } from "ai";
import {
  consumeAiChatCompletionStream,
  consumeAiStream,
  type ChatCompletionStreamHandlers,
  type StreamedChatCompletion,
} from "@/lib/ai-stream";
import { getChatModel, getConfiguredChatModelName, getConfiguredThinkingModelName } from "@/lib/ai-sdk";
import { getToken } from "@/lib/api/client";

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

export { getConfiguredThinkingModelName as getThinkingModelName, getConfiguredChatModelName as getChatModelName };

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
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}/storehause/ai/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(text || `Chat failed (${res.status})`);
  return JSON.parse(text) as ChatCompletionResponse;
}

export async function callOpenAiChat(body: PostChatBody): Promise<ChatCompletionResponse> {
  const withModel = await ensureChatModel(body);

  if (API_BASE) {
    try {
      return await proxyChatThroughBackend(withModel);
    } catch (error) {
      // Guest / server-side turns often have no Sanctum token. Fall back to a local
      // provider key so storefront AI edit still works for public preview chat.
      const message = error instanceof Error ? error.message : String(error);
      const unauthorized = /401|403|unauthorized|unauthenticated/i.test(message);
      const hasLocalKey = !!(process.env.OPENAI_API_KEY ?? process.env.DEEPSEEK_API_KEY);
      if (unauthorized && hasLocalKey) {
        return rawFetchChat(withModel);
      }
      throw error;
    }
  }

  const hasTools = Array.isArray(withModel.tools) && withModel.tools.length > 0;

  if (hasTools) {
    return rawFetchChat(withModel);
  }

  return aiSdkChat(withModel);
}

async function ensureChatModel(body: PostChatBody): Promise<PostChatBody> {
  let next: PostChatBody = body;

  if (!(typeof body.model === "string" && body.model.trim()) && !(body.model && typeof body.model !== "string")) {
    next = {
      ...body,
      model: await getConfiguredThinkingModelName(),
    };
  }

  // Providers reject tool_choice when tools are omitted (surfaces as /api/chat 502).
  const hasTools = Array.isArray(next.tools) && next.tools.length > 0;
  if (!hasTools && next.tool_choice !== undefined) {
    const { tool_choice: _ignored, ...rest } = next;
    next = rest;
  }

  return next;
}

export async function postChat(body: PostChatBody): Promise<ChatCompletionResponse> {
  const withModel = await ensureChatModel(body);

  if (typeof window === "undefined") {
    return callOpenAiChat(withModel);
  }

  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch("/api/chat", {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...withModel,
      // Never send LanguageModelV1 objects over the wire.
      model: typeof withModel.model === "string" ? withModel.model : await getConfiguredThinkingModelName(),
    }),
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
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/storehause/ai/chat/stream`, {
      method: "POST",
      headers,
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

  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch("/api/chat/stream", {
    method: "POST",
    headers,
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

export type PostChatCompletionStreamArgs = {
  messages: unknown[];
  tools?: unknown[];
  tool_choice?: "auto" | "none" | "required" | Record<string, unknown>;
  temperature?: number;
  model?: string;
  signal?: AbortSignal;
  onContentDelta?: (delta: string) => void;
  onToolCallDelta?: ChatCompletionStreamHandlers["onToolCallDelta"];
};

/**
 * Streaming Chat Completions with optional tools (OpenAI SSE).
 * Prefer this for SessionAgent — tools can start as soon as the stream finishes.
 */
export async function postChatCompletionStream(
  args: PostChatCompletionStreamArgs,
): Promise<StreamedChatCompletion> {
  const withModel = await ensureChatModel({
    model: args.model,
    messages: args.messages,
    tools: args.tools,
    tool_choice: args.tool_choice,
    temperature: args.temperature,
  });

  const payload = {
    ...withModel,
    model:
      typeof withModel.model === "string" && withModel.model.trim()
        ? withModel.model
        : await getConfiguredChatModelName(),
    stream: true,
  };

  const handlers: ChatCompletionStreamHandlers = {
    onContentDelta: args.onContentDelta,
    onToolCallDelta: args.onToolCallDelta,
  };

  // Browser: go through Next proxy (adds auth + CORS). Server/direct: hit backend or provider.
  if (typeof window !== "undefined") {
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch("/api/chat/stream", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: args.signal,
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Chat stream failed (${res.status})`);
    }

    return consumeAiChatCompletionStream(res.body, handlers);
  }

  if (API_BASE) {
    const token = getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/storehause/ai/chat/stream`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: args.signal,
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Chat stream failed (${res.status})`);
    }

    return consumeAiChatCompletionStream(res.body, handlers);
  }

  // Local provider stream (dev without backend)
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("Configure AI in the platform admin, or set OPENAI_API_KEY for local dev.");
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
    signal: args.signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Chat stream failed (${res.status})`);
  }

  return consumeAiChatCompletionStream(res.body, handlers);
}

export function getAssistantMessageContent(data: {
  choices?: Array<{ message?: { content?: string | null } }>;
}): string {
  const raw = data?.choices?.[0]?.message?.content;
  return typeof raw === "string" ? raw : "";
}
