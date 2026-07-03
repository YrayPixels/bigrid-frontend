/**
 * Virtual file system for bolt-style code generation.
 * Stores files in memory and triggers preview updates.
 */

export type CodeFile = {
  path: string;
  content: string;
  /** When set, `content` is base64-encoded binary data. */
  encoding?: "base64";
};

type FsListener = () => void;

class CodeFs {
  private files = new Map<string, CodeFile>();
  private listeners = new Set<FsListener>();

  loadFiles(files: CodeFile[] | null | undefined) {
    this.files.clear();
    for (const file of Array.isArray(files) ? files : []) {
      if (!file || typeof file.path !== "string") continue;
      const path = file.path.replace(/^\/+/, "");
      if (!path) continue;
      this.files.set(path, {
        path,
        content: typeof file.content === "string" ? file.content : "",
        encoding: file.encoding,
      });
    }
    this.notify();
  }

  exportFiles(): CodeFile[] {
    return [...this.files.values()];
  }

  writeFile(path: string, content: string, encoding?: CodeFile["encoding"]) {
    const normalized = path.replace(/^\/+/, "");
    const file: CodeFile = { path: normalized, content, encoding };
    this.files.set(normalized, file);
    this.notify();
    this.mirrorToWebContainer(file);
  }

  readFile(path: string): string | undefined {
    return this.files.get(path.replace(/^\/+/, ""))?.content;
  }

  deleteFile(path: string): boolean {
    const normalized = path.replace(/^\/+/, "");
    const deleted = this.files.delete(normalized);
    if (deleted) this.notify();
    return deleted;
  }

  /** Delete a file or every file under a folder prefix (e.g. `.lovable/`). */
  deletePath(target: string): string[] {
    const normalized = target.replace(/^\/+/, "").replace(/\/+$/, "");
    if (!normalized) return [];

    const paths = [...this.files.keys()];
    const exact = paths.filter((path) => path === normalized);
    const caseInsensitiveFile = paths.filter(
      (path) => !normalized.includes("/") && path.toLowerCase() === normalized.toLowerCase(),
    );
    const underFolder = paths.filter(
      (path) =>
        path.startsWith(`${normalized}/`) ||
        path.toLowerCase().startsWith(`${normalized.toLowerCase()}/`),
    );
    const toDelete = [...new Set([...exact, ...caseInsensitiveFile, ...underFolder])];

    if (toDelete.length === 0) return [];

    for (const path of toDelete) {
      this.files.delete(path);
    }
    this.notify();
    return toDelete;
  }

  listFiles(): string[] {
    return [...this.files.keys()];
  }

  getMainHtml(): string {
    const indexHtml = this.files.get("index.html")?.content;
    if (indexHtml) {
      // Inline CSS and JS files
      let html = indexHtml;
      for (const [path, file] of this.files) {
        if (path === "index.html") continue;
        if (file.encoding === "base64") continue;
        if (path.endsWith(".css")) {
          html = html.replace("</head>", `<style>${file.content}</style></head>`);
        } else if (path.endsWith(".js")) {
          html = html.replace("</body>", `<script>${file.content}</script></body>`);
        }
      }
      return html;
    }

    // Fallback: concatenate text files only
    return [...this.files.values()]
      .filter((file) => file.encoding !== "base64")
      .map((file) => file.content)
      .join("\n");
  }

  clear() {
    this.files.clear();
    this.notify();
  }

  onUpdate(listener: FsListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private mirrorToWebContainer(file: CodeFile) {
    if (typeof window === "undefined") return;
    void import("@/lib/bolt/wc-file-sync").then(({ mirrorCodeFileToWebContainer }) => {
      mirrorCodeFileToWebContainer(file);
    });
  }
}

/** Global instance — one per session */
export const codeFs = new CodeFs();
