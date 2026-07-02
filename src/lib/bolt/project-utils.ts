import type { CodeFile } from "@/lib/code-fs";

function fromBase64(encoded: string): Uint8Array {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function codeFileToWebContainerData(file: CodeFile): string | Uint8Array {
  if (file.encoding === "base64") {
    return fromBase64(file.content);
  }
  return file.content ?? "";
}

export function hasPackageJson(files: Array<{ path: string }>): boolean {
  return files.some((f) => f.path.replace(/^\/+/, "") === "package.json");
}

export function isLegacyStaticSite(files: Array<{ path: string }>): boolean {
  if (files.length === 0) return false;
  return hasPackageJson(files) === false;
}

export function needsBoltTemplateSeed(files: CodeFile[]): boolean {
  return files.length === 0 || isLegacyStaticSite(files);
}

const PREFERRED_WORKBENCH_PATHS = [
  "src/routes/index.tsx",
  "src/App.tsx",
  "src/main.tsx",
  "index.html",
] as const;

export function preferredWorkbenchFilePath(paths: string[]): string {
  const normalized = new Set(paths.map((path) => path.replace(/^\/+/, "")));
  for (const candidate of PREFERRED_WORKBENCH_PATHS) {
    if (normalized.has(candidate)) return candidate;
  }
  const sorted = [...normalized].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return sorted[0] ?? "index.html";
}
