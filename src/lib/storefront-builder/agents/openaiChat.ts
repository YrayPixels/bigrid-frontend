export type PostChatBody = {
  model?: string;
  messages: unknown[];
  tools?: unknown[];
  tool_choice?: "auto" | "none" | "required" | Record<string, unknown>;
  temperature?: number;
  response_format?: { type: "json_object" };
};

export async function postChat(body: PostChatBody) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(text || `Chat failed (${response.status})`);
  return JSON.parse(text) as {
    choices?: Array<{ message?: { role?: string; content?: string | null; tool_calls?: unknown[] } }>;
  };
}

export function getAssistantMessageContent(data: {
  choices?: Array<{ message?: { content?: string | null } }>;
}): string {
  const raw = data?.choices?.[0]?.message?.content;
  return typeof raw === "string" ? raw : "";
}

function thinkingModel(): string {
  const model = process.env.NEXT_PUBLIC_OPENAI_THINKING_MODEL ?? process.env.OPENAI_CHAT_MODEL;
  return typeof model === "string" && model.trim() ? model.trim() : "gpt-4o-mini";
}

export function getThinkingModel(): string {
  return thinkingModel();
}
