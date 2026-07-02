import type { BuilderSession } from "@/lib/api/types";
import type { CodeFile } from "@/lib/code-fs";
import { codeFs } from "@/lib/code-fs";
import type { ContextSelectionResult } from "@/lib/bolt/select-context";
import type { BuilderChatHistoryEntry } from "@/lib/storefront-builder/chat-history";

export type BoltChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** Prefer in-memory editor state; fall back to the persisted session snapshot. */
export function resolveLiveWorkbenchFiles(
  storefront: Record<string, unknown> | null | undefined,
): CodeFile[] {
  const live = codeFs.exportFiles();
  if (live.length > 0) return live;

  const customFiles = storefront?.custom_files;
  if (Array.isArray(customFiles) && customFiles.length > 0) {
    codeFs.loadFiles(customFiles as CodeFile[]);
    return codeFs.exportFiles();
  }

  const customCode = storefront?.custom_code;
  if (typeof customCode === "string" && customCode.trim()) {
    codeFs.clear();
    codeFs.writeFile("index.html", customCode);
    return codeFs.exportFiles();
  }

  return [];
}

export function buildLastBoltActionSummary(session: BuilderSession): string | null {
  for (let i = session.messages.length - 1; i >= 0; i--) {
    const msg = session.messages[i];
    if (msg.role !== "assistant" || !msg.payload || typeof msg.payload !== "object") continue;

    const type = msg.payload.type;
    if (type !== "custom_site_edited" && type !== "custom_site_generated") continue;

    const files = Array.isArray(msg.payload.files)
      ? (msg.payload.files as string[]).filter(Boolean)
      : [];
    const log = Array.isArray(msg.payload.bolt_action_log)
      ? (msg.payload.bolt_action_log as Array<{
          ok?: boolean;
          action?: { filePath?: string; type?: string };
          error?: string;
        }>)
      : [];

    const written = log
      .filter((entry) => entry.ok)
      .map((entry) => entry.action?.filePath)
      .filter((path): path is string => Boolean(path));
    const failed = log
      .filter((entry) => !entry.ok)
      .map((entry) => `${entry.action?.filePath ?? entry.action?.type ?? "action"}: ${entry.error ?? "failed"}`);

    const parts: string[] = [];
    if (written.length > 0) parts.push(`Files written: ${written.join(", ")}`);
    else if (files.length > 0) parts.push(`Project files after edit: ${files.join(", ")}`);
    if (failed.length > 0) parts.push(`Skipped/failed: ${failed.join("; ")}`);
    if (msg.content.trim()) parts.push(`Assistant: ${msg.content.trim()}`);

    return parts.length > 0 ? parts.join("\n") : null;
  }

  return null;
}

export function buildBoltCodeEditMessages(args: {
  systemPrompt: string;
  history: BuilderChatHistoryEntry[];
  instruction: string;
  business: Record<string, unknown>;
  files: CodeFile[];
  contextSelection?: ContextSelectionResult;
  lastActionSummary?: string | null;
  lockedPaths?: string[];
}): BoltChatMessage[] {
  const messages: BoltChatMessage[] = [{ role: "system", content: args.systemPrompt }];

  if (args.lastActionSummary) {
    messages.push({
      role: "assistant",
      content: `Summary of the last code edit:\n${args.lastActionSummary}`,
    });
  }

  for (const entry of args.history) {
    const content = entry.content.trim();
    if (!content) continue;
    messages.push({ role: entry.role, content });
  }

  const lockedPaths = args.lockedPaths?.filter(Boolean) ?? [];
  const selection = args.contextSelection;
  const contextFiles = selection?.included ?? args.files;
  const allPaths = selection?.allPaths ?? args.files.map((f) => f.path);

  messages.push({
    role: "user",
    content: JSON.stringify({
      instruction: args.instruction,
      business: args.business,
      files: contextFiles,
      project_file_paths: allPaths,
      ...(selection?.usedSmartContext && selection.omittedPaths.length > 0
        ? {
            omitted_file_paths: selection.omittedPaths,
            context_note: `Full contents included for ${contextFiles.length} of ${allPaths.length} project files. Other paths are listed in project_file_paths only — include them in your edit if the task requires changes there.`,
          }
        : {}),
      ...(lockedPaths.length > 0 ? { locked_paths: lockedPaths } : {}),
    }),
  });

  return messages;
}

export function appendHistoryToMessages(
  base: BoltChatMessage[],
  history: BuilderChatHistoryEntry[],
): BoltChatMessage[] {
  const next = [...base];
  for (const entry of history) {
    const content = entry.content.trim();
    if (!content) continue;
    next.push({ role: entry.role, content });
  }
  return next;
}
