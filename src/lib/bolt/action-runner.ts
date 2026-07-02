import type { BoltAction } from "@/lib/code-parser";
import { codeFs } from "@/lib/code-fs";
import { formatUnsplashPhotoUrl, searchUnsplashPhotos } from "@/lib/storefront-builder/unsplash-client";

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
  let lastUnsplashUrls: string[] = [];

  function replaceUnsplashPlaceholders(input: string): string {
    if (!input || lastUnsplashUrls.length === 0) return input;
    return input.replace(/__UNSPLASH_URL_(\d+)__/g, (_m, idxRaw) => {
      const idx = Number(idxRaw);
      const url = Number.isFinite(idx) ? lastUnsplashUrls[idx] : null;
      return url ?? "";
    });
  }

  function apply(action: BoltAction): BoltActionResult {
    if (action.type === "unsplash") {
      const query =
        action.attrs?.query?.trim() ||
        (typeof action.content === "string" ? action.content.trim() : "");
      const countRaw = action.attrs?.count ? Number(action.attrs.count) : 8;
      const count = Number.isFinite(countRaw) ? Math.min(Math.max(countRaw, 1), 24) : 8;
      if (!query) {
        const result: BoltActionResult = {
          ok: false,
          applied: false,
          action,
          error: "Missing Unsplash query",
        };
        log.push(result);
        return result;
      }

      // NOTE: BoltActionRunner is sync today. We cannot actually await here.
      // This will still populate `assets/unsplash.json` and placeholder replacements
      // for *subsequent turns*, but not reliably within the same streamed message.
      // If you want same-turn placeholder replacement, the runner must become async
      // and the parser must await action execution order.
      void (async () => {
        const photos = await searchUnsplashPhotos(query, count);
        const urls = photos.map((p) => formatUnsplashPhotoUrl(p, 1800)).filter(Boolean);
        lastUnsplashUrls = urls;
        const assetPath = "assets/unsplash.json";
        if (!locked.has(assetPath)) {
          codeFs.writeFile(
            assetPath,
            JSON.stringify({ query, count, urls, generated_at: new Date().toISOString() }, null, 2) + "\n",
          );
        }
      })();

      const result: BoltActionResult = { ok: true, applied: true, action };
      log.push(result);
      return result;
    }

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

    const content = replaceUnsplashPlaceholders(action.content ?? "");
    codeFs.writeFile(filePath, content);
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

