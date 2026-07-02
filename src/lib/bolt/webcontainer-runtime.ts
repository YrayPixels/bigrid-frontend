import type { WebContainer, FileSystemTree } from "@webcontainer/api";
import { codeFs } from "@/lib/code-fs";

type RuntimeState = {
  container: WebContainer | null;
  booting: Promise<WebContainer> | null;
  installed: boolean;
  mountedHash: string | null;
};

const state: RuntimeState = {
  container: null,
  booting: null,
  installed: false,
  mountedHash: null,
};

function stableHash(files: Array<{ path: string; content: string }>): string {
  // Lightweight stable hash (not crypto) for mount dedupe.
  let h = 2166136261;
  for (const f of files) {
    const s = `${f.path}\n${f.content}\n`;
    for (let i = 0; i < s.length; i++) {
      h = (h ^ s.charCodeAt(i)) * 16777619;
      h >>>= 0;
    }
  }
  return String(h);
}

function toFsTree(files: Array<{ path: string; content: string }>): FileSystemTree {
  const root: FileSystemTree = {};

  for (const file of files) {
    const parts = file.path.replace(/^\/+/, "").split("/").filter(Boolean);
    if (parts.length === 0) continue;

    let node: FileSystemTree = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      const isLast = i === parts.length - 1;
      if (isLast) {
        node[part] = { file: { contents: file.content ?? "" } };
      } else {
        const existing = node[part];
        if (!existing || !("directory" in existing)) {
          node[part] = { directory: {} };
        }
        node = (node[part] as { directory: FileSystemTree }).directory;
      }
    }
  }

  return root;
}

export async function getWebContainer(): Promise<WebContainer> {
  if (state.container) return state.container;
  if (state.booting) return state.booting;

  state.booting = (async () => {
    const { WebContainer } = await import("@webcontainer/api");
    const wc = await WebContainer.boot();
    state.container = wc;
    state.booting = null;
    return wc;
  })();

  return state.booting;
}

export async function mountCodeFsToWebContainer(opts?: { force?: boolean }) {
  const wc = await getWebContainer();
  const files = codeFs.exportFiles();
  const hash = stableHash(files);
  if (!opts?.force && state.mountedHash === hash) return wc;

  // Always mount into /project (bolt convention).
  await wc.mount({ project: { directory: toFsTree(files) } });
  state.mountedHash = hash;
  state.installed = false; // safest: deps might have changed
  return wc;
}

export async function ensureDependenciesInstalled() {
  const wc = await getWebContainer();
  if (state.installed) return wc;
  // /project assumed
  const install = await wc.spawn("npm", ["install"], { cwd: "/project" });
  await install.exit;
  state.installed = true;
  return wc;
}

export async function startDevServer(args?: {
  preferredPort?: number;
  onOutput?: (line: string) => void;
  onServerReady?: (info: { port: number; url: string }) => void;
}) {
  const wc = await getWebContainer();

  wc.on("server-ready", (port, url) => {
    args?.onServerReady?.({ port, url });
  });

  // Heuristic: use npm run dev; let the template decide the port.
  const proc = await wc.spawn("npm", ["run", "dev", "--", "--host", "0.0.0.0"], {
    cwd: "/project",
  });

  proc.output.pipeTo(
    new WritableStream({
      write(chunk) {
        const text = String(chunk);
        args?.onOutput?.(text);
      },
    }),
  );

  return proc;
}

