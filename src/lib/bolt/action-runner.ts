import type { BoltAction } from "@/lib/code-parser";
import { codeFs } from "@/lib/code-fs";
import { mirrorCodeFileToWebContainer } from "@/lib/bolt/wc-file-sync";
import { ensureDependenciesInstalled, startDevServer } from "@/lib/bolt/webcontainer-runtime";
import { runWebContainerCommand } from "@/lib/bolt/webcontainer-terminal";
import { formatUnsplashPhotoUrl, searchUnsplashPhotos } from "@/lib/storefront-builder/unsplash-client";

export type BoltActionResult =
  | { ok: true; action: BoltAction; applied: true }
  | { ok: false; action: BoltAction; applied: false; error: string };

export type BoltActionRunner = {
  apply: (action: BoltAction) => BoltActionResult;
  applyStream: (action: BoltAction) => void;
  getLog: () => BoltActionResult[];
  clearLog: () => void;
};

function normalizePath(path: string): string {
  return path.replace(/^\/+/, "").trim();
}

function writeFileToStores(filePath: string, content: string) {
  codeFs.writeFile(filePath, content);
  mirrorCodeFileToWebContainer({ path: filePath, content });
}

export function createBoltActionRunner(options?: {
  lockedPaths?: string[] | Set<string>;
  onShellOutput?: (chunk: string) => void;
}): BoltActionRunner {
  const log: BoltActionResult[] = [];
  const locked =
    options?.lockedPaths instanceof Set
      ? options.lockedPaths
      : new Set(Array.isArray(options?.lockedPaths) ? options!.lockedPaths.map(normalizePath) : []);
  let lastUnsplashUrls: string[] = [];
  const onShellOutput = options?.onShellOutput;

  function replaceUnsplashPlaceholders(input: string): string {
    if (!input || lastUnsplashUrls.length === 0) return input;
    return input.replace(/__UNSPLASH_URL_(\d+)__/g, (_m, idxRaw) => {
      const idx = Number(idxRaw);
      const url = Number.isFinite(idx) ? lastUnsplashUrls[idx] : null;
      return url ?? "";
    });
  }

  function applyStream(action: BoltAction): void {
    if (action.type !== "file") return;
    const filePath = typeof action.filePath === "string" ? normalizePath(action.filePath) : "";
    if (!filePath || locked.has(filePath)) return;
    const content = replaceUnsplashPlaceholders(action.content ?? "");
    writeFileToStores(filePath, content);
  }

  function runShellAction(action: BoltAction): BoltActionResult {
    const command = (action.content ?? "").trim();
    if (!command) {
      const result: BoltActionResult = {
        ok: false,
        applied: false,
        action,
        error: "Empty shell command",
      };
      log.push(result);
      return result;
    }

    const pending: BoltActionResult = { ok: true, applied: true, action };
    log.push(pending);

    void (async () => {
      try {
        onShellOutput?.(`$ ${command}\n`);
        const { exitCode } = await runWebContainerCommand({
          command,
          onOutput: onShellOutput,
        });
        if (exitCode !== 0) {
          const idx = log.indexOf(pending);
          if (idx >= 0) {
            log[idx] = {
              ok: false,
              applied: false,
              action,
              error: `Shell exited with code ${exitCode}`,
            };
          }
          onShellOutput?.(`\nCommand failed (exit ${exitCode})\n`);
        } else {
          onShellOutput?.(`\nCommand completed\n`);
        }
      } catch (error) {
        const idx = log.indexOf(pending);
        if (idx >= 0) {
          log[idx] = {
            ok: false,
            applied: false,
            action,
            error: error instanceof Error ? error.message : "Shell command failed",
          };
        }
      }
    })();

    return pending;
  }

  function runStartAction(action: BoltAction): BoltActionResult {
    const pending: BoltActionResult = { ok: true, applied: true, action };
    log.push(pending);

    void (async () => {
      try {
        onShellOutput?.("Starting dev server…\n");
        await ensureDependenciesInstalled({ onOutput: onShellOutput });
        await startDevServer({ onOutput: onShellOutput });
        onShellOutput?.("Dev server ready\n");
      } catch (error) {
        const idx = log.indexOf(pending);
        if (idx >= 0) {
          log[idx] = {
            ok: false,
            applied: false,
            action,
            error: error instanceof Error ? error.message : "Failed to start dev server",
          };
        }
      }
    })();

    return pending;
  }

  function apply(action: BoltAction): BoltActionResult {
    if (action.type === "shell") {
      return runShellAction(action);
    }

    if (action.type === "start") {
      return runStartAction(action);
    }

    if (action.type === "build") {
      return runShellAction({ ...action, content: action.content?.trim() || "pnpm run build" });
    }

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

      void (async () => {
        const photos = await searchUnsplashPhotos(query, count);
        const urls = photos.map((p) => formatUnsplashPhotoUrl(p, 1800)).filter(Boolean);
        lastUnsplashUrls = urls;
        const assetPath = "assets/unsplash.json";
        if (!locked.has(assetPath)) {
          writeFileToStores(
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
    writeFileToStores(filePath, content);
    const result: BoltActionResult = { ok: true, applied: true, action };
    log.push(result);
    return result;
  }

  return {
    apply,
    applyStream,
    getLog: () => [...log],
    clearLog: () => {
      log.splice(0, log.length);
    },
  };
}
