import type { BuilderMessage, BuilderSession } from "@/lib/api/types";
import type { AgentThinkingLogEntry } from "@/lib/storefront-builder/agents/types";
import { createThinkingLogEntry } from "@/lib/storefront-builder/agents/thinking-log";

export type ThinkingLogTurn = {
  id: string;
  userMessage: string;
  createdAt?: string;
  entries: AgentThinkingLogEntry[];
};

function isThinkingLogEntry(value: unknown): value is AgentThinkingLogEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as AgentThinkingLogEntry;
  return (
    typeof entry.agent === "string" &&
    typeof entry.phase === "string" &&
    typeof entry.title === "string"
  );
}

function synthesizeThinkingFromPayload(
  payload: Record<string, unknown>,
  assistantContent: string,
  type: string,
): AgentThinkingLogEntry[] {
  const entries: AgentThinkingLogEntry[] = [];

  if (type === "website_refined") {
    entries.push(
      createThinkingLogEntry({
        agent: "Executor",
        phase: "complete",
        title: "Website copy refined",
        detail: assistantContent.slice(0, 280),
        data: {
          changed_paths: payload.changed_paths ?? [],
        },
      }),
    );
    return entries;
  }

  if (type === "website_generated") {
    entries.push(
      createThinkingLogEntry({
        agent: "Executor",
        phase: "complete",
        title: "Website generated",
        detail: assistantContent.slice(0, 280),
      }),
    );
    return entries;
  }

  entries.push(
    createThinkingLogEntry({
      agent: "System",
      phase: "complete",
      title: "Assistant replied",
      detail: assistantContent.slice(0, 280),
    }),
  );

  if (Array.isArray(payload.plan) && payload.plan.length > 0) {
    entries.push(
      createThinkingLogEntry({
        agent: "InterpretPlanner",
        phase: "complete",
        title: "Plan ready",
        data: { plan: payload.plan },
      }),
    );
  }

  if (Array.isArray(payload.tool_calls)) {
    for (const call of payload.tool_calls) {
      if (!call || typeof call !== "object") continue;
      const toolCall = call as Record<string, unknown>;
      const name = typeof toolCall.name === "string" ? toolCall.name : "tool";
      entries.push(
        createThinkingLogEntry({
          agent: "Executor",
          phase: "complete",
          title: `Called ${name}`,
          data: toolCall,
        }),
      );
    }
  }

  if (Array.isArray(payload.tool_results)) {
    for (const result of payload.tool_results) {
      if (!result || typeof result !== "object") continue;
      const toolResult = result as Record<string, unknown>;
      const name = typeof toolResult.name === "string" ? toolResult.name : "tool";
      entries.push(
        createThinkingLogEntry({
          agent: "Executor",
          phase: "info",
          title: `${name} finished`,
          data: toolResult,
        }),
      );
    }
  }

  if (type === "agent_turn" && entries.length === 1) {
    entries.unshift(
      createThinkingLogEntry({
        agent: "InterpretPlanner",
        phase: "complete",
        title: "Request handled by backend orchestrator",
      }),
    );
  }

  return entries;
}

function extractEntriesFromAssistantMessage(message: BuilderMessage): AgentThinkingLogEntry[] {
  const payload = message.payload ?? {};
  const type = typeof payload.type === "string" ? payload.type : "";

  if (Array.isArray(payload.thinking_log) && payload.thinking_log.length > 0) {
    return payload.thinking_log.filter(isThinkingLogEntry);
  }

  if (
    type === "agent_turn" ||
    type === "website_generated" ||
    type === "website_refined" ||
    type === "brand_color_applied" ||
    type === "design_selected" ||
    type === "conversation"
  ) {
    return synthesizeThinkingFromPayload(payload, message.content, type);
  }

  // Still show a minimal trail when the assistant replied without a typed payload.
  if (message.content.trim()) {
    return synthesizeThinkingFromPayload(payload, message.content, type || "conversation");
  }

  return [];
}

export function extractThinkingLogTurns(session: BuilderSession): ThinkingLogTurn[] {
  const turns: ThinkingLogTurn[] = [];
  let lastUserMessage = "";

  for (const message of session.messages) {
    if (message.role === "user") {
      lastUserMessage = message.content;
      continue;
    }
    if (message.role !== "assistant") continue;

    const payload = message.payload ?? {};
    const entries = extractEntriesFromAssistantMessage(message);
    if (entries.length === 0) continue;

    turns.push({
      id: message.id,
      userMessage:
        typeof payload.user_message === "string" && payload.user_message.trim()
          ? payload.user_message.trim()
          : lastUserMessage,
      createdAt: message.created_at ?? undefined,
      entries,
    });
  }

  return turns;
}

export function flattenThinkingTurns(turns: ThinkingLogTurn[]): AgentThinkingLogEntry[] {
  return turns.flatMap((turn) => turn.entries);
}

export function getLatestThinkingTurn(turns: ThinkingLogTurn[]): ThinkingLogTurn | null {
  return turns.length ? turns[turns.length - 1] : null;
}
