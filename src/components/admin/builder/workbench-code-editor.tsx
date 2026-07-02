"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";

function languageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "TypeScript",
    tsx: "TypeScript React",
    js: "JavaScript",
    jsx: "JavaScript React",
    json: "JSON",
    css: "CSS",
    scss: "SCSS",
    html: "HTML",
    md: "Markdown",
    svg: "SVG",
    yml: "YAML",
    yaml: "YAML",
  };
  return map[ext] ?? "Plain Text";
}

type WorkbenchCodeEditorProps = {
  path: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  className?: string;
};

export function WorkbenchCodeEditor({ path, value, onChange, readOnly = false, className }: WorkbenchCodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => value.split("\n"), [value]);
  const lineCount = Math.max(lines.length, 1);
  const language = languageFromPath(path);
  const fileName = path.split("/").pop() ?? path;

  const syncScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const gutter = gutterRef.current;
    if (!textarea || !gutter) return;
    gutter.scrollTop = textarea.scrollTop;
  }, []);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.addEventListener("scroll", syncScroll);
    return () => textarea.removeEventListener("scroll", syncScroll);
  }, [syncScroll]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    if (e.key !== "Tab") return;

    e.preventDefault();
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = `${value.slice(0, start)}  ${value.slice(end)}`;
    onChange(next);

    requestAnimationFrame(() => {
      textarea.selectionStart = start + 2;
      textarea.selectionEnd = start + 2;
    });
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-background shadow-soft",
        className,
      )}
    >
      <div className="flex items-center gap-0 border-b border-border bg-secondary/50">
        <div className="flex items-center gap-2 border-r border-border px-3 py-1.5 text-xs text-ink">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
          <span className="max-w-[200px] truncate font-medium">{fileName}</span>
          {readOnly ? (
            <span className="text-[10px] font-medium uppercase tracking-wide text-ink-soft">locked</span>
          ) : null}
        </div>
        <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-ink-soft">{language}</div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          ref={gutterRef}
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-12 overflow-hidden border-r border-border bg-secondary/30 py-3 text-right font-mono text-[11px] leading-5 text-ink-soft select-none"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="pr-3">
              {i + 1}
            </div>
          ))}
        </div>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={syncScroll}
          spellCheck={false}
          readOnly={readOnly}
          className={cn(
            "absolute inset-0 resize-none overflow-auto border-0 bg-transparent py-3 pl-14 pr-4 font-mono text-[13px] leading-5 text-ink outline-none",
            "placeholder:text-ink-soft/60 selection:bg-primary/15 selection:text-ink",
            readOnly ? "cursor-not-allowed text-ink-soft" : "",
          )}
          style={{ tabSize: 2 }}
        />
      </div>
    </div>
  );
}
