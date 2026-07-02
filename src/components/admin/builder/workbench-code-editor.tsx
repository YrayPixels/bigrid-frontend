"use client";

import { languageLabelForPath } from "@/lib/bolt/codemirror-languages";
import { WorkbenchCodeMirror } from "@/components/admin/builder/workbench-codemirror";
import { cn } from "@/lib/utils";

type WorkbenchCodeEditorProps = {
  path: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  streaming?: boolean;
  className?: string;
};

export function WorkbenchCodeEditor({
  path,
  value,
  onChange,
  readOnly = false,
  streaming = false,
  className,
}: WorkbenchCodeEditorProps) {
  const fileName = path.split("/").pop() ?? path;
  const language = languageLabelForPath(path);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-background shadow-soft",
        className,
      )}
    >
      <div className="flex items-center gap-0 border-b border-border bg-secondary/50">
        <div className="flex items-center gap-2 border-r border-border px-3 py-1.5 text-xs text-ink">
          <span className={cn("inline-block h-2 w-2 rounded-full", streaming ? "animate-pulse bg-primary" : "bg-primary")} />
          <span className="max-w-[200px] truncate font-medium">{fileName}</span>
          {readOnly ? (
            <span className="text-[10px] font-medium uppercase tracking-wide text-ink-soft">locked</span>
          ) : null}
          {streaming ? (
            <span className="text-[10px] font-medium uppercase tracking-wide text-primary">streaming</span>
          ) : null}
        </div>
        <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-soft">{language}</div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <WorkbenchCodeMirror
          path={path}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          streaming={streaming}
          className="h-full min-h-0 w-full"
        />
      </div>
    </div>
  );
}
