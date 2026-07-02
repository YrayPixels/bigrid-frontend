"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, GitCompare, RotateCcw } from "lucide-react";
import {
  formatLineChangePreview,
  type FileDiffSummary,
  type WorkbenchEditCheckpoint,
} from "@/lib/bolt/workbench-diff";
import { cn } from "@/lib/utils";

export function WorkbenchChangesPanel({
  checkpoint,
  diffs,
  onRevert,
  onSelectFile,
  className,
}: {
  checkpoint: WorkbenchEditCheckpoint | null;
  diffs: FileDiffSummary[];
  onRevert?: () => void;
  onSelectFile?: (path: string) => void;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(true);

  if (!checkpoint || diffs.length === 0) return null;

  return (
    <div className={cn("rounded-lg border border-border bg-background", className)}>
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left text-xs font-semibold uppercase tracking-wide text-ink-soft"
        >
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          <GitCompare className="h-3.5 w-3.5" />
          Changes ({diffs.length} file{diffs.length === 1 ? "" : "s"})
        </button>
        {onRevert ? (
          <button
            type="button"
            onClick={onRevert}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-ink hover:bg-secondary"
            title="Revert this AI edit"
          >
            <RotateCcw className="h-3 w-3" />
            Revert
          </button>
        ) : null}
      </div>

      {expanded ? (
        <ul className="max-h-48 space-y-2 overflow-auto p-2">
          {diffs.map((diff) => (
            <li key={diff.path} className="rounded-md border border-border/70 bg-secondary/20 p-2">
              <button
                type="button"
                onClick={() => onSelectFile?.(diff.path)}
                className="w-full text-left"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[11px] font-medium text-ink">{diff.path}</span>
                  <span className="shrink-0 text-[10px] text-ink-soft">
                    <span className="text-primary">+{diff.additions}</span>
                    {" / "}
                    <span className="text-destructive">-{diff.deletions}</span>
                  </span>
                </div>
              </button>
              {diff.preview.length > 0 ? (
                <pre className="mt-1.5 overflow-x-auto font-mono text-[10px] leading-4 text-ink-soft">
                  {diff.preview.map((change) => `${formatLineChangePreview(change)}\n`)}
                </pre>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
