/**
 * Virtual file system for bolt-style code generation.
 * Stores files in memory and triggers preview updates.
 */

export type CodeFile = {
  path: string;
  content: string;
};

type FsListener = () => void;

class CodeFs {
  private files = new Map<string, string>();
  private listeners = new Set<FsListener>();

  loadFiles(files: CodeFile[] | null | undefined) {
    this.files.clear();
    for (const file of Array.isArray(files) ? files : []) {
      if (!file || typeof file.path !== "string") continue;
      const path = file.path.replace(/^\/+/, "");
      if (!path) continue;
      this.files.set(path, typeof file.content === "string" ? file.content : "");
    }
    this.notify();
  }

  exportFiles(): CodeFile[] {
    return [...this.files.entries()].map(([path, content]) => ({ path, content }));
  }

  writeFile(path: string, content: string) {
    this.files.set(path, content);
    this.notify();
  }

  readFile(path: string): string | undefined {
    return this.files.get(path);
  }

  listFiles(): string[] {
    return [...this.files.keys()];
  }

  getMainHtml(): string {
    const indexHtml = this.files.get("index.html");
    if (indexHtml) {
      // Inline CSS and JS files
      let html = indexHtml;
      for (const [path, content] of this.files) {
        if (path === "index.html") continue;
        if (path.endsWith(".css")) {
          html = html.replace("</head>", `<style>${content}</style></head>`);
        } else if (path.endsWith(".js")) {
          html = html.replace("</body>", `<script>${content}</script></body>`);
        }
      }
      return html;
    }

    // Fallback: concatenate all files
    return [...this.files.values()].join("\n");
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
}

/** Global instance — one per session */
export const codeFs = new CodeFs();
