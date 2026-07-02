"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { codeFs } from "@/lib/code-fs";
import {
  ensureDependenciesInstalled,
  mountCodeFsToWebContainer,
  startDevServer,
} from "@/lib/bolt/webcontainer-runtime";

export function WebContainerPreview() {
  const [status, setStatus] = useState<"idle" | "booting" | "mounting" | "installing" | "starting" | "ready" | "error">("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Trigger reruns when codeFs changes (mount again).
  const [tick, setTick] = useState(0);
  useEffect(() => codeFs.onUpdate(() => setTick((t) => t + 1)), []);

  const hasProject = codeFs.listFiles().length > 0;

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!hasProject) return;
      setError(null);
      setStatus("booting");
      try {
        if (cancelled) return;
        setStatus("mounting");
        await mountCodeFsToWebContainer({ force: true });

        if (cancelled) return;
        setStatus("installing");
        await ensureDependenciesInstalled();

        if (cancelled) return;
        setStatus("starting");
        await startDevServer({
          onServerReady: ({ url }) => {
            if (cancelled) return;
            setUrl(url);
            setStatus("ready");
          },
        });
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "WebContainer failed");
        setStatus("error");
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [hasProject, tick]);

  if (!hasProject) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center gap-2 px-6 py-10 text-center">
        <div className="text-sm font-semibold text-ink">WebContainer preview</div>
        <div className="max-w-sm text-sm text-ink-soft">No project files yet. Generate code to start.</div>
      </div>
    );
  }

  if (status !== "ready" || !url) {
    return (
      <div className="flex min-h-[520px] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          {status === "booting"
            ? "Booting WebContainer…"
            : status === "mounting"
              ? "Mounting project…"
              : status === "installing"
                ? "Installing dependencies…"
                : status === "starting"
                  ? "Starting dev server…"
                  : "Preparing…"}
        </div>
        {error ? <div className="max-w-lg text-sm text-destructive">{error}</div> : null}
        <div className="max-w-md text-xs text-ink-soft">
          First run can take a bit (npm install). After that, edits will hot-reload.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-[520px] w-full">
      <iframe
        title="WebContainer preview"
        src={url}
        className="h-full w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}

