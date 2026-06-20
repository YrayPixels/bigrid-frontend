import type { AgentThinkingLogEntry } from "./types";

export function createThinkingLogEntry(
  entry: Omit<AgentThinkingLogEntry, "id" | "ts">,
): AgentThinkingLogEntry {
  return {
    id: crypto.randomUUID(),
    ts: new Date().toISOString(),
    ...entry,
  };
}

export type ThinkingStreamEvent =
  | { type: "log"; entry: AgentThinkingLogEntry }
  | { type: "complete"; turn: Record<string, unknown> }
  | { type: "error"; message: string };

export function encodeThinkingStreamEvent(event: ThinkingStreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export function parseThinkingStreamChunk(buffer: string): {
  events: ThinkingStreamEvent[];
  rest: string;
} {
  const events: ThinkingStreamEvent[] = [];
  const blocks = buffer.split("\n\n");
  const rest = blocks.pop() ?? "";

  for (const block of blocks) {
    if (!block.trim()) continue;

    let eventType = "message";
    const dataLines: string[] = [];

    for (const line of block.split("\n")) {
      if (line.startsWith("event:")) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }

    if (!dataLines.length) continue;

    try {
      const parsed = JSON.parse(dataLines.join("\n")) as ThinkingStreamEvent;
      if (parsed.type === eventType || ["log", "complete", "error"].includes(eventType)) {
        events.push(parsed);
      }
    } catch {
      // ignore malformed chunks
    }
  }

  return { events, rest };
}

export const AGENT_COLORS: Record<AgentThinkingLogEntry["agent"], string> = {
  System: "bg-zinc-500/15 text-zinc-700",
  Interpreter: "bg-violet-500/15 text-violet-800",
  Planner: "bg-blue-500/15 text-blue-800",
  Executor: "bg-amber-500/15 text-amber-900",
  Critic: "bg-emerald-500/15 text-emerald-800",
};
