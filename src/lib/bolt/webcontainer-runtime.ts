import type { WebContainer } from "@webcontainer/api";
import { codeFs } from "@/lib/code-fs";
import { readDepsKeyFromWebContainer, stableHash } from "@/lib/bolt/deps-key";
import { mountPrebuiltNodeModulesSnapshot } from "@/lib/bolt/prebuilt-snapshot";
import { codeFileToWebContainerData } from "@/lib/bolt/project-utils";
import { restoreNodeModulesCache, saveNodeModulesCache } from "@/lib/bolt/webcontainer-deps-cache";
import { sanitizeTerminalOutput } from "@/lib/bolt/terminal-output";

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
  try {
    const entries = await wc.fs.readdir("/project/node_modules");
    return entries.length > 0;
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
      workdirName: "project",
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

  // Always mount into /project (bolt convention).
  // WebContainer.mount can stall on larger trees; we use incremental writes
  // for reliability and to allow progress logging.
  await wc.fs.mkdir("/project", { recursive: true });
  const createdDirs = new Set<string>();
  const total = files.length;
  let written = 0;

  for (const f of files) {
    const rel = f.path.replace(/^\/+/, "");
    if (!rel) continue;
    const fullPath = `/project/${rel}`;
    const dir = fullPath.split("/").slice(0, -1).join("/") || "/project";
    if (!createdDirs.has(dir)) {
      await wc.fs.mkdir(dir, { recursive: true });
      createdDirs.add(dir);
    }
    await wc.fs.writeFile(fullPath, codeFileToWebContainerData(f));
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
      const p = `/project/${f.path.replace(/^\/+/, "")}`;
      await wc.fs.writeFile(p, codeFileToWebContainerData(f));
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

async function spawnDependencyInstall(
  wc: WebContainer,
  args?: { onOutput?: (chunk: string) => void },
) {
  let installArgs = ["install"];
  let label = "pnpm install";
  try {
    await wc.fs.readFile("/project/pnpm-lock.yaml", "utf-8");
    installArgs = ["install", "--frozen-lockfile"];
    label = "pnpm install --frozen-lockfile";
  } catch {
    // No pnpm lockfile — fall back to a fresh install.
  }

  const install = await wc.spawn("pnpm", installArgs, {
    cwd: "/project",
    env: {
      CI: "true",
      FORCE_COLOR: "0",
    },
  });
  args?.onOutput?.(`Running ${label}…\n`);
  pipeProcessOutput(install, args?.onOutput);
  const exitCode = await install.exit;
  if (exitCode !== 0) {
    throw new Error(`${label} failed (exit ${exitCode})`);
  }
}

export async function ensureDependenciesInstalled(args?: {
  onOutput?: (chunk: string) => void;
  onRestoreProgress?: (info: { written: number; total: number; source: "snapshot" | "cache" }) => void;
  onRestored?: (source: "snapshot" | "cache") => void;
}) {
  const wc = await getWebContainer();
  if (state.installed) return wc;

  if (await hasInstalledDependencies(wc)) {
    state.installed = true;
    return wc;
  }

  const depsKey = await readDepsKeyFromWebContainer(wc);
  if (depsKey) {
    const mountedSnapshot = await mountPrebuiltNodeModulesSnapshot({ wc, depsKey });
    if (mountedSnapshot && (await hasInstalledDependencies(wc))) {
      args?.onRestored?.("snapshot");
      state.installed = true;
      return wc;
    }

    const restoredCache = await restoreNodeModulesCache(wc, depsKey, ({ written, total }) => {
      args?.onRestoreProgress?.({ written, total, source: "cache" });
    });
    if (restoredCache && (await hasInstalledDependencies(wc))) {
      args?.onRestored?.("cache");
      state.installed = true;
      return wc;
    }
  }

  await spawnDependencyInstall(wc, { onOutput: args?.onOutput });
  state.installed = true;

  if (depsKey) {
    void saveNodeModulesCache(wc, depsKey);
  }

  return wc;
}

export async function startDevServer(args?: {
  preferredPort?: number;
  onOutput?: (line: string) => void;
  onServerReady?: (info: { port: number; url: string }) => void;
}) {
  const wc = await getWebContainer();
  setupPreviewListeners(wc);

  const current = getPreviewUrl();
  if (current) args?.onServerReady?.(current);

  if (state.devProc) {
    return state.devProc;
  }

  const proc = await wc.spawn("pnpm", ["run", "dev", "--", "--host", "0.0.0.0"], {
    cwd: "/project",
    env: {
      FORCE_COLOR: "0",
    },
  });

  state.devProc = proc;
  pipeProcessOutput(proc, args?.onOutput);

  void proc.exit.then(() => {
    if (state.devProc === proc) {
      state.devProc = null;
    }
  });

  return proc;
}
