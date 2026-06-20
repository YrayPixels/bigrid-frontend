"use client";

import { useEffect, useRef } from "react";
import type { AgentThinkingLogEntry } from "@/lib/storefront-builder/agents/types";
import { AGENT_COLORS } from "@/lib/storefront-builder/agents/thinking-log";
import type { ThinkingLogTurn } from "@/lib/storefront-builder/session-thinking-log";

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return ts;
  }
}

function phaseLabel(phase: AgentThinkingLogEntry["phase"]): string {
  if (phase === "start") return "start";
  if (phase === "complete") return "done";
  if (phase === "error") return "error";
  return "info";
}

function ThinkingEntry({ entry }: { entry: AgentThinkingLogEntry }) {
  return (
    <li className="rounded-xl border border-border/80 bg-background px-3 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${AGENT_COLORS[entry.agent]}`}
        >
          {entry.agent}
        </span>
        <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-medium uppercase text-ink-soft">
          {phaseLabel(entry.phase)}
        </span>
        <span className="ml-auto text-[10px] tabular-nums text-ink-soft">{formatTime(entry.ts)}</span>
      </div>
      <p className="mt-2 text-sm font-medium">{entry.title}</p>
      {entry.detail ? (
        <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-ink-soft">{entry.detail}</p>
      ) : null}
      {entry.data ? (
        <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-canvas p-3 text-[11px] leading-5 text-ink">
          {JSON.stringify(entry.data, null, 2)}
        </pre>
      ) : null}
    </li>
  );
}

export function BuilderThinkingLog({
  entries,
  turns,
  streaming,
}: {
  entries?: AgentThinkingLogEntry[];
  turns?: ThinkingLogTurn[];
  streaming?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasTurns = Boolean(turns?.length);
  const flatEntries = entries ?? [];

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [entries, turns, streaming]);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">AI process log</h2>
          <p className="text-xs text-ink-soft">Your builder session — Interpreter → Planner → Executor → Critic</p>
        </div>
        {streaming ? (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
            Streaming…
          </span>
        ) : null}
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {!hasTurns && flatEntries.length === 0 ? (
          <p className="text-sm text-ink-soft">
            Send a message in the builder chat to record how the AI interpreted, planned, executed, and
            reviewed each request.
          </p>
        ) : hasTurns ? (
          <ol className="space-y-5">
            {turns?.map((turn, index) => (
              <li key={turn.id}>
                <div className="mb-2 rounded-lg bg-canvas px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
                    Turn {index + 1}
                    {turn.createdAt ? ` · ${formatTime(turn.createdAt)}` : ""}
                  </p>
                  <p className="mt-1 text-sm font-medium text-ink">{turn.userMessage || "Chat message"}</p>
                </div>
                <ol className="space-y-3">
                  {turn.entries.map((entry) => (
                    <ThinkingEntry key={entry.id} entry={entry} />
                  ))}
                </ol>
              </li>
            ))}
          </ol>
        ) : (
          <ol className="space-y-3">
            {flatEntries.map((entry) => (
              <ThinkingEntry key={entry.id} entry={entry} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
