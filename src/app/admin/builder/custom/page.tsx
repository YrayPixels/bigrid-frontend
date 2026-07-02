"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { codeFs } from "@/lib/code-fs";
import { api } from "@/lib/api/client";
import { CustomCodePreview } from "@/components/admin/builder/custom-code-preview";

export default function AdminBuilderCustomPreviewPage() {
  const sessionQuery = useQuery({
    queryKey: ["builder-session"],
    queryFn: api.getCurrentBuilderSession,
  });

  const snapshot = sessionQuery.data?.session?.storefront_snapshot as Record<string, unknown> | null | undefined;
  const customFiles = snapshot?.custom_files as unknown;
  const customCode = snapshot?.custom_code as unknown;

  useEffect(() => {
    if (Array.isArray(customFiles)) {
      codeFs.loadFiles(customFiles as never);
      return;
    }
    if (typeof customCode === "string" && customCode.trim()) {
      codeFs.clear();
      codeFs.writeFile("index.html", customCode);
    }
  }, [customFiles, customCode]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden px-6 py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-ink-soft">Builder</div>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">Custom preview</h1>
          <p className="mt-1 text-sm text-ink-soft">Live preview sourced from generated files.</p>
        </div>
        <Link
          href="/admin/builder"
          className="inline-flex items-center rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-ink hover:bg-secondary"
        >
          Back to builder
        </Link>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="h-full overflow-auto bg-secondary/40 p-4">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-xl border border-border bg-background shadow-soft">
            <CustomCodePreview />
          </div>
        </div>
      </div>
    </div>
  );
}

