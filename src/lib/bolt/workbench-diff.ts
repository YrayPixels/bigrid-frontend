import type { CodeFile } from "@/lib/code-fs";
import { codeFs } from "@/lib/code-fs";
import { mirrorCodeFileToWebContainer } from "@/lib/bolt/wc-file-sync";

export type FileLineChange = {
  line: number;
  before?: string;
  after?: string;
};

export type FileDiffSummary = {
  path: string;
  beforeLines: number;
  afterLines: number;
  additions: number;
  deletions: number;
  preview: FileLineChange[];
};

export type WorkbenchEditCheckpoint = {
  id: string;
  instruction: string;
  createdAt: string;
  files: Record<string, { before: string; after: string }>;
};

export function summarizeFileDiff(
  before: string,
  after: string,
  maxPreview = 10,
): Omit<FileDiffSummary, "path" | "beforeLines" | "afterLines"> {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const maxLen = Math.max(beforeLines.length, afterLines.length);

  let additions = 0;
  let deletions = 0;
  const preview: FileLineChange[] = [];

  for (let i = 0; i < maxLen; i++) {
    const b = beforeLines[i];
    const a = afterLines[i];
    if (b === a) continue;

    if (b === undefined) additions++;
    else if (a === undefined) deletions++;
    else {
      additions++;
      deletions++;
    }

    if (preview.length < maxPreview) {
      preview.push({ line: i + 1, before: b, after: a });
    }
  }

  return { additions, deletions, preview };
}

export function diffChangedFiles(
  beforeByPath: Record<string, string>,
  afterFiles: CodeFile[],
): FileDiffSummary[] {
  const diffs: FileDiffSummary[] = [];
  const afterMap = new Map(afterFiles.map((f) => [f.path.replace(/^\/+/, ""), f.content]));

  const paths = new Set([...Object.keys(beforeByPath), ...afterMap.keys()]);

  for (const path of paths) {
    const before = beforeByPath[path] ?? "";
    const after = afterMap.get(path) ?? "";
    if (before === after) continue;

    const summary = summarizeFileDiff(before, after);
    diffs.push({
      path,
      beforeLines: before.split("\n").length,
      afterLines: after.split("\n").length,
      ...summary,
    });
  }

  return diffs.sort((a, b) => a.path.localeCompare(b.path));
}

export function snapshotFileContents(files: CodeFile[], paths: string[]): Record<string, string> {
  const byPath = new Map(files.map((f) => [f.path.replace(/^\/+/, ""), f.content]));
  const snap: Record<string, string> = {};

  for (const raw of paths) {
    const path = raw.replace(/^\/+/, "");
    const content = byPath.get(path);
    if (content !== undefined) snap[path] = content;
  }

  return snap;
}

export function collectWatchPaths(
  files: CodeFile[],
  options: {
    searchPaths?: string[];
    contextPaths?: string[];
    primaryTargets?: string[];
  },
): string[] {
  const paths = new Set<string>();
  for (const list of [options.primaryTargets, options.searchPaths, options.contextPaths]) {
    for (const path of list ?? []) {
      if (path) paths.add(path.replace(/^\/+/, ""));
    }
  }

  if (paths.size === 0) {
    for (const file of files) {
      if (file.encoding !== "base64") paths.add(file.path.replace(/^\/+/, ""));
    }
  }

  return [...paths];
}

export function createEditCheckpoint(args: {
  instruction: string;
  beforeByPath: Record<string, string>;
  afterFiles: CodeFile[];
  id?: string;
}): { checkpoint: WorkbenchEditCheckpoint; diffs: FileDiffSummary[] } {
  const diffs = diffChangedFiles(args.beforeByPath, args.afterFiles);
  const files: WorkbenchEditCheckpoint["files"] = {};

  for (const diff of diffs) {
    files[diff.path] = {
      before: args.beforeByPath[diff.path] ?? "",
      after: args.afterFiles.find((f) => f.path.replace(/^\/+/, "") === diff.path)?.content ?? "",
    };
  }

  const checkpoint: WorkbenchEditCheckpoint = {
    id: args.id ?? `edit-${Date.now()}`,
    instruction: args.instruction,
    createdAt: new Date().toISOString(),
    files,
  };

  return { checkpoint, diffs };
}

export function revertEditCheckpoint(checkpoint: WorkbenchEditCheckpoint): string[] {
  const restored: string[] = [];

  for (const [path, { before }] of Object.entries(checkpoint.files)) {
    codeFs.writeFile(path, before);
    mirrorCodeFileToWebContainer({ path, content: before });
    restored.push(path);
  }

  return restored;
}

export function formatDiffSummaryForChat(diffs: FileDiffSummary[]): string {
  if (diffs.length === 0) return "No file changes detected.";

  return diffs
    .map((diff) => {
      const preview = diff.preview
        .slice(0, 3)
        .map((change) => {
          if (change.before !== undefined && change.after !== undefined) {
            return `  L${change.line}: ${change.before.trim()} → ${change.after.trim()}`;
          }
          if (change.after !== undefined) return `  L${change.line}: + ${change.after.trim()}`;
          return `  L${change.line}: - ${change.before?.trim() ?? ""}`;
        })
        .join("\n");
      return `${diff.path} (+${diff.additions}/-${diff.deletions})\n${preview}`;
    })
    .join("\n\n");
}
