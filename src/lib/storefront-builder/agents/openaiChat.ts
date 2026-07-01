export type PostChatBody = {
  model?: string;
  messages: unknown[];
  tools?: unknown[];
  tool_choice?: "auto" | "none" | "required" | Record<string, unknown>;
  temperature?: number;
  response_format?: { type: "json_object" };
};

export type ChatCompletionResponse = {
  choices?: Array<{ message?: { role?: string; content?: string | null; tool_calls?: unknown[] } }>;
};

function defaultChatModel(): string {
  const model = process.env.OPENAI_CHAT_MODEL ?? process.env.NEXT_PUBLIC_OPENAI_THINKING_MODEL;
  return typeof model === "string" && model.trim() ? model.trim() : "gpt-4o-mini";
}

function thinkingModel(): string {
  const model = process.env.NEXT_PUBLIC_OPENAI_THINKING_MODEL ?? process.env.OPENAI_CHAT_MODEL;
  return typeof model === "string" && model.trim() ? model.trim() : "gpt-4o-mini";
}

export function getThinkingModel(): string {
  return thinkingModel();
}

/**
 * Single backend AI endpoint.
 * All OpenAI calls route through the Laravel backend so the API key
 * lives in one place and prompts are versioned in one place.
 */
function backendAiUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
  if (base) return `${base}/storehause/ai/chat`;

  // Fallback: use the frontend proxy route (which calls the backend)
  return "/api/chat";
}

const BACKEND_AI_URL = backendAiUrl();

export async function callOpenAiChat(body: PostChatBody): Promise<ChatCompletionResponse> {
  const apiKey = process.env.OPENAI_API_KEY;

  // If we have a backend URL, route through the backend
  if (BACKEND_AI_URL !== "/api/chat") {
    const payload = {
      model: body.model ?? defaultChatModel(),
      messages: body.messages,
      ...(typeof body.temperature === "number" ? { temperature: body.temperature } : {}),
      ...(body.response_format && typeof body.response_format === "object"
        ? { response_format: body.response_format }
        : {}),
      ...(Array.isArray(body.tools) ? { tools: body.tools } : {}),
      ...(body.tool_choice ? { tool_choice: body.tool_choice } : {}),
    };

    const response = await fetch(BACKEND_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || `Backend chat failed (${response.status})`);
    }

    return JSON.parse(text) as ChatCompletionResponse;
  }

  // Legacy fallback: direct OpenAI call (requires OPENAI_API_KEY)
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY env var");
  }

  const payload = {
    model: body.model ?? defaultChatModel(),
    messages: body.messages,
    ...(typeof body.temperature === "number" ? { temperature: body.temperature } : {}),
    ...(body.response_format && typeof body.response_format === "object"
      ? { response_format: body.response_format }
      : {}),
    ...(Array.isArray(body.tools) ? { tools: body.tools } : {}),
    ...(body.tool_choice ? { tool_choice: body.tool_choice } : {}),
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
    throw new Error(text || `Chat failed (${response.status})`);
  }

  return JSON.parse(text) as ChatCompletionResponse;
}

export async function postChat(body: PostChatBody): Promise<ChatCompletionResponse> {
  if (typeof window === "undefined") {
    return callOpenAiChat(body);
  }

  // Browser-side: use the Next.js proxy route which routes to the backend
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Chat failed (${response.status})`);
  return JSON.parse(text) as ChatCompletionResponse;
}

export function getAssistantMessageContent(data: {
  choices?: Array<{ message?: { content?: string | null } }>;
}): string {
  const raw = data?.choices?.[0]?.message?.content;
  return typeof raw === "string" ? raw : "";
}
