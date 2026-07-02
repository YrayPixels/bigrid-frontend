"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Sparkles, X } from "lucide-react";
import {
  buildFixPreviewErrorMessage,
  dismissWorkbenchError,
  getLatestWorkbenchErrors,
  subscribeWorkbenchErrors,
  type WorkbenchPreviewError,
} from "@/lib/bolt/workbench-preview-errors";
import { cn } from "@/lib/utils";

export function WorkbenchErrorAlert({
  className,
  onFixWithAi,
  onGoToError,
}: {
  className?: string;
  onFixWithAi: (message: string) => void;
  onGoToError?: (filePath: string, line: number) => void;
}) {
  const [errors, setErrors] = useState<WorkbenchPreviewError[]>([]);

  useEffect(() => {
    setErrors(getLatestWorkbenchErrors());
    return subscribeWorkbenchErrors(() => {
      setErrors(getLatestWorkbenchErrors());
    });
  }, []);

  const error = errors[0];
  if (!error) return null;

  return (
    <div
      className={cn(
        "rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink">{error.title}</div>
          <p className="mt-1 text-sm text-ink-soft">
            The preview hit a {error.source === "compile" ? "compile" : "runtime"} error. Ask the AI to fix it.
          </p>
          <div className="mt-2 max-h-28 overflow-auto rounded-md bg-background/80 p-2 font-mono text-[11px] leading-5 text-ink-soft">
            {error.message}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {error.filePath && error.line ? (
              <button
                type="button"
                onClick={() => onGoToError?.(error.filePath!, error.line!)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-ink hover:bg-secondary"
              >
                Go to line {error.line}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onFixWithAi(buildFixPreviewErrorMessage(error))}
              className="inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Fix with AI
            </button>
            <button
              type="button"
              onClick={() => dismissWorkbenchError(error.id)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-ink hover:bg-secondary"
            >
              <X className="h-3.5 w-3.5" />
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
