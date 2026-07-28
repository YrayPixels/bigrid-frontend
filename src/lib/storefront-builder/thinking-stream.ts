import type {
  BuilderSession,
  StorefrontTemplateOption,
  StorefrontTemplateRecommendation,
} from "@/lib/api/types";
import type { AgentThinkingLogEntry } from "@/lib/storefront-builder/agents/types";
import {
  parseThinkingStreamChunk,
  type ThinkingStreamEvent,
} from "@/lib/storefront-builder/agents/thinking-log";
import type { BuilderAiTurn } from "@/lib/storefront-builder/local-ai";

export async function streamBuilderThinkingTurn(args: {
  message: string;
  session: BuilderSession;
  recommendations: StorefrontTemplateRecommendation[];
  templateOptions: StorefrontTemplateOption[];
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  onLog: (entry: AgentThinkingLogEntry) => void;
  signal?: AbortSignal;
}): Promise<BuilderAiTurn> {
  const { getToken } = await import("@/lib/api/client");
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch("/api/storefront-builder/ai/stream", {
    method: "POST",
    headers,
    body: JSON.stringify({
      message: args.message,
      session: args.session,
      recommendations: args.recommendations,
      template_options: args.templateOptions,
      history: args.history,
    }),
    signal: args.signal,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "Could not stream AI thinking log.");
  }

  if (!response.body) {
    throw new Error("Streaming response body was empty.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalTurn: BuilderAiTurn | null = null;

  const handleEvent = (event: ThinkingStreamEvent) => {
    if (event.type === "log") {
      args.onLog(event.entry);
      return;
    }

    if (event.type === "complete") {
      finalTurn = event.turn as unknown as BuilderAiTurn;
      return;
    }

    if (event.type === "error") {
      throw new Error(event.message);
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parsed = parseThinkingStreamChunk(buffer);
    buffer = parsed.rest;
    parsed.events.forEach(handleEvent);
  }

  if (buffer.trim()) {
    parseThinkingStreamChunk(`${buffer}\n\n`).events.forEach(handleEvent);
  }

  if (!finalTurn) {
    throw new Error("Thinking stream ended without a final turn.");
  }

  return finalTurn;
}
