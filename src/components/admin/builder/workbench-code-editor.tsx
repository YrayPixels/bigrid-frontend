"use client";

import { languageLabelForPath } from "@/lib/bolt/codemirror-languages";
import { WorkbenchCodeMirror } from "@/components/admin/builder/workbench-codemirror";
import { cn } from "@/lib/utils";
import { Copy } from "lucide-react";
import { toast } from "sonner";

function copyEditorText(text: string, label: string) {
  if (!text) {
    toast.error("Nothing to copy");
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    if (document.execCommand("copy")) {
      toast.success(`${label} copied`);
      return;
    }
  } finally {
    document.body.removeChild(textarea);
  }

  void navigator.clipboard?.writeText(text).then(
    () => toast.success(`${label} copied`),
    () => toast.error("Could not copy to clipboard"),
  );
}

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
      <div className="flex w-full items-center gap-0 border-b border-border bg-secondary/50">
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
        <button
          type="button"
          onClick={() => copyEditorText(value, fileName)}
          className="ml-auto mr-2 inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-ink-soft hover:bg-background hover:text-ink"
          title="Copy entire file"
        >
          <Copy className="h-3 w-3" />
          Copy
        </button>
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
