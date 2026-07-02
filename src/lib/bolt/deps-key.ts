import type { WebContainer } from "@webcontainer/api";

export function stableHash(files: Array<{ path: string; content: string }>): string {
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

export function depsKeyFromContents(packageJson: string, pnpmLock = ""): string {
  return stableHash([
    { path: "package.json", content: packageJson },
    { path: "pnpm-lock.yaml", content: pnpmLock },
  ]);
}

export async function readDepsKeyFromWebContainer(wc: WebContainer): Promise<string | null> {
  try {
    const packageJson = String(await wc.fs.readFile("/project/package.json", "utf-8"));
    let pnpmLock = "";
    try {
      pnpmLock = String(await wc.fs.readFile("/project/pnpm-lock.yaml", "utf-8"));
    } catch {
      // lockfile optional
    }
    return depsKeyFromContents(packageJson, pnpmLock);
  } catch {
    return null;
  }
}
