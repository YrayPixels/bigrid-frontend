"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { isBuilderToolAgentEnabled } from "@/lib/features";
import type { AgentThinkingLogEntry } from "@/lib/storefront-builder/agents/types";
import { AGENT_COLORS, AGENT_LABELS } from "@/lib/storefront-builder/agents/thinking-log";

export function BuilderThinkingLogCompact({
  entries,
  streaming,
  className,
}: {
  entries: AgentThinkingLogEntry[];
  streaming?: boolean;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [entries, streaming]);

  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-background ${className ?? ""}`}
    >
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2">
        {streaming ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" /> : null}
        <p className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">
          {isBuilderToolAgentEnabled()
            ? "Agent → Critic"
            : "Interpret+Plan → Executor → Critic"}
        </p>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {entries.length === 0 ? (
          <p className="py-2 text-xs text-ink-soft">Starting agent pipeline…</p>
        ) : (
          <ol className="space-y-1.5">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-start gap-2 text-xs leading-5">
                <span
                  className={`mt-0.5 shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${AGENT_COLORS[entry.agent]}`}
                >
                  {AGENT_LABELS[entry.agent]}
                </span>
                <span className="min-w-0 flex-1 text-ink">
                  <span className="font-medium">{entry.title}</span>
                  {entry.detail ? (
                    <span className="mt-0.5 block truncate text-[11px] text-ink-soft">{entry.detail}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
