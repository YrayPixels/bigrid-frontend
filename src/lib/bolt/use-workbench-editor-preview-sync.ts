"use client";

import { useEffect } from "react";
import { codeFs } from "@/lib/code-fs";

const PREVIEW_SYNC_DEBOUNCE_MS = 400;

/** Push in-progress editor draft to codeFs (and WebContainer via writeFile) for live preview. */
export function useWorkbenchEditorPreviewSync(options: {
  path: string | null;
  draft: string;
  dirty: boolean;
  enabled: boolean;
}) {
  const { path, draft, dirty, enabled } = options;

  useEffect(() => {
    if (!enabled || !dirty || !path) return;

    const timer = window.setTimeout(() => {
      if (codeFs.readFile(path) === draft) return;
      codeFs.writeFile(path, draft);
    }, PREVIEW_SYNC_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [path, draft, dirty, enabled]);
}
