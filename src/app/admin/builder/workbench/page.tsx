"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileCode2, Loader2, Lock, PanelLeft, Save, Sparkles, Terminal, Unlock } from "lucide-react";
import { toast } from "sonner";
import { BuilderChatPanel } from "@/components/admin/builder/builder-chat-panel";
import { BuilderThinkingLogSheet } from "@/components/admin/builder/builder-thinking-log-sheet";
import { WorkbenchCodeEditor } from "@/components/admin/builder/workbench-code-editor";
import { WorkbenchFileTree } from "@/components/admin/builder/workbench-file-tree";
import {
  WorkbenchLiveActions,
  type LiveBoltAction,
} from "@/components/admin/builder/workbench-live-actions";
import { CollapsedPanelRail, WorkbenchPanelHeader, useWorkbenchPanelCollapsed } from "@/components/admin/builder/workbench-panel-header";
import { WebContainerPreview } from "@/components/admin/builder/webcontainer-preview";
import { WebContainerTerminalPanel } from "@/components/admin/builder/webcontainer-terminal-panel";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  useGroupRef,
  usePanelRef,
} from "@/components/ui/resizable";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api/client";
import { codeFs } from "@/lib/code-fs";
import { seedBuildItUpIfNeeded } from "@/lib/bolt/seed-template";
import { needsBoltTemplateSeed } from "@/lib/bolt/project-utils";
import type { BuilderSession, StorefrontContent } from "@/lib/api/types";
import { STOREFRONT_TEMPLATE_OPTIONS } from "@/lib/api/types";
import {
  applyBuilderBrandColor,
  applyBuilderMedia,
  streamAndPersistBuilderMessage,
  type BoltStreamCallbacks,
  type WorkbenchContextHints,
} from "@/lib/storefront-builder/client";
import { lastWrittenPathsFromSession } from "@/lib/bolt/select-context";
import type { AgentThinkingLogEntry } from "@/lib/storefront-builder/agents/types";
import {
  extractThinkingLogTurns,
  type ThinkingLogTurn,
} from "@/lib/storefront-builder/session-thinking-log";
import { cn } from "@/lib/utils";

type FileEntry = { path: string; content: string };

function toFileMap(files: FileEntry[]) {
  const map = new Map<string, string>();
  for (const file of files) map.set(file.path, file.content);
  return map;
}

function computeModifiedPaths(baseline: FileEntry[], current: FileEntry[]): string[] {
  const baseMap = toFileMap(baseline);
  const modified = new Set<string>();
  for (const file of current) {
    if (baseMap.get(file.path) !== file.content) modified.add(file.path);
  }
  for (const path of baseMap.keys()) {
    if (!current.some((file) => file.path === path)) modified.add(path);
  }
  return [...modified];
}

function actionLiveId(action: { type: string; filePath?: string; content: string }): string {
  return action.filePath ?? `${action.type}:${action.content.slice(0, 48)}`;
}

function snapshotHasCustomFiles(storefront: StorefrontContent | null | undefined): boolean {
  const snapshot = storefront as Record<string, unknown> | null | undefined;
  if (Array.isArray(snapshot?.custom_files) && (snapshot.custom_files as unknown[]).length > 0) {
    return true;
  }
  if (typeof snapshot?.custom_code === "string" && snapshot.custom_code.trim()) {
    return true;
  }
  return false;
}

function loadSnapshotIntoCodeFs(storefront: StorefrontContent | null | undefined) {
  const snapshot = storefront as Record<string, unknown> | null | undefined;
  const customFiles = snapshot?.custom_files as unknown;
  const customCode = snapshot?.custom_code as unknown;

  if (Array.isArray(customFiles)) {
    codeFs.loadFiles(customFiles as never);
    if (needsBoltTemplateSeed(customFiles as never)) {
      void seedBuildItUpIfNeeded(customFiles as never);
    }
    return customFiles as FileEntry[];
  }

  if (typeof customCode === "string" && customCode.trim()) {
    const files = [{ path: "index.html", content: customCode }];
    codeFs.clear();
    codeFs.writeFile("index.html", customCode);
    return files;
  }

  return [] as FileEntry[];
}

function useCodeFsFiles() {
  const [tick, setTick] = useState(0);
  useEffect(() => codeFs.onUpdate(() => setTick((v) => v + 1)), []);
  const files = useMemo(() => {
    void tick;
    const exported = codeFs.exportFiles();
    exported.sort((a, b) => a.path.localeCompare(b.path));
    return exported;
  }, [tick]);
  return { files, tick };
}

export default function AdminBuilderWorkbenchPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  const [thinkingEntries, setThinkingEntries] = useState<AgentThinkingLogEntry[]>([]);
  const [thinkingStreaming, setThinkingStreaming] = useState(false);
  const [thinkingLogOpen, setThinkingLogOpen] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState("");
  const thinkingRunRef = useRef<AgentThinkingLogEntry[]>([]);
  const baselineFilesRef = useRef<FileEntry[]>([]);
  const [lockedPaths, setLockedPaths] = useState<Set<string>>(new Set());
  const [aiStreaming, setAiStreaming] = useState(false);
  const [liveActions, setLiveActions] = useState<LiveBoltAction[]>([]);
  const liveActionsRef = useRef<Map<string, LiveBoltAction>>(new Map());
  const [shellLog, setShellLog] = useState("");

  const sessionQuery = useQuery({
    queryKey: ["builder-session"],
    queryFn: async () => {
      const current = await api.getCurrentBuilderSession();
      if (current.session) return current;
      return api.startBuilderSession();
    },
    enabled: !!user,
  });

  const session = sessionQuery.data?.session ?? null;
  const storefront = session?.storefront_snapshot ?? null;
  const templateOptions = STOREFRONT_TEMPLATE_OPTIONS;

  const sessionThinkingTurns = useMemo(
    () => (session ? extractThinkingLogTurns(session as BuilderSession) : []),
    [session],
  );
  const liveThinkingTurn = useMemo<ThinkingLogTurn | null>(() => {
    if (!thinkingStreaming && thinkingEntries.length === 0) return null;
    return {
      id: "live",
      userMessage: pendingUserMessage,
      entries: thinkingEntries,
    };
  }, [thinkingStreaming, thinkingEntries, pendingUserMessage]);
  const allThinkingTurns = useMemo(
    () => (liveThinkingTurn ? [...sessionThinkingTurns, liveThinkingTurn] : sessionThinkingTurns),
    [sessionThinkingTurns, liveThinkingTurn],
  );

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    const snapshot = storefront as Record<string, unknown> | null;
    const locked = (snapshot?.edit_metadata as { locked_paths?: string[] } | undefined)?.locked_paths ?? [];
    setLockedPaths(new Set(locked.filter(Boolean)));

    const loaded = loadSnapshotIntoCodeFs(storefront);
    if (loaded.length > 0) {
      baselineFilesRef.current = loaded;
    }
  }, [storefront]);

  const { files, tick: codeFsTick } = useCodeFsFiles();
  const [selectedPath, setSelectedPath] = useState<string>("index.html");
  const [draft, setDraft] = useState<string>("");
  const [dirty, setDirty] = useState(false);
  const [view, setView] = useState<"code" | "diff">("code");
  const [showTerminal, setShowTerminal] = useState(false);
  const chatPanelRef = usePanelRef();
  const filesPanelRef = usePanelRef();
  const editorPanelRef = usePanelRef();
  const previewPanelRef = usePanelRef();
  const outerGroupRef = useGroupRef();
  const innerGroupRef = useGroupRef();
  const chatPanel = useWorkbenchPanelCollapsed();
  const filesPanel = useWorkbenchPanelCollapsed();
  const editorPanel = useWorkbenchPanelCollapsed();
  const previewPanel = useWorkbenchPanelCollapsed();

  const allWorkspaceCollapsed =
    filesPanel.collapsed && editorPanel.collapsed && previewPanel.collapsed;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const outer = outerGroupRef.current;
      if (!outer) return;
      if (allWorkspaceCollapsed) {
        outer.setLayout({
          "workbench-chat": 90,
          "workbench-workspace": 10,
        });
        return;
      }
      const layout = outer.getLayout();
      if (layout["workbench-chat"] > 50) {
        outer.setLayout({
          "workbench-chat": 22,
          "workbench-workspace": 78,
        });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [allWorkspaceCollapsed, outerGroupRef]);

  useEffect(() => {
    if (allWorkspaceCollapsed) return;
    const frame = requestAnimationFrame(() => {
      const inner = innerGroupRef.current;
      if (!inner) return;

      const collapsed = {
        "workbench-files": filesPanel.collapsed,
        "workbench-editor": editorPanel.collapsed,
        "workbench-preview": previewPanel.collapsed,
      };
      const collapsedCount = Object.values(collapsed).filter(Boolean).length;
      if (collapsedCount === 0) return;

      const remaining = 100 - collapsedCount * 5;
      const weights = {
        "workbench-files": 18,
        "workbench-editor": 34,
        "workbench-preview": 48,
      };
      const openIds = (["workbench-files", "workbench-editor", "workbench-preview"] as const).filter(
        (id) => !collapsed[id],
      );
      const weightSum = openIds.reduce((sum, id) => sum + weights[id], 0);
      const layout: Record<string, number> = {};
      for (const [id, isCollapsed] of Object.entries(collapsed)) {
        if (isCollapsed) layout[id] = 5;
      }
      for (const id of openIds) {
        layout[id] = (weights[id] / weightSum) * remaining;
      }
      inner.setLayout(layout);
    });
    return () => cancelAnimationFrame(frame);
  }, [
    allWorkspaceCollapsed,
    filesPanel.collapsed,
    editorPanel.collapsed,
    previewPanel.collapsed,
    innerGroupRef,
  ]);

  const baselineMap = useMemo(() => toFileMap(baselineFilesRef.current), [storefront, files.length]);

  useEffect(() => {
    if (files.length === 0) return;
    if (files.some((f) => f.path === selectedPath)) return;
    setSelectedPath(files[0]!.path);
  }, [files, selectedPath]);

  useEffect(() => {
    const content = codeFs.readFile(selectedPath) ?? "";
    if (!dirty || aiStreaming) {
      setDraft(content);
      if (aiStreaming) setDirty(false);
    }
  }, [selectedPath, codeFsTick, dirty, aiStreaming]);

  const modifiedPaths = useMemo(
    () => new Set(computeModifiedPaths(baselineFilesRef.current, files)),
    [files, codeFsTick],
  );

  const streamingPaths = useMemo(
    () =>
      new Set(
        liveActions
          .filter((entry) => entry.status === "streaming" && entry.action.filePath)
          .map((entry) => entry.action.filePath!),
      ),
    [liveActions],
  );

  const upsertLiveAction = useCallback((entry: LiveBoltAction) => {
    liveActionsRef.current.set(entry.id, entry);
    setLiveActions([...liveActionsRef.current.values()]);
  }, []);

  const boltStream = useMemo<BoltStreamCallbacks>(
    () => ({
      onActionOpen: (action) => {
        const id = actionLiveId(action);
        upsertLiveAction({
          id,
          action,
          status: "streaming",
        });
        if (action.type === "file" && action.filePath) {
          setSelectedPath((prev) =>
            prev === "index.html" && files.length > 1 ? action.filePath! : prev || action.filePath!,
          );
        }
      },
      onActionStream: (action) => {
        if (action.type !== "file" || !action.filePath) return;
        upsertLiveAction({
          id: action.filePath,
          action,
          status: "streaming",
        });
      },
      onActionComplete: (action, result) => {
        const id = actionLiveId(action);
        upsertLiveAction({
          id,
          action,
          status: result.ok ? "complete" : "failed",
          error: result.ok ? undefined : result.error,
        });
      },
      onShellOutput: (chunk) => {
        setShellLog((prev) => (prev + chunk).slice(-12_000));
      },
    }),
    [files.length, upsertLiveAction],
  );

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

  const handleSessionResponse = (
    data: Awaited<ReturnType<typeof streamAndPersistBuilderMessage>>,
  ) => {
    queryClient.setQueryData(["builder-session"], data);
    const nextStorefront = data.storefront ?? data.session?.storefront_snapshot ?? null;
    const localHasFiles = codeFs.listFiles().length > 0;
    if (nextStorefront && (snapshotHasCustomFiles(nextStorefront) || !localHasFiles)) {
      const loaded = loadSnapshotIntoCodeFs(nextStorefront);
      if (loaded.length > 0) {
        baselineFilesRef.current = loaded;
      }
    }
  };

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const activeSession = session ?? (await api.startBuilderSession()).session;
      if (!activeSession) throw new Error("Could not start builder session");

      thinkingRunRef.current = [];
      setPendingUserMessage(message);
      setThinkingEntries([]);
      setThinkingStreaming(true);
      setAiStreaming(true);
      liveActionsRef.current = new Map();
      setLiveActions([]);
      setShellLog("");

      try {
        const currentFiles = codeFs.exportFiles();
        const contextHints: WorkbenchContextHints = {
          selectedPath,
          modifiedPaths: computeModifiedPaths(baselineFilesRef.current, currentFiles),
          lastWrittenPaths: lastWrittenPathsFromSession(activeSession.messages),
        };

        const sessionWithLocks: BuilderSession = {
          ...(activeSession as BuilderSession),
          storefront_snapshot: {
            ...((activeSession as BuilderSession).storefront_snapshot ?? ({} as StorefrontContent)),
            edit_metadata: {
              ...(((activeSession as BuilderSession).storefront_snapshot?.edit_metadata ?? {}) as Record<
                string,
                unknown
              >),
              locked_paths: [...lockedPaths],
            } as never,
          },
        };

        return await streamAndPersistBuilderMessage({
          session: sessionWithLocks,
          message,
          templateOptions,
          lockedPaths: [...lockedPaths],
          boltStream,
          contextHints,
          onLog: (entry) => {
            thinkingRunRef.current = [...thinkingRunRef.current, entry];
            setThinkingEntries(thinkingRunRef.current);
          },
        });
      } finally {
        setAiStreaming(false);
        setThinkingEntries([]);
        setThinkingStreaming(false);
        setPendingUserMessage("");
        thinkingRunRef.current = [];
      }
    },
    onSuccess: handleSessionResponse,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not send message"),
  });

  const applyColor = useMutation({
    mutationFn: async ({ color, label }: { color: string; label: string }) => {
      if (!session) throw new Error("No active builder session");
      return applyBuilderBrandColor({ session, color, label });
    },
    onSuccess: handleSessionResponse,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not apply color"),
  });

  const uploadMedia = useMutation({
    mutationFn: async ({ target, file }: { target: Parameters<typeof applyBuilderMedia>[0]["target"]; file: File }) => {
      if (!session?.store) throw new Error("Create your store before uploading images");
      const { url } = await api.uploadStorefrontImage(session.store.id, file);
      return applyBuilderMedia({ session, target, url });
    },
    onSuccess: handleSessionResponse,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not upload image"),
  });

  const clearChat = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("No active builder session");
      return api.clearBuilderChat(session.id);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["builder-session"], data);
      toast.success("Chat cleared");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not clear chat"),
  });

  const persist = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("No builder session");
      const next: StorefrontContent = {
        ...(session.storefront_snapshot ?? ({} as StorefrontContent)),
        custom_files: codeFs.exportFiles() as never,
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
      const loaded = loadSnapshotIntoCodeFs(data.storefront ?? data.session?.storefront_snapshot);
      if (loaded.length > 0) baselineFilesRef.current = loaded;
      toast.success("Saved to session");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save"),
  });

  if (loading || !user || sessionQuery.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const chatBusy = sendMessage.isPending || applyColor.isPending || uploadMedia.isPending;
  const hasThinkingHistory = allThinkingTurns.length > 0;
  const hasFiles = files.length > 0;
  const title = session.store?.business_name ?? "StoreHause";
  const currentContent = codeFs.readFile(selectedPath) ?? "";
  const baselineContent = baselineMap.get(selectedPath) ?? "";
  const hasDiff = baselineContent !== currentContent;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] min-w-0 flex-col overflow-hidden px-6 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-ink-soft">Code workbench</div>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            Prompt the AI to edit your site, then inspect files, code, and live preview together.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/builder"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-ink hover:bg-secondary"
          >
            <PanelLeft className="h-4 w-4" />
            Template builder
          </Link>
          <Link
            href="/admin/builder/thinking"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-ink hover:bg-secondary"
          >
            <Sparkles className="h-4 w-4" />
            AI log
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

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <ResizablePanelGroup
          id="workbench-main"
          groupRef={outerGroupRef}
          orientation="horizontal"
          className="h-full min-h-0"
        >
          <ResizablePanel
            id="workbench-chat"
            panelRef={chatPanelRef}
            defaultSize={22}
            minSize={16}
            collapsible
            collapsedSize={5}
            onResize={chatPanel.onResize}
            className="min-h-0 min-w-0"
          >
            <div className="flex h-full min-h-0 min-w-0 overflow-hidden border-r border-border">
              {chatPanel.collapsed ? (
                <CollapsedPanelRail
                  label="AI Chat"
                  side="left"
                  onExpand={() => chatPanelRef.current?.expand()}
                />
              ) : (
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  <WorkbenchPanelHeader title="AI Chat" panelRef={chatPanelRef} collapseSide="left" />
                  {(aiStreaming || liveActions.length > 0 || shellLog) ? (
                    <div className="shrink-0 border-b border-border px-3 py-2">
                      <WorkbenchLiveActions actions={liveActions} streaming={aiStreaming} shellLog={shellLog} />
                    </div>
                  ) : null}
                  <BuilderChatPanel
                    embedded
                    session={session as BuilderSession}
                    variant="code"
                    sending={chatBusy}
                    generating={sendMessage.isPending}
                    clearing={clearChat.isPending}
                    thinkingEntries={thinkingEntries}
                    thinkingStreaming={thinkingStreaming}
                    hasThinkingHistory={hasThinkingHistory}
                    onOpenThinkingLog={() => setThinkingLogOpen(true)}
                    onSendMessage={(message) => sendMessage.mutate(message)}
                    onApplyColor={(color, label) => applyColor.mutate({ color, label })}
                    onUploadMedia={(target, file) => uploadMedia.mutate({ target, file })}
                    onClearChat={() => clearChat.mutate()}
                  />
                </div>
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel id="workbench-workspace" defaultSize={78} minSize={24} className="min-h-0 min-w-0">
            <ResizablePanelGroup
              id="workbench-workspace-inner"
              groupRef={innerGroupRef}
              orientation="horizontal"
              className="h-full min-h-0"
            >
              <ResizablePanel
                id="workbench-files"
                panelRef={filesPanelRef}
                defaultSize={18}
                minSize={12}
                collapsible
                collapsedSize={5}
                onResize={filesPanel.onResize}
                className="min-h-0 min-w-0"
              >
                <div className="flex h-full min-h-0 min-w-0 overflow-hidden border-r border-border bg-background">
                  {filesPanel.collapsed ? (
                    <CollapsedPanelRail
                      label="Files"
                      side="left"
                      onExpand={() => filesPanelRef.current?.expand()}
                    />
                  ) : (
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                      <WorkbenchPanelHeader title="Files" panelRef={filesPanelRef} collapseSide="left" />
                      <div className="min-h-0 flex-1 overflow-auto p-2">
                        <WorkbenchFileTree
                          paths={files.map((f) => f.path)}
                          selectedPath={selectedPath}
                          dirtyPath={dirty ? selectedPath : null}
                          modifiedPaths={modifiedPaths}
                          streamingPaths={streamingPaths}
                          onSelect={setSelectedPath}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel
                id="workbench-editor"
                panelRef={editorPanelRef}
                defaultSize={34}
                minSize={20}
                collapsible
                collapsedSize={5}
                onResize={editorPanel.onResize}
                className="min-h-0 min-w-0 bg-background"
              >
                <div className="flex h-full min-h-0 min-w-0 overflow-hidden">
                  {editorPanel.collapsed ? (
                    <CollapsedPanelRail
                      label="Editor"
                      side="left"
                      onExpand={() => editorPanelRef.current?.expand()}
                    />
                  ) : (
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                    <WorkbenchPanelHeader
                      title={view === "code" ? `Editor — ${selectedPath}` : `Diff — ${selectedPath}`}
                      panelRef={editorPanelRef}
                      collapseSide="left"
                      actions={
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setView("code")}
                            className={cn(
                              "rounded-md border border-border px-2 py-0.5 text-[11px] font-semibold",
                              view === "code"
                                ? "bg-secondary text-ink"
                                : "bg-transparent text-ink-soft hover:bg-secondary/70 hover:text-ink",
                            )}
                          >
                            Code
                          </button>
                          <button
                            type="button"
                            onClick={() => setView("diff")}
                            className={cn(
                              "rounded-md border border-border px-2 py-0.5 text-[11px] font-semibold",
                              view === "diff"
                                ? "bg-secondary text-ink"
                                : "bg-transparent text-ink-soft hover:bg-secondary/70 hover:text-ink",
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
                              "inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[11px] font-semibold disabled:opacity-40",
                              isLocked
                                ? "bg-secondary text-ink"
                                : "bg-transparent text-ink-soft hover:bg-secondary/70 hover:text-ink",
                            )}
                            title={isLocked ? "Unlock file" : "Lock file (prevents edits and AI writes)"}
                          >
                            {isLocked ? <Unlock className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                          </button>
                        </div>
                      }
                    />
                    <div className="min-h-0 flex-1 overflow-hidden bg-secondary/20 p-2">
                      {view === "code" ? (
                        <WorkbenchCodeEditor
                          path={selectedPath}
                          value={draft}
                          onChange={(next) => {
                            setDraft(next);
                            setDirty(true);
                          }}
                          readOnly={isLocked}
                          streaming={aiStreaming}
                          className="h-full"
                        />
                      ) : (
                        <div className="grid h-full min-h-0 grid-cols-2 gap-2">
                          <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-background shadow-soft">
                            <div className="border-b border-border bg-secondary/50 px-3 py-1.5 text-[11px] font-semibold text-ink-soft">
                              Baseline (last saved)
                            </div>
                            <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[12px] leading-5 text-ink-soft">
                              {baselineContent || "(empty)"}
                            </pre>
                          </div>
                          <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-background shadow-soft">
                            <div className="border-b border-border bg-secondary/50 px-3 py-1.5 text-[11px] font-semibold text-ink-soft">
                              Current (live)
                            </div>
                            <pre className="min-h-0 flex-1 overflow-auto p-3 font-mono text-[12px] leading-5 text-ink">
                              {currentContent || "(empty)"}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                    </div>
                  )}
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              <ResizablePanel
                id="workbench-preview"
                panelRef={previewPanelRef}
                defaultSize={48}
                minSize={24}
                collapsible
                collapsedSize={5}
                onResize={previewPanel.onResize}
                className="min-h-0 min-w-0 bg-secondary/20"
              >
                <div className="flex h-full min-h-0 min-w-0 overflow-hidden">
                  {previewPanel.collapsed ? (
                    <CollapsedPanelRail
                      label="Preview"
                      side="right"
                      onExpand={() => previewPanelRef.current?.expand()}
                    />
                  ) : (
                    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                      <WorkbenchPanelHeader
                        title="Preview"
                        panelRef={previewPanelRef}
                        collapseSide="right"
                      />
                      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-3">
                        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-soft">
                          <WebContainerPreview className="min-h-0 flex-1" />
                        </div>
                        {showTerminal ? (
                          <WebContainerTerminalPanel className="h-[220px] shrink-0" />
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <BuilderThinkingLogSheet
        open={thinkingLogOpen}
        onOpenChange={setThinkingLogOpen}
        turns={allThinkingTurns}
        streaming={thinkingStreaming}
      />
    </div>
  );
}
