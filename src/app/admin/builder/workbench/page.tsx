"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileCode2, Loader2, Lock, PanelLeft, Save, Sparkles, Unlock } from "lucide-react";
import { toast } from "sonner";
import { BuilderChatPanel } from "@/components/admin/builder/builder-chat-panel";
import { BuilderThinkingLogSheet } from "@/components/admin/builder/builder-thinking-log-sheet";
import { WorkbenchCodeEditor } from "@/components/admin/builder/workbench-code-editor";
import { WorkbenchFileTree } from "@/components/admin/builder/workbench-file-tree";
import type { LiveBoltAction } from "@/components/admin/builder/workbench-live-actions";
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
import { merchantCache, useBuilderSessionOrStart, useStorefrontTemplates } from "@/hooks/use-merchant-queries";
import { codeFs } from "@/lib/code-fs";
import { seedBuildItUpIfNeeded } from "@/lib/bolt/seed-template";
import { needsBoltTemplateSeed, preferredWorkbenchFilePath } from "@/lib/bolt/project-utils";
import { extractTaggedPaths } from "@/lib/bolt/workbench-mentions";
import { scrollWorkbenchEditorToLine } from "@/lib/bolt/workbench-editor-nav";
import type { BuilderSession, StorefrontContent } from "@/lib/api/types";
import { STOREFRONT_TEMPLATE_OPTIONS } from "@/lib/api/types";
import { getConcreteTemplateOptions } from "@/lib/storefront/template-registry";
import {
  applyBuilderBrandColor,
  applyBuilderLogo,
  applyBuilderMedia,
  streamAndPersistBuilderMessage,
  type BoltStreamCallbacks,
  type WorkbenchContextHints,
  removeBuilderLogo,
} from "@/lib/storefront-builder/client";
import { appendWebContainerOutput } from "@/lib/bolt/webcontainer-output";
import { formatErrorsForAgent, getLatestWorkbenchErrors } from "@/lib/bolt/workbench-preview-errors";
import { buildWorkbenchProjectPayload } from "@/lib/bolt/workbench-persist";
import { useWorkbenchAutoSave } from "@/lib/bolt/use-workbench-autosave";
import { useWorkbenchEditorPreviewSync } from "@/lib/bolt/use-workbench-editor-preview-sync";
import { lastWrittenPathsFromSession } from "@/lib/bolt/select-context";
import type { WorkbenchEditStep } from "@/lib/bolt/workbench-edit-agent";
import {
  formatLineChangePreview,
  revertEditCheckpoint,
  type FileDiffSummary,
  type WorkbenchEditCheckpoint,
} from "@/lib/bolt/workbench-diff";
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
  if (snapshot?.custom_project && typeof snapshot.custom_project === "object") {
    return true;
  }
  return false;
}

function extractLastEditFromSession(session: BuilderSession | null): {
  checkpoint: WorkbenchEditCheckpoint | null;
  diffs: FileDiffSummary[];
} {
  if (!session) return { checkpoint: null, diffs: [] };

  for (let i = session.messages.length - 1; i >= 0; i--) {
    const msg = session.messages[i];
    if (msg.role !== "assistant" || !msg.payload || typeof msg.payload !== "object") continue;
    const payload = msg.payload as Record<string, unknown>;
    if (payload.type !== "custom_site_edited" || !payload.edit_checkpoint) continue;

    return {
      checkpoint: payload.edit_checkpoint as WorkbenchEditCheckpoint,
      diffs: Array.isArray(payload.file_diffs) ? (payload.file_diffs as FileDiffSummary[]) : [],
    };
  }

  return { checkpoint: null, diffs: [] };
}

function loadSnapshotIntoCodeFs(storefront: StorefrontContent | null | undefined) {
  // Live editor state is canonical — never clobber in-memory files from a stale snapshot.
  const existing = codeFs.exportFiles();
  if (existing.length > 0) return existing as FileEntry[];

  const snapshot = storefront as Record<string, unknown> | null | undefined;
  const customFiles = snapshot?.custom_files as unknown;
  const customCode = snapshot?.custom_code as unknown;

  if (Array.isArray(customFiles)) {
    codeFs.loadFiles(customFiles as never);
    return codeFs.exportFiles() as FileEntry[];
  }

  if (typeof customCode === "string" && customCode.trim()) {
    codeFs.writeFile("index.html", customCode);
    return [{ path: "index.html", content: customCode }];
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
  const loadedSessionRef = useRef<string | null>(null);
  const legacyMigrationRef = useRef<string | null>(null);
  const [lockedPaths, setLockedPaths] = useState<Set<string>>(new Set());
  const [aiStreaming, setAiStreaming] = useState(false);
  const [liveActions, setLiveActions] = useState<LiveBoltAction[]>([]);
  const liveActionsRef = useRef<Map<string, LiveBoltAction>>(new Map());
  const [lastCheckpoint, setLastCheckpoint] = useState<WorkbenchEditCheckpoint | null>(null);
  const [lastDiffs, setLastDiffs] = useState<FileDiffSummary[]>([]);
  const [agentSteps, setAgentSteps] = useState<WorkbenchEditStep[]>([]);

  const sessionQuery = useBuilderSessionOrStart({ enabled: !!user });
  const { data: activeTemplateOptions = STOREFRONT_TEMPLATE_OPTIONS } = useStorefrontTemplates({
    enabled: !!user,
  });

  const session = sessionQuery.data?.session ?? null;
  const storefront = session?.storefront_snapshot ?? null;
  const templateOptions = useMemo(
    () => getConcreteTemplateOptions(activeTemplateOptions),
    [activeTemplateOptions],
  );

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
    if (!session) return;
    const { checkpoint, diffs } = extractLastEditFromSession(session as BuilderSession);
    if (checkpoint) {
      setLastCheckpoint(checkpoint);
      setLastDiffs(diffs);
    }
  }, [session?.id, session?.messages.length]);

  useEffect(() => {
    if (!session || !storefront) return;

    const snapshot = storefront as Record<string, unknown> | null;
    const locked = (snapshot?.edit_metadata as { locked_paths?: string[] } | undefined)?.locked_paths ?? [];
    setLockedPaths(new Set(locked.filter(Boolean)));

    const localCount = codeFs.listFiles().length;
    // Never reload snapshot over live editor files (prevents losing prior AI edits).
    if (localCount > 0) {
      loadedSessionRef.current = session.id;
      return;
    }

    const hasInlineFiles =
      Array.isArray(snapshot?.custom_files) && (snapshot.custom_files as unknown[]).length > 0;
    const hasProjectPointer = !!snapshot?.custom_project;

    const shouldLoadFromSnapshot =
      loadedSessionRef.current !== session.id ||
      (localCount === 0 && (hasInlineFiles || hasProjectPointer));

    if (!shouldLoadFromSnapshot) return;

    loadedSessionRef.current = session.id;

    if (hasInlineFiles || typeof snapshot?.custom_code === "string") {
      const loaded = loadSnapshotIntoCodeFs(storefront);
      if (loaded.length > 0) {
        baselineFilesRef.current = loaded;
      }
      return;
    }

    if (hasProjectPointer) {
      void api.getBuilderProject(session.id).then((project) => {
        if (project.custom_files.length === 0) return;
        const loaded = loadSnapshotIntoCodeFs({
          custom_files: project.custom_files,
        } as unknown as StorefrontContent);
        if (loaded.length > 0) {
          baselineFilesRef.current = loaded;
        }
      });
    }
  }, [session?.id, storefront]);

  const { files, tick: codeFsTick } = useCodeFsFiles();
  const [selectedPath, setSelectedPath] = useState<string>(() =>
    preferredWorkbenchFilePath(codeFs.listFiles()),
  );
  const [draft, setDraft] = useState<string>(() => codeFs.readFile(selectedPath) ?? "");
  const [dirty, setDirty] = useState(false);

  const selectFile = useCallback(
    (path: string) => {
      if (dirty && selectedPath) {
        codeFs.writeFile(selectedPath, draft);
      }
      setDirty(false);
      setSelectedPath(path);
      setDraft(codeFs.readFile(path) ?? "");
    },
    [dirty, selectedPath, draft],
  );
  const [view, setView] = useState<"code" | "diff">("code");
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
    if (!session) return;
    if (legacyMigrationRef.current === session.id) return;
    if (files.length === 0 || !needsBoltTemplateSeed(files)) return;

    legacyMigrationRef.current = session.id;
    void seedBuildItUpIfNeeded(files).then((didSeed) => {
      if (!didSeed) return;
      const seeded = codeFs.exportFiles();
      baselineFilesRef.current = seeded.map((file) => ({
        path: file.path,
        content: file.content,
      }));
      const nextPath = preferredWorkbenchFilePath(seeded.map((file) => file.path));
      setDirty(false);
      setSelectedPath(nextPath);
      setDraft(codeFs.readFile(nextPath) ?? "");
    });
  }, [session?.id, files]);

  useEffect(() => {
    if (files.length === 0) return;
    if (files.some((f) => f.path === selectedPath)) return;
    const nextPath = preferredWorkbenchFilePath(files.map((file) => file.path));
    setSelectedPath(nextPath);
    setDraft(codeFs.readFile(nextPath) ?? "");
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
          const fallback = preferredWorkbenchFilePath(files.map((file) => file.path));
          setSelectedPath((prev) =>
            (prev === fallback || prev === "index.html") && files.length > 1
              ? action.filePath!
              : prev || action.filePath!,
          );
          setDraft(codeFs.readFile(action.filePath) ?? "");
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
        appendWebContainerOutput(chunk);
      },
      onAgentStep: (step) => {
        setAgentSteps((prev) => {
          const existing = prev.findIndex((s) => s.id === step.id);
          if (existing >= 0) {
            const next = [...prev];
            next[existing] = step;
            return next;
          }
          return [...prev, step];
        });
        if (step.type === "patch" && step.status === "complete" && step.path) {
          const path = step.path!;
          setSelectedPath((prev) => prev || path);
          setDraft(codeFs.readFile(path) ?? "");
        }
      },
    }),
    [files.length, upsertLiveAction],
  );

  const isLocked = lockedPaths.has(selectedPath);

  useWorkbenchEditorPreviewSync({
    path: selectedPath,
    draft,
    dirty,
    enabled: files.length > 0 && !isLocked && !aiStreaming,
  });

  const saveFile = () => {
    codeFs.writeFile(selectedPath, draft);
    setDirty(false);
  };

  const applySessionResponse = useCallback(
    (data: Awaited<ReturnType<typeof streamAndPersistBuilderMessage>>) => {
      const live = codeFs.exportFiles();
      const mergedSession =
        live.length > 0 && data.session?.storefront_snapshot
          ? {
              ...data.session,
              storefront_snapshot: {
                ...data.session.storefront_snapshot,
                custom_files: live as never,
                custom_code: codeFs.getMainHtml(),
              },
            }
          : data.session;

      merchantCache.setBuilderSession(queryClient, {
        ...data,
        session: mergedSession,
        storefront: mergedSession?.storefront_snapshot ?? data.storefront,
      });

      const { checkpoint, diffs } = extractLastEditFromSession(mergedSession ?? null);
      if (checkpoint) {
        setLastCheckpoint(checkpoint);
        setLastDiffs(diffs);
      }

      if (live.length > 0) {
        baselineFilesRef.current = live.map((file) => ({
          path: file.path,
          content: file.content,
        }));
        return;
      }

      const nextStorefront = data.storefront ?? mergedSession?.storefront_snapshot ?? null;
      if (nextStorefront && snapshotHasCustomFiles(nextStorefront)) {
        const loaded = loadSnapshotIntoCodeFs(nextStorefront);
        if (loaded.length > 0) {
          baselineFilesRef.current = loaded;
        }
      }
    },
    [queryClient],
  );

  const toggleLock = () => {
    setLockedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(selectedPath)) next.delete(selectedPath);
      else next.add(selectedPath);
      return next;
    });
  };

  const handleSessionResponse = useCallback(
    (data: Awaited<ReturnType<typeof streamAndPersistBuilderMessage>>) => {
      applySessionResponse(data);
    },
    [applySessionResponse],
  );

  const revertLastEdit = () => {
    if (!lastCheckpoint) return;
    const paths = Object.keys(lastCheckpoint.files);
    revertEditCheckpoint(lastCheckpoint);
    baselineFilesRef.current = codeFs.exportFiles().map((file) => ({
      path: file.path,
      content: file.content,
    }));
    setLastCheckpoint(null);
    setLastDiffs([]);
    setDirty(false);
    toast.success(`Reverted AI changes in ${paths.length} file${paths.length === 1 ? "" : "s"}`);
  };

  const prepareWorkbenchSave = useCallback(() => {
    if (dirty && selectedPath) {
      codeFs.writeFile(selectedPath, draft);
      setDirty(false);
    }
  }, [dirty, selectedPath, draft]);

  const persistSnapshot = useCallback(async () => {
    if (!session) throw new Error("No builder session");
    prepareWorkbenchSave();
    const payload = buildWorkbenchProjectPayload(lockedPaths);
    return api.saveBuilderProject(session.id, payload);
  }, [session, lockedPaths, prepareWorkbenchSave]);

  const { saveState, markSaved } = useWorkbenchAutoSave({
    session,
    lockedPaths,
    enabled: files.length > 0 && !aiStreaming,
    codeRevision: codeFsTick + (dirty ? 1 : 0),
    prepareForSave: prepareWorkbenchSave,
    onSaved: applySessionResponse,
  });

  const initialLoadMarkedRef = useRef(false);

  useEffect(() => {
    initialLoadMarkedRef.current = false;
    legacyMigrationRef.current = null;
  }, [session?.id]);

  useEffect(() => {
    if (!session || files.length === 0 || initialLoadMarkedRef.current) return;
    if (loadedSessionRef.current !== session.id) return;
    if (aiStreaming) return;
    initialLoadMarkedRef.current = true;
    markSaved();
  }, [session?.id, files.length, aiStreaming, markSaved]);

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
      setAgentSteps([]);

      try {
        if (dirty && selectedPath) {
          codeFs.writeFile(selectedPath, draft);
          setDirty(false);
        }

        const currentFiles = codeFs.exportFiles();
        const filePathList = currentFiles.map((file) => file.path);
        const taggedPaths = extractTaggedPaths(message, filePathList);
        const previewErrorText = formatErrorsForAgent(getLatestWorkbenchErrors());
        const contextHints: WorkbenchContextHints = {
          selectedPath,
          taggedPaths,
          modifiedPaths: computeModifiedPaths(baselineFilesRef.current, currentFiles),
          lastWrittenPaths: lastWrittenPathsFromSession(activeSession.messages),
          ...(taggedPaths.length > 0 ? { searchPaths: taggedPaths } : {}),
          ...(previewErrorText ? { previewErrors: previewErrorText } : {}),
        };

        const sessionWithLocks: BuilderSession = {
          ...(activeSession as BuilderSession),
          storefront_snapshot: {
            ...((activeSession as BuilderSession).storefront_snapshot ?? ({} as StorefrontContent)),
            ...(codeFs.exportFiles().length > 0
              ? {
                  custom_files: codeFs.exportFiles() as never,
                  custom_code: codeFs.getMainHtml(),
                }
              : {}),
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
        setThinkingStreaming(false);
      }
    },
    onSuccess: (data) => {
      handleSessionResponse(data);
      markSaved();
      setAgentSteps([]);
      liveActionsRef.current = new Map();
      setLiveActions([]);
      setThinkingEntries([]);
      setPendingUserMessage("");
      thinkingRunRef.current = [];
    },
    onError: (error) => {
      setThinkingEntries([]);
      setPendingUserMessage("");
      thinkingRunRef.current = [];
      toast.error(error instanceof Error ? error.message : "Could not send message");
    },
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

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      if (!session?.store) throw new Error("Create your store before uploading a logo");
      const { url } = await api.uploadStorefrontImage(session.store.id, file);
      const logoResponse = await applyBuilderLogo({ session, url });
      if (!snapshotHasCustomFiles(session.storefront_snapshot)) {
        return logoResponse;
      }

      const updatedSession = (logoResponse.session ?? session) as BuilderSession;
      return streamAndPersistBuilderMessage({
        session: updatedSession,
        message: `Update the site header/navigation to use this logo image: ${url}`,
        templateOptions,
      });
    },
    onSuccess: handleSessionResponse,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not upload logo"),
  });

  const removeLogo = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("No active builder session");
      const logoResponse = await removeBuilderLogo({ session });
      if (!snapshotHasCustomFiles(session.storefront_snapshot)) {
        return logoResponse;
      }

      const updatedSession = (logoResponse.session ?? session) as BuilderSession;
      return streamAndPersistBuilderMessage({
        session: updatedSession,
        message: "Remove the logo from the site header and show the business name as text instead",
        templateOptions,
      });
    },
    onSuccess: handleSessionResponse,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not remove logo"),
  });

  const clearChat = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("No active builder session");
      return api.clearBuilderChat(session.id);
    },
    onSuccess: (data) => {
      merchantCache.setBuilderSession(queryClient, data);
      toast.success("Chat cleared");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not clear chat"),
  });

  const persist = useMutation({
    mutationFn: persistSnapshot,
    onSuccess: (data) => {
      applySessionResponse(data);
      markSaved();
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

  const chatBusy = sendMessage.isPending || applyColor.isPending || uploadMedia.isPending || uploadLogo.isPending || removeLogo.isPending;
  const hasThinkingHistory = allThinkingTurns.length > 0;
  const hasFiles = files.length > 0;
  const title = session.store?.business_name ?? "Bizgrid";
  const currentContent = codeFs.readFile(selectedPath) ?? "";
  const baselineContent = baselineMap.get(selectedPath) ?? "";
  const selectedDiff = lastDiffs.find((diff) => diff.path === selectedPath) ?? null;
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
            href="/admin/website?mode=create"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-ink hover:bg-secondary"
          >
            <PanelLeft className="h-4 w-4" />
            Website chat
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
            disabled={!hasFiles || persist.isPending || saveState === "saving"}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40"
            title="Persist current file tree to your builder session"
          >
            <FileCode2 className="h-4 w-4" />
            {persist.isPending || saveState === "saving" ? "Saving…" : "Save to session"}
          </button>
          {hasFiles ? (
            <span className="text-xs text-ink-soft">
              {saveState === "pending"
                ? "Unsaved changes"
                : saveState === "saving"
                  ? "Auto-saving…"
                  : saveState === "error"
                    ? "Save failed — retrying on next edit"
                    : saveState === "saved"
                      ? "Saved to session"
                      : null}
            </span>
          ) : null}
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
                    onUploadLogo={(file) => uploadLogo.mutate(file)}
                    onRemoveLogo={() => removeLogo.mutate()}
                    managingLogo={uploadLogo.isPending || removeLogo.isPending}
                    onClearChat={() => clearChat.mutate()}
                    liveActions={liveActions}
                    agentSteps={agentSteps}
                    aiStreaming={aiStreaming}
                    lastCheckpoint={lastCheckpoint}
                    lastDiffs={lastDiffs}
                    onRevertEdit={revertLastEdit}
                    onSelectDiffFile={(path) => {
                      selectFile(path);
                      setView("diff");
                    }}
                    onGoToPreviewError={(filePath, line) => {
                      selectFile(filePath);
                      setView("code");
                      requestAnimationFrame(() => scrollWorkbenchEditorToLine(line));
                    }}
                    projectFilePaths={files.map((file) => file.path)}
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
                          onSelect={selectFile}
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
                        <div className="flex h-full min-h-0 flex-col gap-2">
                          {selectedDiff ? (
                            <div className="shrink-0 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-ink-soft">
                              Last AI edit:{" "}
                              <span className="font-medium text-primary">+{selectedDiff.additions}</span>
                              {" / "}
                              <span className="font-medium text-destructive">-{selectedDiff.deletions}</span>
                              {selectedDiff.preview.length > 0 ? (
                                <pre className="mt-2 max-h-24 overflow-auto font-mono text-[10px] leading-4 text-ink">
                                  {selectedDiff.preview.map((change) => `${formatLineChangePreview(change)}\n`)}
                                </pre>
                              ) : null}
                            </div>
                          ) : null}
                          <div className="grid min-h-0 flex-1 grid-cols-2 gap-2">
                          <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-background shadow-soft">
                            <div className="border-b border-border bg-secondary/50 px-3 py-1.5 text-[11px] font-semibold text-ink-soft">
                              {lastCheckpoint?.files[selectedPath] ? "Before last AI edit" : "Baseline (last saved)"}
                            </div>
                            <pre className="min-h-0 flex-1 select-text overflow-auto p-3 font-mono text-[12px] leading-5 text-ink-soft">
                              {(lastCheckpoint?.files[selectedPath]?.before ?? baselineContent) || "(empty)"}
                            </pre>
                          </div>
                          <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-background shadow-soft">
                            <div className="border-b border-border bg-secondary/50 px-3 py-1.5 text-[11px] font-semibold text-ink-soft">
                              Current (live)
                            </div>
                            <pre className="min-h-0 flex-1 select-text overflow-auto p-3 font-mono text-[12px] leading-5 text-ink">
                              {currentContent || "(empty)"}
                            </pre>
                          </div>
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
                      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
                        <ResizablePanelGroup
                          id="workbench-preview-terminal"
                          orientation="vertical"
                          className="min-h-0 flex-1"
                        >
                          <ResizablePanel id="workbench-preview-frame" defaultSize={72} minSize={30}>
                            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-background shadow-soft">
                              <WebContainerPreview className="min-h-0 flex-1" />
                            </div>
                          </ResizablePanel>
                          <ResizableHandle withHandle />
                          <ResizablePanel id="workbench-preview-terminal-panel" defaultSize={28} minSize={14}>
                            <WebContainerTerminalPanel className="h-full" />
                          </ResizablePanel>
                        </ResizablePanelGroup>
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
