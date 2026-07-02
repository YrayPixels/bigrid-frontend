"use client";

import { useEffect, useRef, useState } from "react";
import { Code2, LayoutTemplate, Loader2 } from "lucide-react";
import { codeFs } from "@/lib/code-fs";
import { cn } from "@/lib/utils";

type PreviewMode = "template" | "custom";

export function CustomCodePreview({ html, className }: { html?: string; className?: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [key, setKey] = useState(0);

  // Listen for file system changes and re-render the preview
  useEffect(() => {
    return codeFs.onUpdate(() => {
      setKey((k) => k + 1);
    });
  }, []);

  useEffect(() => {
    setLoaded(false);
    const iframe = iframeRef.current;
    if (!iframe) return;

    const content = html || codeFs.getMainHtml();
    if (!content) return;

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(content);
    doc.close();
    setLoaded(true);
  }, [html, key]);

  if (!html && codeFs.listFiles().length === 0) return null;

  return (
    <div className={cn("relative flex min-h-0 w-full flex-1 flex-col", className)}>
      {!loaded ? (
        <div className="absolute inset-0 flex items-center justify-center bg-background">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : null}
      <iframe
        ref={iframeRef}
        title="Custom storefront preview"
        className="min-h-0 w-full flex-1 border-0"
        sandbox="allow-scripts allow-same-origin"
        style={{ opacity: loaded ? 1 : 0 }}
      />
    </div>
  );
}

export function PreviewModeToggle({
  mode,
  hasCustomCode,
  onChange,
}: {
  mode: PreviewMode;
  hasCustomCode: boolean;
  onChange: (mode: PreviewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
      <button
        type="button"
        onClick={() => onChange("template")}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
          mode === "template"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-ink-soft hover:text-ink"
        }`}
      >
        <LayoutTemplate className="h-3.5 w-3.5" />
        Template
      </button>
      <button
        type="button"
        onClick={() => onChange("custom")}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
          mode === "custom"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-ink-soft hover:text-ink"
        }`}
        title={hasCustomCode ? "View custom code preview" : "Switch to custom preview (generate code to see output)"}
      >
        <Code2 className="h-3.5 w-3.5" />
        Custom
      </button>
    </div>
  );
}
