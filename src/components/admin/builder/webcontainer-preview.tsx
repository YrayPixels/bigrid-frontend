"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { CustomCodePreview } from "@/components/admin/builder/custom-code-preview";
import { codeFs } from "@/lib/code-fs";
import { WORK_DIR } from "@/lib/bolt/constants";
import { hasPackageJson } from "@/lib/bolt/project-utils";
import { seedBuildItUpIfNeeded } from "@/lib/bolt/seed-template";
import {
  appendWebContainerOutput,
  clearWebContainerOutput,
} from "@/lib/bolt/webcontainer-output";
import { noteWorkbenchFilesChanged } from "@/lib/bolt/workbench-preview-errors";
import {
  ensureDependenciesInstalled,
  getWebContainer,
  mountCodeFsToWebContainer,
  onPreviewUrl,
  startDevServer,
} from "@/lib/bolt/webcontainer-runtime";
import { registerWorkbenchPreview } from "@/lib/bolt/workbench-preview-inspect";
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

function statusLabel(status: PreviewStatus, fileCount: number): string {
  switch (status) {
    case "seeding":
      return "Loading template…";
    case "booting":
      return "Booting WebContainer…";
    case "mounting":
      return `Mounting project… (${fileCount} files)`;
    case "restoring":
      return "Restoring dependencies…";
    case "installing":
      return "Installing dependencies…";
    case "starting":
      return "Starting dev server…";
    case "error":
      return "Preview failed";
    default:
      return "Preparing preview…";
  }
}

export function WebContainerPreview({ className }: WebContainerPreviewProps) {
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [templateReady, setTemplateReady] = useState(false);
  const bootedRef = useRef(false);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);
  const [fileCount, setFileCount] = useState(0);

  useEffect(() => {
    return registerWorkbenchPreview({
      surface: "webcontainer",
      getDocument: () => previewIframeRef.current?.contentDocument ?? null,
    });
  }, []);

  useEffect(() => {
    return codeFs.onUpdate(() => {
      setFileCount(codeFs.listFiles().length);
      noteWorkbenchFilesChanged();
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
    clearWebContainerOutput();

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
    clearWebContainerOutput();
    setUrl(null);

    const log = (line: string) => {
      if (cancelled) return;
      const stamp = new Date().toLocaleTimeString();
      appendWebContainerOutput(`[${stamp}] ${line}\n`);
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
            appendWebContainerOutput(text);
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
        log("Running: node vite dev --host 0.0.0.0 --port 5173");
        await startDevServer({
          onOutput: (text) => {
            if (cancelled) return;
            appendWebContainerOutput(text);
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
        const message = e instanceof Error ? e.message : "WebContainer failed";
        setError(message);
        appendWebContainerOutput(`\r\n\x1b[31m${message}\x1b[0m\r\n`);
        setStatus("error");
        bootedRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasProject, templateReady, isNodeProject]);

  const shell = cn("flex min-h-0 w-full flex-1 flex-col", className);
  const isLoading = status !== "ready" && status !== "static" && status !== "idle";
  const showIframe = Boolean(url) && status === "ready";

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

  return (
    <div className={shell}>
      <div className="relative min-h-0 flex-1 overflow-hidden bg-secondary/20">
        {showIframe ? (
          <iframe
            ref={previewIframeRef}
            title="WebContainer preview"
            src={url!}
            className="h-full w-full border-0"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : null}
            <p className="text-sm text-ink-soft">{statusLabel(status, fileCount)}</p>
          </div>
        )}

        {isLoading && showIframe ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[1px]">
            <div className="inline-flex items-center gap-2 rounded-full bg-background/90 px-4 py-2 text-sm text-ink-soft shadow-soft">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {statusLabel(status, fileCount)}
            </div>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="shrink-0 border-t border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}
    </div>
  );
}
