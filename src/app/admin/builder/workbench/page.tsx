"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileCode2, Lock, PanelLeft, Save, Terminal, Unlock } from "lucide-react";
import { api } from "@/lib/api/client";
import { codeFs } from "@/lib/code-fs";
import { seedBuildItUpIfNeeded } from "@/lib/bolt/seed-template";
import { needsBoltTemplateSeed } from "@/lib/bolt/project-utils";
import type { BuilderSession, StorefrontContent } from "@/lib/api/types";
import { Textarea } from "@/components/ui/textarea";
import { WebContainerPreview } from "@/components/admin/builder/webcontainer-preview";
import { WebContainerTerminalPanel } from "@/components/admin/builder/webcontainer-terminal-panel";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

type FileEntry = { path: string; content: string };

function toFileMap(files: FileEntry[]) {
  const map = new Map<string, string>();
  for (const file of files) map.set(file.path, file.content);
  return map;
}

function useCodeFsFiles() {
  const [tick, setTick] = useState(0);
  useEffect(() => codeFs.onUpdate(() => setTick((v) => v + 1)), []);
  return useMemo(() => {
    void tick;
    const files = codeFs.exportFiles();
    files.sort((a, b) => a.path.localeCompare(b.path));
    return files;
  }, [tick]);
}

export default function AdminBuilderWorkbenchPage() {
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: ["builder-session"],
    queryFn: async () => {
      const current = await api.getCurrentBuilderSession();
      if (current.session) return current;
      return api.startBuilderSession();
    },
  });

  const session = sessionQuery.data?.session ?? null;
  const storefront = session?.storefront_snapshot ?? null;
  const baselineFilesRef = useRef<FileEntry[]>([]);
  const [lockedPaths, setLockedPaths] = useState<Set<string>>(new Set());

  // Load snapshot into codeFs on entry
  useEffect(() => {
    const snapshot = storefront as Record<string, unknown> | null;
    const customFiles = snapshot?.custom_files as unknown;
    const customCode = snapshot?.custom_code as unknown;
    const locked = (snapshot?.edit_metadata as { locked_paths?: string[] } | undefined)?.locked_paths ?? [];
    setLockedPaths(new Set(locked.filter(Boolean)));

    if (Array.isArray(customFiles)) {
      baselineFilesRef.current = customFiles as never;
      codeFs.loadFiles(customFiles as never);
      if (needsBoltTemplateSeed(customFiles as never)) {
        void seedBuildItUpIfNeeded(customFiles as never);
      }
      return;
    }
    if (typeof customCode === "string" && customCode.trim()) {
      baselineFilesRef.current = [{ path: "index.html", content: customCode }];
      codeFs.clear();
      codeFs.writeFile("index.html", customCode);
    }
  }, [storefront]);

  const files = useCodeFsFiles();
  const [selectedPath, setSelectedPath] = useState<string>("index.html");
  const [draft, setDraft] = useState<string>("");
  const [dirty, setDirty] = useState(false);
  const draftPathRef = useRef<string>(selectedPath);
  const [view, setView] = useState<"code" | "diff">("code");
  const [showTerminal, setShowTerminal] = useState(false);

  // Keep selection valid
  useEffect(() => {
    if (files.length === 0) return;
    if (files.some((f) => f.path === selectedPath)) return;
    setSelectedPath(files[0]!.path);
  }, [files, selectedPath]);

  // Load file content into editor when selection changes (or files update)
  useEffect(() => {
    const content = codeFs.readFile(selectedPath) ?? "";
    setDraft(content);
    setDirty(false);
    draftPathRef.current = selectedPath;
  }, [selectedPath, files.length]);

  const isLocked = lockedPaths.has(selectedPath);

  const saveFile = () => {
    codeFs.writeFile(selectedPath, draft);
    setDirty(false);
  };

  const toggleLock = () => {
    setLockedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(selectedPath)) next.delete(selectedPath);
      else next.add(selectedPath);
      return next;
    });
  };

  const persist = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("No builder session");
      const next: StorefrontContent = {
        ...(session.storefront_snapshot ?? ({} as StorefrontContent)),
        custom_files: codeFs.exportFiles() as never,
        custom_code: codeFs.getMainHtml(),
        edit_metadata: {
          ...((session.storefront_snapshot?.edit_metadata ?? {}) as Record<string, unknown>),
          locked_paths: [...lockedPaths],
        } as never,
      };
      return api.sendBuilderMessage(session.id, "Saved custom code changes", {
        storefront_snapshot: next,
        status: session.status,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["builder-session"], data);
    },
  });

  const hasFiles = files.length > 0;
  const title = session?.store?.business_name ?? "StoreHause";
  const baselineMap = useMemo(() => toFileMap(baselineFilesRef.current), []);
  const currentContent = codeFs.readFile(selectedPath) ?? "";
  const baselineContent = baselineMap.get(selectedPath) ?? "";
  const hasDiff = baselineContent !== currentContent;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden px-6 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-ink-soft">Workbench</div>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-ink-soft">Edit files on the left, preview on the right.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/builder"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-ink hover:bg-secondary"
          >
            <PanelLeft className="h-4 w-4" />
            Back to builder
          </Link>
          <button
            type="button"
            onClick={() => saveFile()}
            disabled={!hasFiles || !dirty || isLocked}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-ink disabled:opacity-40"
            title="Save current file into the live preview"
          >
            <Save className="h-4 w-4" />
            Save file
          </button>
          <button
            type="button"
            onClick={() => persist.mutate()}
            disabled={!hasFiles || persist.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            title="Persist current file tree to your builder session"
          >
            <FileCode2 className="h-4 w-4" />
            {persist.isPending ? "Saving…" : "Save to session"}
          </button>
          <button
            type="button"
            onClick={() => setShowTerminal((v) => !v)}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-ink hover:bg-secondary"
            title="Toggle WebContainer terminal"
          >
            <Terminal className="h-4 w-4" />
            Terminal
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel defaultSize={22} minSize={16} className="min-w-[220px] border-r border-border bg-background">
            <div className="flex h-full flex-col">
              <div className="border-b border-border px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Files
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-2">
                {files.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border px-3 py-3 text-sm text-ink-soft">
                    No custom files yet. Generate a custom site first.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {files.map((f) => (
                      <button
                        key={f.path}
                        type="button"
                        onClick={() => setSelectedPath(f.path)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm",
                          selectedPath === f.path ? "bg-secondary font-medium text-ink" : "text-ink-soft hover:bg-secondary/70 hover:text-ink",
                        )}
                      >
                        <span className="truncate">{f.path}</span>
                        {selectedPath === f.path && dirty ? (
                          <span className="ml-2 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            edited
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={38} minSize={25} className="bg-background">
            <div className="flex h-full flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {view === "code" ? `Editor — ${selectedPath}` : `Diff — ${selectedPath}`}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setView("code")}
                    className={cn(
                      "rounded-md border border-border px-2 py-1 text-[11px] font-semibold",
                      view === "code" ? "bg-secondary text-ink" : "bg-background text-ink-soft hover:text-ink",
                    )}
                  >
                    Code
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("diff")}
                    className={cn(
                      "rounded-md border border-border px-2 py-1 text-[11px] font-semibold",
                      view === "diff" ? "bg-secondary text-ink" : "bg-background text-ink-soft hover:text-ink",
                    )}
                    title="Compare against last saved snapshot"
                  >
                    Diff{hasDiff ? " *" : ""}
                  </button>
                  <button
                    type="button"
                    onClick={toggleLock}
                    disabled={!hasFiles}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-semibold disabled:opacity-40",
                      isLocked ? "bg-secondary text-ink" : "bg-background text-ink-soft hover:text-ink",
                    )}
                    title={isLocked ? "Unlock file" : "Lock file (prevents edits and AI writes)"}
                  >
                    {isLocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    {isLocked ? "Locked" : "Lock"}
                  </button>
                </div>
              </div>
              <div className="min-h-0 flex-1 p-3">
                {view === "code" ? (
                  <Textarea
                    value={draft}
                    onChange={(e) => {
                      const next = e.target.value;
                      setDraft(next);
                      setDirty(true);
                    }}
                    spellCheck={false}
                    readOnly={isLocked}
                    className={cn(
                      "h-full min-h-0 resize-none font-mono text-xs leading-5",
                      isLocked ? "bg-secondary/30 text-ink-soft" : "",
                    )}
                  />
                ) : (
                  <div className="grid h-full min-h-0 grid-cols-2 gap-3">
                    <div className="min-h-0 overflow-hidden rounded-lg border border-border bg-background">
                      <div className="border-b border-border px-2 py-1 text-[11px] font-semibold text-ink-soft">
                        Baseline (last saved)
                      </div>
                      <pre className="h-[calc(100%-28px)] overflow-auto p-2 font-mono text-[11px] leading-5 text-ink-soft">
                        {baselineContent || "(empty)"}
                      </pre>
                    </div>
                    <div className="min-h-0 overflow-hidden rounded-lg border border-border bg-background">
                      <div className="border-b border-border px-2 py-1 text-[11px] font-semibold text-ink-soft">
                        Current (live)
                      </div>
                      <pre className="h-[calc(100%-28px)] overflow-auto p-2 font-mono text-[11px] leading-5 text-ink">
                        {currentContent || "(empty)"}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={40} minSize={28} className="bg-secondary/20">
            <div className="flex h-full flex-col">
              <div className="border-b border-border bg-background px-3 py-2 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                Preview
              </div>
              <div className="min-h-0 flex-1 overflow-auto p-3">
                <div className="mx-auto max-w-5xl space-y-3">
                  <div className="overflow-hidden rounded-xl border border-border bg-background shadow-soft">
                    <WebContainerPreview />
                  </div>
                  {showTerminal ? (
                    <WebContainerTerminalPanel className="h-[320px]" />
                  ) : null}
                </div>
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

