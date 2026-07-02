import type { CodeFile } from "@/lib/code-fs";
import { codeFileToWebContainerData } from "@/lib/bolt/project-utils";
import { getWebContainer } from "@/lib/bolt/webcontainer-runtime";
import { workdirRelative } from "@/lib/bolt/workdir-path";

/** Best-effort mirror of a single codeFs file into WebContainer (for HMR). */
export async function syncFileToWebContainer(filePath: string, content?: string | Uint8Array): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const wc = await getWebContainer();
    const rel = workdirRelative(wc, filePath);
    if (!rel || rel === ".") return;

    const dir = rel.split("/").slice(0, -1).join("/");
    if (dir) {
      await wc.fs.mkdir(dir, { recursive: true });
    }

    if (content !== undefined) {
      await wc.fs.writeFile(rel, content);
      return;
    }

    const { codeFs } = await import("@/lib/code-fs");
    const file = codeFs.exportFiles().find((f) => f.path.replace(/^\/+/, "") === filePath.replace(/^\/+/, ""));
    if (!file) return;
    await wc.fs.writeFile(rel, codeFileToWebContainerData(file));
  } catch {
    // WebContainer may not be booted yet; preview will sync on ready.
  }
}

export function mirrorCodeFileToWebContainer(file: CodeFile): void {
  void syncFileToWebContainer(file.path, codeFileToWebContainerData(file));
}
