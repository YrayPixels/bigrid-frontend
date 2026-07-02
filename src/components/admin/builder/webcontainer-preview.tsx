"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { CustomCodePreview } from "@/components/admin/builder/custom-code-preview";
import { codeFs } from "@/lib/code-fs";
import { WORK_DIR } from "@/lib/bolt/constants";
import { hasPackageJson } from "@/lib/bolt/project-utils";
import { seedBuildItUpIfNeeded } from "@/lib/bolt/seed-template";
import {
  ensureDependenciesInstalled,
  getWebContainer,
  mountCodeFsToWebContainer,
  onPreviewUrl,
  startDevServer,
} from "@/lib/bolt/webcontainer-runtime";
import { cn } from "@/lib/utils";

type PreviewStatus =
  | "idle"
  | "seeding"
  | "booting"
  | "mounting"
  | "restoring"
  | "installing"
  | "starting"
  | "ready"
  | "static"
  | "error";

type WebContainerPreviewProps = {
  className?: string;
};

export function WebContainerPreview({ className }: WebContainerPreviewProps) {
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logs, setLogs] = useState("");
  const [templateReady, setTemplateReady] = useState(false);
  const bootedRef = useRef(false);
  const [fileCount, setFileCount] = useState(0);

  useEffect(() => {
    return codeFs.onUpdate(() => {
      setFileCount(codeFs.listFiles().length);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onPreviewUrl((info) => {
      if (cancelled || !info) return;
      setUrl(info.url);
      setStatus("ready");
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const hasProject = fileCount > 0;
  const files = codeFs.exportFiles();
  const isNodeProject = hasPackageJson(files);

  useEffect(() => {
    if (!hasProject) {
      setTemplateReady(false);
      return;
    }

    if (isNodeProject) {
      setTemplateReady(true);
      return;
    }

    let cancelled = false;
    setStatus("seeding");
    setError(null);
    setLogs("");

    (async () => {
      const didSeed = await seedBuildItUpIfNeeded(files);
      if (cancelled) return;
      if (didSeed) {
        setTemplateReady(true);
        return;
      }
      setStatus("static");
    })();

    return () => {
      cancelled = true;
    };
  }, [hasProject, isNodeProject, fileCount]);

  useEffect(() => {
    if (!hasProject || !templateReady || !isNodeProject) return;
    if (bootedRef.current) return;
    bootedRef.current = true;

    let cancelled = false;
    setError(null);
    setLogs("");
    setUrl(null);

    const log = (line: string) => {
      if (cancelled) return;
      const stamp = new Date().toLocaleTimeString();
      setLogs((prev) => (`${prev}[${stamp}] ${line}\n`).slice(-20_000));
    };

    (async () => {
      try {
        setStatus("booting");
        log("Booting WebContainer…");
        await getWebContainer();
        if (cancelled) return;
        log("WebContainer ready.");

        const count = codeFs.listFiles().length;
        setStatus("mounting");
        log(`Mounting project into ${WORK_DIR}… (${count} files)`);
        await mountCodeFsToWebContainer({
          force: true,
          onProgress: ({ written, total, path }) => {
            if (written === 1 || written === total || written % 10 === 0) {
              log(`Mounted ${written}/${total}: ${path}`);
            }
          },
        });
        log("Mount complete.");

        if (cancelled) return;
        setStatus("restoring");
        log("Restoring dependencies (snapshot or browser cache)…");
        await ensureDependenciesInstalled({
          onOutput: (text) => {
            if (cancelled) return;
            setLogs((prev) => (prev + text).slice(-20_000));
          },
          onRestoreProgress: ({ written, total, source }) => {
            if (cancelled) return;
            log(
              source === "cache"
                ? `Restored cached node_modules ${written}/${total}`
                : `Restored snapshot ${written}/${total}`,
            );
          },
          onRestored: (source) => {
            if (cancelled) return;
            log(source === "snapshot" ? "Loaded prebuilt dependency snapshot." : "Loaded cached node_modules.");
          },
        });
        log("Dependencies ready.");

        if (cancelled) return;
        setStatus("starting");
        log("Running: pnpm run dev --host 0.0.0.0");
        await startDevServer({
          onOutput: (text) => {
            if (cancelled) return;
            setLogs((prev) => (prev + text).slice(-20_000));
          },
          onServerReady: ({ url: readyUrl }) => {
            if (cancelled) return;
            log(`Server ready: ${readyUrl}`);
            setUrl(readyUrl);
            setStatus("ready");
          },
        });
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "WebContainer failed");
        setStatus("error");
        bootedRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasProject, templateReady, isNodeProject]);

  const shell = cn("flex min-h-0 w-full flex-1 flex-col", className);

  if (!hasProject) {
    return (
      <div className={cn(shell, "items-center justify-center gap-2 px-6 py-10 text-center")}>
        <div className="text-sm font-semibold text-ink">WebContainer preview</div>
        <div className="max-w-sm text-sm text-ink-soft">No project files yet. Generate code to start.</div>
      </div>
    );
  }

  if (status === "static") {
    return (
      <div className={shell}>
        <CustomCodePreview className="min-h-0 flex-1" />
      </div>
    );
  }

  if (status !== "ready" || !url) {
    const count = codeFs.listFiles().length;
    return (
      <div className={cn(shell, "items-center justify-center gap-3 px-6 py-10 text-center")}>
        <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          {status === "seeding"
            ? "Loading template…"
            : status === "booting"
              ? "Booting WebContainer…"
              : status === "mounting"
                ? `Mounting project… (${count} files)`
                : status === "restoring"
                  ? "Restoring dependencies…"
                  : status === "installing"
                    ? "Installing dependencies…"
                    : status === "starting"
                      ? "Starting dev server…"
                      : "Preparing…"}
        </div>
        {error ? <div className="max-w-lg text-sm text-destructive">{error}</div> : null}
        {logs ? (
          <pre className="mt-3 max-h-52 w-full max-w-3xl overflow-auto rounded-lg border border-border bg-background p-3 text-left font-mono text-[11px] leading-5 text-ink-soft">
            {logs}
          </pre>
        ) : null}
        <div className="max-w-md text-xs text-ink-soft">
          First run installs dependencies. File edits hot-reload via WebContainer HMR.
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      <iframe
        title="WebContainer preview"
        src={url}
        className="min-h-0 w-full flex-1 border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  );
}
