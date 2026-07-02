"use client";

import { Check, FileCode2, Loader2, Lock, X } from "lucide-react";
import type { BoltAction } from "@/lib/code-parser";
import type { BoltActionResult } from "@/lib/bolt/action-runner";
import { cn } from "@/lib/utils";

export type LiveBoltAction = {
  id: string;
  action: BoltAction;
  status: "streaming" | "complete" | "failed";
  error?: string;
};

export function createLiveActionId(action: BoltAction): string {
  return `${action.type}:${action.filePath ?? "shell"}:${action.content.length}`;
}

export function WorkbenchLiveActions({
  actions,
  streaming,
  shellLog,
  className,
}: {
  actions: LiveBoltAction[];
  streaming?: boolean;
  shellLog?: string;
  className?: string;
}) {
  if (!streaming && actions.length === 0 && !shellLog) return null;

  return (
    <div className={cn("space-y-2 rounded-xl border border-border bg-background p-3", className)}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {streaming ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <FileCode2 className="h-3.5 w-3.5" />}
        {streaming ? "Writing files…" : "Files updated"}
      </div>
      <ul className="space-y-1.5">
        {actions.map((entry) => (
          <li
            key={entry.id}
            className="flex items-start gap-2 rounded-lg border border-border/70 bg-secondary/30 px-2.5 py-2 text-[12px]"
          >
            <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center">
              {entry.status === "streaming" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              ) : entry.status === "complete" ? (
                <Check className="h-3.5 w-3.5 text-primary" />
              ) : entry.error?.includes("locked") ? (
                <Lock className="h-3.5 w-3.5 text-ink-soft" />
              ) : (
                <X className="h-3.5 w-3.5 text-destructive" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink">
                {entry.action.type === "file"
                  ? entry.action.filePath ?? "file"
                  : entry.action.type === "shell"
                    ? `shell: ${entry.action.content.trim().slice(0, 60) || "command"}`
                    : entry.action.type}
              </p>
              {entry.error ? (
                <p className="mt-0.5 text-[11px] text-destructive">{entry.error}</p>
              ) : entry.status === "streaming" ? (
                <p className="mt-0.5 text-[11px] text-ink-soft">Streaming…</p>
              ) : (
                <p className="mt-0.5 text-[11px] text-ink-soft">Updated</p>
              )}
            </div>
          </li>
        ))}
      </ul>
      {shellLog ? (
        <pre className="max-h-28 overflow-auto rounded-lg border border-border bg-secondary/30 p-2 font-mono text-[10px] leading-4 text-ink-soft">
          {shellLog}
        </pre>
      ) : null}
    </div>
  );
}

export function boltLogToLiveActions(
  log: BoltActionResult[],
): LiveBoltAction[] {
  return log.map((entry, index) => ({
    id: `${index}:${entry.action.type}:${entry.action.filePath ?? ""}`,
    action: entry.action,
    status: entry.ok ? "complete" : "failed",
    error: entry.ok ? undefined : entry.error,
  }));
}
