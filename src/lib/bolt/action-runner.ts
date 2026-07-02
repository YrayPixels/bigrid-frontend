import type { BoltAction } from "@/lib/code-parser";
import { codeFs } from "@/lib/code-fs";

export type BoltActionResult =
  | { ok: true; action: BoltAction; applied: true }
  | { ok: false; action: BoltAction; applied: false; error: string };

export type BoltActionRunner = {
  apply: (action: BoltAction) => BoltActionResult;
  getLog: () => BoltActionResult[];
  clearLog: () => void;
};

function normalizePath(path: string): string {
  return path.replace(/^\/+/, "").trim();
}

export function createBoltActionRunner(options?: {
  lockedPaths?: string[] | Set<string>;
}): BoltActionRunner {
  const log: BoltActionResult[] = [];
  const locked =
    options?.lockedPaths instanceof Set
      ? options.lockedPaths
      : new Set(Array.isArray(options?.lockedPaths) ? options!.lockedPaths.map(normalizePath) : []);

  function apply(action: BoltAction): BoltActionResult {
    if (action.type !== "file") {
      const result: BoltActionResult = {
        ok: false,
        applied: false,
        action,
        error: `Unsupported boltAction type: ${action.type}`,
      };
      log.push(result);
      return result;
    }

    const filePath = typeof action.filePath === "string" ? normalizePath(action.filePath) : "";
    if (!filePath) {
      const result: BoltActionResult = {
        ok: false,
        applied: false,
        action,
        error: "Missing filePath for file action",
      };
      log.push(result);
      return result;
    }

    if (locked.has(filePath)) {
      const result: BoltActionResult = {
        ok: false,
        applied: false,
        action,
        error: `Path is locked: ${filePath}`,
      };
      log.push(result);
      return result;
    }

    codeFs.writeFile(filePath, action.content ?? "");
    const result: BoltActionResult = { ok: true, applied: true, action };
    log.push(result);
    return result;
  }

  return {
    apply,
    getLog: () => [...log],
    clearLog: () => {
      log.splice(0, log.length);
    },
  };
}

