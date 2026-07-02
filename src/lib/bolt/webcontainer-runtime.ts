import type { WebContainer } from "@webcontainer/api";
import { codeFs } from "@/lib/code-fs";
import { WORK_DIR_NAME } from "@/lib/bolt/constants";
import { readDepsKeyFromWebContainer, stableHash } from "@/lib/bolt/deps-key";
import { mountPrebuiltNodeModulesSnapshot } from "@/lib/bolt/prebuilt-snapshot";
import { codeFileToWebContainerData } from "@/lib/bolt/project-utils";
import {
  type NodeModulesCacheResult,
  clearNodeModulesCache,
  fixRestoredNodeModulesPermissions,
  restoreNodeModulesCache,
  saveNodeModulesCache,
} from "@/lib/bolt/webcontainer-deps-cache";
import { sanitizeTerminalOutput } from "@/lib/bolt/terminal-output";
import { workdirRelative } from "@/lib/bolt/workdir-path";

type PreviewInfo = { port: number; url: string };

type RuntimeState = {
  container: WebContainer | null;
  booting: Promise<WebContainer> | null;
  installed: boolean;
  mountedHash: string | null;
  devProc: Awaited<ReturnType<WebContainer["spawn"]>> | null;
  devUrl: string | null;
  devPort: number | null;
  previewUrlListeners: Set<(info: PreviewInfo | null) => void>;
};

type GlobalWithBoltRuntime = typeof globalThis & {
  __storehause_webcontainer_runtime__?: RuntimeState;
};

const globalWithRuntime = globalThis as GlobalWithBoltRuntime;

const state: RuntimeState =
  globalWithRuntime.__storehause_webcontainer_runtime__ ??
  (globalWithRuntime.__storehause_webcontainer_runtime__ = {
    container: null,
    booting: null,
    installed: false,
    mountedHash: null,
    devProc: null,
    devUrl: null,
    devPort: null,
    previewUrlListeners: new Set(),
  });

function notifyPreviewUrl(info: PreviewInfo | null) {
  for (const listener of state.previewUrlListeners) {
    listener(info);
  }
}

function setPreviewUrl(port: number, url: string) {
  state.devPort = port;
  state.devUrl = url;
  notifyPreviewUrl({ port, url });
}

function setupPreviewListeners(wc: WebContainer) {
  const tagged = wc as WebContainer & { __storehause_preview_listeners__?: boolean };
  if (tagged.__storehause_preview_listeners__) return;
  tagged.__storehause_preview_listeners__ = true;

  wc.on("server-ready", (port, url) => {
    setPreviewUrl(port, url);
  });

  wc.on("port", (port, type, url) => {
    if (type === "open") {
      setPreviewUrl(port, url);
      return;
    }
    if (type === "close" && state.devPort === port) {
      state.devPort = null;
      state.devUrl = null;
      notifyPreviewUrl(null);
    }
  });
}

export function getPreviewUrl(): PreviewInfo | null {
  if (!state.devUrl) return null;
  return { port: state.devPort ?? 0, url: state.devUrl };
}

export function onPreviewUrl(listener: (info: PreviewInfo | null) => void) {
  const current = getPreviewUrl();
  if (current) listener(current);
  state.previewUrlListeners.add(listener);
  return () => {
    state.previewUrlListeners.delete(listener);
  };
}

async function hasInstalledDependencies(wc: WebContainer): Promise<boolean> {
  return isUsablePnpmNodeModules(wc);
}

/** True when node_modules looks like a completed install, not npm/bun leftovers. */
async function isUsablePnpmNodeModules(wc: WebContainer): Promise<boolean> {
  try {
    const entries = await wc.fs.readdir("node_modules");
    if (entries.length === 0) return false;
    if (entries.includes(".ignored")) return false;
  } catch {
    return false;
  }

  for (const marker of ["node_modules/.modules.yaml", ".modules.yaml"]) {
    try {
      await wc.fs.readFile(marker, "utf-8");
      return true;
    } catch {
      // try next marker
    }
  }

  for (const bin of ["node_modules/.bin/vite", "node_modules/vite/bin/vite.js"]) {
    try {
      await wc.fs.readFile(bin, "utf-8");
      return true;
    } catch {
      // try next path
    }
  }

  return false;
}

async function resolveViteEntry(wc: WebContainer): Promise<string> {
  for (const entry of ["node_modules/vite/bin/vite.js", "node_modules/vite/dist/node/cli.js"]) {
    try {
      await wc.fs.readFile(entry, "utf-8");
      return entry;
    } catch {
      // try next entrypoint
    }
  }

  throw new Error("vite not found in node_modules — try reinstalling dependencies");
}

async function verifyDevToolchain(wc: WebContainer): Promise<boolean> {
  await fixRestoredNodeModulesPermissions(wc);

  try {
    const entry = await resolveViteEntry(wc);
    const proc = await wc.spawn("node", [entry, "--version"], {
      env: { FORCE_COLOR: "0" },
    });
    return (await proc.exit) === 0;
  } catch {
    return false;
  }
}

async function clearNodeModules(wc: WebContainer): Promise<void> {
  const proc = await wc.spawn("sh", ["-lc", "rm -rf node_modules"], {
    env: { FORCE_COLOR: "0" },
  });
  await proc.exit;
}

async function readLockfileMajorVersion(wc: WebContainer): Promise<number | null> {
  try {
    const lock = String(await wc.fs.readFile("pnpm-lock.yaml", "utf-8"));
    const match = lock.match(/lockfileVersion:\s*['"]?(\d+)/);
    return match ? Number.parseInt(match[1] ?? "", 10) : null;
  } catch {
    return null;
  }
}

async function preparePnpmForWebContainer(
  wc: WebContainer,
  onOutput?: (chunk: string) => void,
): Promise<void> {
  const lockMajor = await readLockfileMajorVersion(wc);
  const targetPnpm = lockMajor != null && lockMajor >= 9 ? "9.15.9" : "8.15.9";

  onOutput?.(`Preparing pnpm@${targetPnpm} for WebContainer…\n`);
  const proc = await wc.spawn(
    "sh",
    ["-lc", `corepack enable 2>/dev/null; corepack prepare pnpm@${targetPnpm} --activate`],
    { env: { FORCE_COLOR: "0" } },
  );
  pipeProcessOutput(proc, onOutput);
  await proc.exit;
}

async function removeIncompatibleLockfile(wc: WebContainer): Promise<boolean> {
  const lockMajor = await readLockfileMajorVersion(wc);
  if (lockMajor == null || lockMajor < 9) return false;

  const versionProc = await wc.spawn("sh", ["-lc", "pnpm --version"], {
    env: { FORCE_COLOR: "0" },
  });
  let versionText = "";
  void versionProc.output.pipeTo(
    new WritableStream({
      write(chunk) {
        versionText += String(chunk);
      },
    }),
  );
  await versionProc.exit;

  const pnpmMajor = Number.parseInt(versionText.trim().split(".")[0] ?? "", 10);
  if (!Number.isFinite(pnpmMajor) || pnpmMajor >= 9) return false;

  try {
    await wc.fs.rm("pnpm-lock.yaml");
    return true;
  } catch {
    return false;
  }
}

const COI_RELOAD_KEY = "storehause:coi-reload";

function ensureCrossOriginIsolated(): void {
  if (typeof crossOriginIsolated === "undefined" || crossOriginIsolated) return;

  if (typeof sessionStorage !== "undefined" && !sessionStorage.getItem(COI_RELOAD_KEY)) {
    sessionStorage.setItem(COI_RELOAD_KEY, "1");
    window.location.reload();
    throw new Error("Reloading to enable WebContainer isolation headers…");
  }

  throw new Error(
    "WebContainer requires a cross-origin isolated page. Hard-refresh the browser or open the builder in a new tab.",
  );
}

export async function getWebContainer(): Promise<WebContainer> {
  if (state.container) {
    setupPreviewListeners(state.container);
    return state.container;
  }
  if (state.booting) return state.booting;

  state.booting = (async () => {
    ensureCrossOriginIsolated();
    const { WebContainer } = await import("@webcontainer/api");
    const wc = await WebContainer.boot({
      coep: "credentialless",
      workdirName: WORK_DIR_NAME,
    });
    state.container = wc;
    state.booting = null;
    setupPreviewListeners(wc);
    return wc;
  })();

  return state.booting;
}

export async function mountCodeFsToWebContainer(opts?: {
  force?: boolean;
  onProgress?: (info: { written: number; total: number; path: string }) => void;
}) {
  const wc = await getWebContainer();
  const files = codeFs.exportFiles();
  const hash = stableHash(files);
  if (!opts?.force && state.mountedHash === hash) return wc;

  // WebContainer fs paths are relative to wc.workdir (/home/project).
  const createdDirs = new Set<string>();
  const total = files.length;
  let written = 0;

  for (const f of files) {
    const rel = workdirRelative(wc, f.path);
    if (!rel || rel === ".") continue;
    const dir = rel.split("/").slice(0, -1).join("/");
    if (dir && !createdDirs.has(dir)) {
      await wc.fs.mkdir(dir, { recursive: true });
      createdDirs.add(dir);
    }
    await wc.fs.writeFile(rel, codeFileToWebContainerData(f));
    written += 1;
    opts?.onProgress?.({ written, total, path: rel });
  }
  state.mountedHash = hash;

  const depsInstalled = await hasInstalledDependencies(wc);
  if (!depsInstalled) {
    state.installed = false;
  }

  return wc;
}

export async function syncCodeFsToWebContainer() {
  const wc = await getWebContainer();
  const files = codeFs.exportFiles();
  await Promise.all(
    files.map(async (f) => {
      const rel = workdirRelative(wc, f.path);
      if (!rel || rel === ".") return;
      await wc.fs.writeFile(rel, codeFileToWebContainerData(f));
    }),
  );
  state.mountedHash = stableHash(files);
  return wc;
}

function pipeProcessOutput(
  proc: Awaited<ReturnType<WebContainer["spawn"]>>,
  onOutput?: (chunk: string) => void,
) {
  if (!onOutput) return;
  void proc.output.pipeTo(
    new WritableStream({
      write(chunk) {
        const cleaned = sanitizeTerminalOutput(String(chunk));
        if (cleaned) onOutput(cleaned);
      },
    }),
  );
}

async function ensureHoistedPnpm(wc: WebContainer): Promise<void> {
  const desired = [
    "node-linker=hoisted",
    "supportedArchitectures.cpu=x64",
    "supportedArchitectures.cpu=wasm32",
    "supportedArchitectures.os=linux",
    "supportedArchitectures.os=wasi",
  ].join("\n");
  const withNewline = `${desired}\n`;
  try {
    const existing = String(await wc.fs.readFile(".npmrc", "utf-8"));
    if (existing.includes("node-linker=hoisted") && existing.includes("wasm32")) return;
    const merged = existing.trimEnd().endsWith("\n") ? `${existing.trimEnd()}\n` : `${existing}\n`;
    await wc.fs.writeFile(".npmrc", `${merged}${withNewline}`);
    return;
  } catch {
    // No .npmrc yet.
  }
  await wc.fs.writeFile(".npmrc", withNewline);
}

async function readInstalledRolldownVersion(wc: WebContainer): Promise<string> {
  try {
    const pkg = JSON.parse(String(await wc.fs.readFile("node_modules/rolldown/package.json", "utf-8"))) as {
      version?: string;
    };
    if (typeof pkg.version === "string" && pkg.version.length > 0) return pkg.version;
  } catch {
    // fall through
  }
  return "1.1.4";
}

async function hasRolldownWasmBinding(wc: WebContainer): Promise<boolean> {
  try {
    await wc.fs.readFile("node_modules/@rolldown/binding-wasm32-wasi/package.json", "utf-8");
    return true;
  } catch {
    return false;
  }
}

/** Vite 8 / Rolldown needs the wasm binding in WebContainer; install once so dev doesn't re-fetch. */
async function ensureRolldownWasmBinding(
  wc: WebContainer,
  onOutput?: (chunk: string) => void,
): Promise<void> {
  if (await hasRolldownWasmBinding(wc)) return;

  const version = await readInstalledRolldownVersion(wc);
  onOutput?.(`Installing @rolldown/binding-wasm32-wasi@${version} for WebContainer…\n`);
  const proc = await wc.spawn("pnpm", ["add", "-D", `@rolldown/binding-wasm32-wasi@${version}`], {
    env: { CI: "true", FORCE_COLOR: "0" },
  });
  pipeProcessOutput(proc, onOutput);
  const exitCode = await proc.exit;
  if (exitCode !== 0 || !(await hasRolldownWasmBinding(wc))) {
    throw new Error(`Failed to install @rolldown/binding-wasm32-wasi@${version}`);
  }
}

async function finalizeDependencyInstall(
  wc: WebContainer,
  onOutput?: (chunk: string) => void,
): Promise<void> {
  await fixRestoredNodeModulesPermissions(wc);
  await ensureRolldownWasmBinding(wc, onOutput);
  if (!(await verifyDevToolchain(wc))) {
    throw new Error("Installed dependencies failed toolchain verification");
  }
}

async function spawnDependencyInstall(
  wc: WebContainer,
  args?: { onOutput?: (chunk: string) => void },
) {
  await preparePnpmForWebContainer(wc, args?.onOutput);
  await ensureHoistedPnpm(wc);

  if (!(await isUsablePnpmNodeModules(wc))) {
    await clearNodeModules(wc);
  }

  const installAttempts: Array<{ args: string[]; label: string }> = [
    { args: ["install"], label: "pnpm install" },
  ];

  try {
    await wc.fs.readFile("pnpm-lock.yaml", "utf-8");
    installAttempts.unshift({
      args: ["install", "--frozen-lockfile"],
      label: "pnpm install --frozen-lockfile",
    });
  } catch {
    // No pnpm lockfile — fall back to a fresh install.
  }

  let lastError: Error | null = null;
  let droppedLockfile = false;

  for (const attempt of installAttempts) {
    const install = await wc.spawn("pnpm", attempt.args, {
      env: {
        CI: "true",
        FORCE_COLOR: "0",
      },
    });
    args?.onOutput?.(`Running ${attempt.label}…\n`);
    pipeProcessOutput(install, args?.onOutput);
    const exitCode = await install.exit;
    if (exitCode === 0 && (await isUsablePnpmNodeModules(wc))) {
      await finalizeDependencyInstall(wc, args?.onOutput);
      return;
    }

    lastError = new Error(`${attempt.label} failed (exit ${exitCode})`);

    if (attempt.args.includes("--frozen-lockfile")) {
      args?.onOutput?.("Frozen lockfile install failed; retrying without --frozen-lockfile…\n");
      continue;
    }

    if (!droppedLockfile && (await removeIncompatibleLockfile(wc))) {
      droppedLockfile = true;
      args?.onOutput?.("Removed incompatible pnpm-lock.yaml; retrying install…\n");
      await clearNodeModules(wc);
      const retry = await wc.spawn("pnpm", ["install"], {
        env: { CI: "true", FORCE_COLOR: "0" },
      });
      args?.onOutput?.("Running pnpm install (after lockfile reset)…\n");
      pipeProcessOutput(retry, args?.onOutput);
      if ((await retry.exit) === 0 && (await isUsablePnpmNodeModules(wc))) {
        await finalizeDependencyInstall(wc, args?.onOutput);
        return;
      }
      lastError = new Error("pnpm install failed after lockfile reset");
    }
  }

  throw lastError ?? new Error("pnpm install failed");
}

export async function ensureDependenciesInstalled(args?: {
  onOutput?: (chunk: string) => void;
  onRestoreProgress?: (info: { written: number; total: number; source: "snapshot" | "cache" }) => void;
  onRestored?: (source: "snapshot" | "cache") => void;
  onCacheSaved?: (result: NodeModulesCacheResult) => void;
}) {
  const wc = await getWebContainer();
  if (state.installed) return wc;

  if (await hasInstalledDependencies(wc)) {
    try {
      await finalizeDependencyInstall(wc, args?.onOutput);
      state.installed = true;
      return wc;
    } catch {
      // Toolchain check failed; fall through to reinstall.
    }
  }

  const depsKey = await readDepsKeyFromWebContainer(wc);
  if (depsKey) {
    const mountedSnapshot = await mountPrebuiltNodeModulesSnapshot({ wc, depsKey });
    if (mountedSnapshot && (await hasInstalledDependencies(wc))) {
      try {
        await finalizeDependencyInstall(wc, args?.onOutput);
        args?.onRestored?.("snapshot");
        state.installed = true;
        return wc;
      } catch {
        args?.onOutput?.("Prebuilt node_modules failed toolchain check; reinstalling…\n");
        await clearNodeModules(wc);
      }
    }

    const restoredCache = await restoreNodeModulesCache(wc, depsKey, ({ written, total }) => {
      args?.onRestoreProgress?.({ written, total, source: "cache" });
    });
    if (restoredCache && (await hasInstalledDependencies(wc))) {
      try {
        await finalizeDependencyInstall(wc, args?.onOutput);
        args?.onRestored?.("cache");
        state.installed = true;
        return wc;
      } catch {
        args?.onOutput?.("Cached node_modules failed toolchain check; reinstalling…\n");
        await clearNodeModules(wc);
        await clearNodeModulesCache(depsKey);
      }
    } else if (restoredCache) {
      args?.onOutput?.("Cached node_modules failed toolchain check; reinstalling…\n");
      await clearNodeModules(wc);
      await clearNodeModulesCache(depsKey);
    } else if (!(await hasInstalledDependencies(wc))) {
      args?.onOutput?.("Cached node_modules were incomplete or from another package manager; reinstalling…\n");
      await clearNodeModules(wc);
      await clearNodeModulesCache(depsKey);
    }
  }

  await spawnDependencyInstall(wc, { onOutput: args?.onOutput });
  state.installed = true;

  if (depsKey) {
    const cacheResult = await saveNodeModulesCache(wc, depsKey);
    args?.onCacheSaved?.(cacheResult);
  }

  return wc;
}

const DEV_SERVER_READY_TIMEOUT_MS = 180_000;

function waitForPreviewUrl(
  timeoutMs = DEV_SERVER_READY_TIMEOUT_MS,
  onServerReady?: (info: PreviewInfo) => void,
): Promise<PreviewInfo> {
  const existing = getPreviewUrl();
  if (existing) {
    onServerReady?.(existing);
    return Promise.resolve(existing);
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(
        new Error(
          "Dev server did not become ready in time. Check the terminal for Vite errors, or try clearing site data and reloading.",
        ),
      );
    }, timeoutMs);

    const unsubscribe = onPreviewUrl((info) => {
      if (!info) return;
      cleanup();
      onServerReady?.(info);
      resolve(info);
    });

    function cleanup() {
      window.clearTimeout(timeout);
      unsubscribe();
    }
  });
}

export async function startDevServer(args?: {
  preferredPort?: number;
  onOutput?: (line: string) => void;
  onServerReady?: (info: { port: number; url: string }) => void;
}) {
  const wc = await getWebContainer();
  setupPreviewListeners(wc);

  const current = getPreviewUrl();
  if (current) {
    args?.onServerReady?.(current);
    return state.devProc;
  }

  if (state.devProc) {
    await waitForPreviewUrl(DEV_SERVER_READY_TIMEOUT_MS, args?.onServerReady);
    return state.devProc;
  }

  await fixRestoredNodeModulesPermissions(wc);

  const viteEntry = await resolveViteEntry(wc);
  const port = args?.preferredPort ?? 5173;
  const proc = await wc.spawn(
    "node",
    [viteEntry, "dev", "--host", "0.0.0.0", "--port", String(port), "--strictPort"],
    {
      env: {
        FORCE_COLOR: "0",
        CI: "true",
        NODE_ENV: "development",
      },
    },
  );

  state.devProc = proc;
  pipeProcessOutput(proc, args?.onOutput);

  const exitPromise = proc.exit.then((exitCode) => {
    if (state.devProc === proc) {
      state.devProc = null;
    }
    if (!getPreviewUrl()) {
      throw new Error(
        exitCode === 0
          ? "Dev server exited before becoming ready"
          : `Dev server exited with code ${exitCode}`,
      );
    }
  });

  try {
    await Promise.race([waitForPreviewUrl(DEV_SERVER_READY_TIMEOUT_MS, args?.onServerReady), exitPromise]);
  } catch (error) {
    proc.kill();
    if (state.devProc === proc) {
      state.devProc = null;
    }
    throw error;
  }

  return proc;
}
