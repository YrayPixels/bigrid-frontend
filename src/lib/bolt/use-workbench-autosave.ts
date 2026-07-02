"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BuilderSession, BuilderSessionResponse } from "@/lib/api/types";
import { api } from "@/lib/api/client";
import {
  buildWorkbenchProjectPayload,
  workbenchFilesFingerprint,
} from "@/lib/bolt/workbench-persist";
import { codeFs } from "@/lib/code-fs";

export type WorkbenchSaveState = "idle" | "pending" | "saving" | "saved" | "error";

type Args = {
  session: BuilderSession | null;
  lockedPaths: Set<string>;
  enabled: boolean;
  codeRevision: number;
  debounceMs?: number;
  prepareForSave?: () => void;
  onSaved?: (data: BuilderSessionResponse) => void;
};

export function useWorkbenchAutoSave({
  session,
  lockedPaths,
  enabled,
  codeRevision,
  debounceMs = 2500,
  prepareForSave,
  onSaved,
}: Args) {
  const lastSavedRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const savingRef = useRef(false);
  const [saveState, setSaveState] = useState<WorkbenchSaveState>("idle");

  const markSaved = useCallback((fingerprint?: string) => {
    lastSavedRef.current = fingerprint ?? workbenchFilesFingerprint();
    setSaveState("saved");
  }, []);

  useEffect(() => {
    if (!session) return;
    lastSavedRef.current = null;
    setSaveState("idle");
  }, [session?.id]);

  const flushSave = useCallback(async () => {
    if (!session || !enabled) return false;
    if (codeFs.exportFiles().length === 0) return false;

    const fingerprint = workbenchFilesFingerprint();
    if (fingerprint === lastSavedRef.current) return true;
    if (savingRef.current) return false;

    savingRef.current = true;
    setSaveState("saving");

    try {
      prepareForSave?.();
      const payload = buildWorkbenchProjectPayload(lockedPaths);
      const data = await api.saveBuilderProject(session.id, payload);
      lastSavedRef.current = fingerprint;
      onSaved?.(data);
      setSaveState("saved");
      return true;
    } catch {
      setSaveState("error");
      return false;
    } finally {
      savingRef.current = false;
    }
  }, [session, enabled, lockedPaths, onSaved, prepareForSave]);

  useEffect(() => {
    if (!enabled || !session || codeFs.exportFiles().length === 0) return;

    const fingerprint = workbenchFilesFingerprint();
    if (fingerprint === lastSavedRef.current) {
      setSaveState((prev) => (prev === "pending" || prev === "saving" ? "saved" : prev));
      return;
    }

    setSaveState("pending");
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      void flushSave();
    }, debounceMs);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [session?.id, enabled, codeRevision, debounceMs, flushSave]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!enabled || !session) return;
      const fingerprint = workbenchFilesFingerprint();
      if (fingerprint === lastSavedRef.current) return;
      void flushSave();
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [enabled, session, flushSave]);

  return { saveState, flushSave, markSaved };
}
