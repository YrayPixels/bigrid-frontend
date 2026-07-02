import type { CodeFile } from "@/lib/code-fs";

export type WorkbenchContextHints = {
  selectedPath?: string | null;
  modifiedPaths?: string[];
  lastWrittenPaths?: string[];
};

export type ContextSelectionResult = {
  included: CodeFile[];
  omittedPaths: string[];
  allPaths: string[];
  usedSmartContext: boolean;
};

const MAX_CONTEXT_FILES = 28;
const MAX_CONTEXT_BYTES = 480_000;

const ALWAYS_INCLUDE = new Set([
  "package.json",
  "vite.config.ts",
  "tsconfig.json",
  "src/router.tsx",
  "src/start.ts",
  "src/styles.css",
  "src/routes/index.tsx",
  "index.html",
]);

const IGNORE_PATH =
  /^(pnpm-lock\.yaml|bun\.lock|package-lock\.json|yarn\.lock|\.DS_Store)$|\.gen\.ts$|^public\/|\/node_modules\//;

const TOPIC_FILE_HINTS: Array<{ pattern: RegExp; paths: string[] }> = [
  { pattern: /\b(header|nav|navigation|menu)\b/i, paths: ["src/routes/index.tsx", "src/routes/__root.tsx"] },
  { pattern: /\b(hero|banner|homepage|home page)\b/i, paths: ["src/routes/index.tsx"] },
  { pattern: /\b(style|color|theme|font|css)\b/i, paths: ["src/styles.css", "src/index.css"] },
  { pattern: /\b(product|shop|catalog|grid)\b/i, paths: ["src/lib/products.ts", "src/routes/index.tsx", "src/routes/product.$slug.tsx"] },
  { pattern: /\b(footer|contact|about|faq)\b/i, paths: ["src/routes/index.tsx"] },
  { pattern: /\b(route|page|router)\b/i, paths: ["src/router.tsx", "src/routeTree.gen.ts"] },
];

function normalizePath(path: string): string {
  return path.replace(/^\/+/, "");
}

function fileBytes(file: CodeFile): number {
  if (file.encoding === "base64") return Math.ceil((file.content.length * 3) / 4);
  return new TextEncoder().encode(file.content).length;
}

function tokenize(instruction: string): string[] {
  return instruction
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((term) => term.length >= 3);
}

function scoreFile(
  file: CodeFile,
  instruction: string,
  hints: WorkbenchContextHints,
): number {
  const path = normalizePath(file.path);
  let score = 0;

  if (ALWAYS_INCLUDE.has(path)) score += 120;
  if (hints.selectedPath && normalizePath(hints.selectedPath) === path) score += 100;
  if (hints.modifiedPaths?.some((p) => normalizePath(p) === path)) score += 85;
  if (hints.lastWrittenPaths?.some((p) => normalizePath(p) === path)) score += 75;

  for (const { pattern, paths } of TOPIC_FILE_HINTS) {
    if (pattern.test(instruction) && paths.some((hint) => path === hint || path.endsWith(hint))) {
      score += 55;
    }
  }

  const terms = tokenize(instruction);
  const pathLower = path.toLowerCase();
  const contentLower = file.encoding === "base64" ? "" : file.content.toLowerCase();

  for (const term of terms) {
    if (pathLower.includes(term)) score += 35;
    if (contentLower.includes(term)) score += 18;
  }

  if (path.startsWith("src/routes/")) score += 12;
  if (path.startsWith("src/components/")) score += 8;
  if (path.endsWith(".tsx") || path.endsWith(".ts")) score += 4;

  return score;
}

function filterEligible(files: CodeFile[]): CodeFile[] {
  return files.filter((file) => {
    const path = normalizePath(file.path);
    if (!path || IGNORE_PATH.test(path)) return false;
    if (file.encoding === "base64" && !path.endsWith(".svg")) return false;
    return true;
  });
}

export function selectContextFiles(
  allFiles: CodeFile[],
  instruction: string,
  hints: WorkbenchContextHints = {},
): ContextSelectionResult {
  const eligible = filterEligible(allFiles);
  const allPaths = eligible.map((f) => normalizePath(f.path)).sort();
  const totalBytes = eligible.reduce((sum, file) => sum + fileBytes(file), 0);

  if (eligible.length <= MAX_CONTEXT_FILES && totalBytes <= MAX_CONTEXT_BYTES) {
    return {
      included: eligible,
      omittedPaths: [],
      allPaths,
      usedSmartContext: false,
    };
  }

  const scored = eligible
    .map((file) => ({
      file,
      score: scoreFile(file, instruction, hints),
    }))
    .sort((a, b) => b.score - a.score || a.file.path.localeCompare(b.file.path));

  const selected: CodeFile[] = [];
  const selectedSet = new Set<string>();
  let bytes = 0;

  const tryAdd = (file: CodeFile) => {
    const path = normalizePath(file.path);
    if (selectedSet.has(path)) return;
    const size = fileBytes(file);
    if (selected.length >= MAX_CONTEXT_FILES) return;
    if (bytes + size > MAX_CONTEXT_BYTES && selected.length > 0) return;
    selected.push(file);
    selectedSet.add(path);
    bytes += size;
  };

  for (const path of ALWAYS_INCLUDE) {
    const file = eligible.find((f) => normalizePath(f.path) === path);
    if (file) tryAdd(file);
  }

  if (hints.selectedPath) {
    const file = eligible.find((f) => normalizePath(f.path) === normalizePath(hints.selectedPath!));
    if (file) tryAdd(file);
  }

  for (const path of hints.modifiedPaths ?? []) {
    const file = eligible.find((f) => normalizePath(f.path) === normalizePath(path));
    if (file) tryAdd(file);
  }

  for (const path of hints.lastWrittenPaths ?? []) {
    const file = eligible.find((f) => normalizePath(f.path) === normalizePath(path));
    if (file) tryAdd(file);
  }

  for (const { file } of scored) {
    tryAdd(file);
  }

  const includedPaths = new Set(selected.map((f) => normalizePath(f.path)));
  const omittedPaths = allPaths.filter((path) => !includedPaths.has(path));

  return {
    included: selected.sort((a, b) => a.path.localeCompare(b.path)),
    omittedPaths,
    allPaths,
    usedSmartContext: true,
  };
}

export function lastWrittenPathsFromSession(
  messages: Array<{ role: string; payload?: Record<string, unknown> | null }>,
): string[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "assistant" || !msg.payload) continue;
    const type = msg.payload.type;
    if (type !== "custom_site_edited" && type !== "custom_site_generated") continue;

    const log = Array.isArray(msg.payload.bolt_action_log)
      ? (msg.payload.bolt_action_log as Array<{ ok?: boolean; action?: { filePath?: string } }>)
      : [];
    const fromLog = log
      .filter((entry) => entry.ok)
      .map((entry) => entry.action?.filePath)
      .filter((path): path is string => Boolean(path));

    if (fromLog.length > 0) return fromLog;

    if (Array.isArray(msg.payload.files)) {
      return (msg.payload.files as string[]).filter(Boolean);
    }
  }
  return [];
}
