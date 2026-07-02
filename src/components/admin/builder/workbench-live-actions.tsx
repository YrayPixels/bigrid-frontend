"use client";

import { Check, FileCode2, Loader2, Lock, Terminal, X } from "lucide-react";
import type { BoltAction } from "@/lib/code-parser";
import type { BoltActionResult } from "@/lib/bolt/action-runner";
import { cn } from "@/lib/utils";

export type LiveBoltAction = {
  id: string;
  action: BoltAction;
  status: "streaming" | "complete" | "failed";
  error?: string;
};

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

  const fileActions = actions.filter((a) => a.action.type === "file");
  const shellActions = actions.filter((a) => a.action.type !== "file");

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
          {streaming ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <FileCode2 className="h-3.5 w-3.5" />}
          {streaming ? "AI artifact" : "Last artifact"}
        </div>
        {streaming ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">Live</span>
        ) : null}
      </div>

      {fileActions.length > 0 ? (
        <ul className="space-y-1.5">
          {fileActions.map((entry) => (
            <ActionRow key={entry.id} entry={entry} />
          ))}
        </ul>
      ) : null}

      {shellActions.length > 0 ? (
        <ul className="space-y-1.5">
          {shellActions.map((entry) => (
            <ActionRow key={entry.id} entry={entry} icon={Terminal} />
          ))}
        </ul>
      ) : null}

      {shellLog ? (
        <div className="rounded-lg border border-border bg-secondary/20">
          <div className="border-b border-border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
            Terminal output
          </div>
          <pre className="max-h-28 overflow-auto p-2 font-mono text-[10px] leading-4 text-ink-soft">{shellLog}</pre>
        </div>
      ) : null}
    </div>
  );
}

function ActionRow({
  entry,
  icon: Icon = FileCode2,
}: {
  entry: LiveBoltAction;
  icon?: typeof FileCode2;
}) {
  return (
    <li className="flex items-start gap-2 rounded-lg border border-border/70 bg-background px-2.5 py-2 text-[12px]">
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
        <p className="flex items-center gap-1.5 truncate font-medium text-ink">
          <Icon className="h-3 w-3 shrink-0 opacity-60" />
          {entry.action.type === "file"
            ? entry.action.filePath ?? "file"
            : entry.action.type === "shell"
              ? entry.action.content.trim().slice(0, 72) || "shell"
              : entry.action.type}
        </p>
        {entry.error ? (
          <p className="mt-0.5 text-[11px] text-destructive">{entry.error}</p>
        ) : entry.status === "streaming" ? (
          <p className="mt-0.5 text-[11px] text-ink-soft">Writing…</p>
        ) : (
          <p className="mt-0.5 text-[11px] text-ink-soft">Done</p>
        )}
      </div>
    </li>
  );
}

export function boltLogToLiveActions(log: BoltActionResult[]): LiveBoltAction[] {
  return log.map((entry, index) => ({
    id: `${index}:${entry.action.type}:${entry.action.filePath ?? ""}`,
    action: entry.action,
    status: entry.ok ? "complete" : "failed",
    error: entry.ok ? undefined : entry.error,
  }));
}
