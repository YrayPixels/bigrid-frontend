import type { CodeFile } from "@/lib/code-fs";

export type WorkbenchContextHints = {
  selectedPath?: string | null;
  modifiedPaths?: string[];
  lastWrittenPaths?: string[];
  searchPaths?: string[];
};

export type ContextSelectionResult = {
  included: CodeFile[];
  omittedPaths: string[];
  allPaths: string[];
  usedSmartContext: boolean;
};

const MAX_CONTEXT_FILES = 28;
const MAX_CONTEXT_BYTES = 480_000;

const VITE_ALWAYS_INCLUDE = [
  "package.json",
  "vite.config.ts",
  "tsconfig.json",
  "src/router.tsx",
  "src/start.ts",
  "src/styles.css",
  "src/routes/index.tsx",
  "src/routes/__root.tsx",
] as const;

const STATIC_ALWAYS_INCLUDE = ["index.html", "styles.css", "script.js"] as const;

const IGNORE_PATH =
  /^(pnpm-lock\.yaml|bun\.lock|package-lock\.json|yarn\.lock|\.DS_Store)$|\.gen\.ts$|^public\/|\/node_modules\//;

export const TOPIC_FILE_HINTS: Array<{ pattern: RegExp; paths: string[] }> = [
  { pattern: /\b(header|nav|navigation|menu|logo)\b/i, paths: ["src/routes/index.tsx", "src/routes/__root.tsx"] },
  { pattern: /\b(hero|banner|homepage|home page)\b/i, paths: ["src/routes/index.tsx"] },
  { pattern: /\b(footer|contact|about|faq)\b/i, paths: ["src/routes/index.tsx"] },
  { pattern: /\b(product|shop|catalog|grid)\b/i, paths: ["src/lib/products.ts", "src/routes/index.tsx", "src/routes/product.$slug.tsx"] },
  { pattern: /\b(route|page|router|layout)\b/i, paths: ["src/router.tsx", "src/routes/__root.tsx", "src/routeTree.gen.ts"] },
  {
    pattern: /\b(theme|brand color|primary color|css variable|--primary|site[- ]wide|global color)\b/i,
    paths: ["src/styles.css", "src/index.css"],
  },
];

export type EditGuidance = {
  primary_targets: string[];
  avoid_editing: string[];
  output_only: string[];
  approach: string;
};

function isGlobalThemeEdit(instruction: string): boolean {
  return /\b(theme|brand color|primary color|css variable|--primary|--background|site[- ]wide|global color|color scheme)\b/i.test(
    instruction,
  );
}

function isComponentSectionEdit(instruction: string): boolean {
  return /\b(header|nav|navigation|menu|logo|hero|banner|footer|homepage|home page)\b/i.test(instruction);
}

function isVisualTweak(instruction: string): boolean {
  return /\b(color|background|font|padding|margin|size|width|height|border|shadow|opacity|lighter|darker|navy|blue|red|green|white|black)\b/i.test(
    instruction,
  );
}

export function buildEditGuidance(instruction: string, allPaths: string[]): EditGuidance | null {
  const pathSet = new Set(allPaths.map(normalizePath));
  const isVite = pathSet.has("package.json");
  if (!isVite) return null;

  const section = isComponentSectionEdit(instruction);
  const visual = isVisualTweak(instruction);
  const global = isGlobalThemeEdit(instruction);

  if (section && visual && !global && pathSet.has("src/routes/index.tsx")) {
    const isHeader = /\b(header|nav|navigation|menu|logo)\b/i.test(instruction);
    const isHero = /\b(hero|banner)\b/i.test(instruction);
    const isFooter = /\b(footer)\b/i.test(instruction);

    let approach =
      "Make a surgical edit in src/routes/index.tsx only. Copy the entire file from the provided contents and change ONLY the relevant JSX (className, style prop, or Tailwind classes). Do not rewrite other components.";
    if (isHeader) {
      approach =
        "Edit ONLY the Nav() component's <header> element — add or change className (e.g. bg-navy-900) or a style={{ backgroundColor: '...' }} prop. Copy the rest of src/routes/index.tsx character-for-character. Do NOT edit src/styles.css.";
    } else if (isHero) {
      approach =
        "Edit ONLY the Hero() section's styles (className or inline style). Copy the rest of src/routes/index.tsx unchanged. Do NOT edit src/styles.css.";
    } else if (isFooter) {
      approach =
        "Edit ONLY the footer section in src/routes/index.tsx. Copy the rest of the file unchanged. Do NOT edit src/styles.css.";
    }

    return {
      primary_targets: ["src/routes/index.tsx"],
      avoid_editing: pathSet.has("src/styles.css") ? ["src/styles.css"] : [],
      output_only: ["src/routes/index.tsx"],
      approach,
    };
  }

  if (global && pathSet.has("src/styles.css")) {
    return {
      primary_targets: ["src/styles.css"],
      avoid_editing: ["src/routes/index.tsx"],
      output_only: ["src/styles.css"],
      approach:
        "Edit ONLY the specific CSS variables or rules requested in src/styles.css. Preserve the full @theme, @import, and :root structure — change only the tokens mentioned.",
    };
  }

  return null;
}

function alwaysIncludePaths(allPaths: string[], instruction: string): string[] {
  const pathSet = new Set(allPaths.map(normalizePath));
  const isVite = pathSet.has("package.json");
  const candidates = isVite ? VITE_ALWAYS_INCLUDE : STATIC_ALWAYS_INCLUDE;
  const guidance = buildEditGuidance(instruction, allPaths);
  const avoid = new Set(guidance?.avoid_editing ?? []);

  return candidates.filter((path) => pathSet.has(path) && !avoid.has(path));
}

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
  allPaths: string[],
): number {
  const path = normalizePath(file.path);
  let score = 0;

  if (alwaysIncludePaths(allPaths, instruction).includes(path)) score += 120;
  if (hints.selectedPath && normalizePath(hints.selectedPath) === path) score += 100;
  if (hints.modifiedPaths?.some((p) => normalizePath(p) === path)) score += 85;
  if (hints.lastWrittenPaths?.some((p) => normalizePath(p) === path)) score += 75;
  if (hints.searchPaths?.some((p) => normalizePath(p) === path)) score += 95;

  for (const { pattern, paths } of TOPIC_FILE_HINTS) {
    if (pattern.test(instruction) && paths.some((hint) => path === hint || path.endsWith(hint))) {
      score += 55;
    }
  }

  for (const target of inferEditTargetPaths(instruction, allPaths)) {
    if (path === target) score += 90;
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

  const guidance = buildEditGuidance(instruction, allPaths);
  if (guidance?.avoid_editing.includes(path)) score -= 250;

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

  const guidance = buildEditGuidance(instruction, allPaths);
  const avoidPaths = new Set(guidance?.avoid_editing ?? []);

  const applyGuidance = (files: CodeFile[]): CodeFile[] => {
    if (!guidance) return files;
    return files.filter((file) => !avoidPaths.has(normalizePath(file.path)));
  };

  if (eligible.length <= MAX_CONTEXT_FILES && totalBytes <= MAX_CONTEXT_BYTES) {
    const included = applyGuidance(eligible);
    const includedPathSet = new Set(included.map((f) => normalizePath(f.path)));
    return {
      included,
      omittedPaths: allPaths.filter((path) => !includedPathSet.has(path)),
      allPaths,
      usedSmartContext: Boolean(guidance),
    };
  }

  const scored = eligible
    .map((file) => ({
      file,
      score: scoreFile(file, instruction, hints, allPaths),
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

  for (const path of alwaysIncludePaths(allPaths, instruction)) {
    const file = eligible.find((f) => normalizePath(f.path) === path);
    if (file) tryAdd(file);
  }

  for (const path of inferEditTargetPaths(instruction, allPaths)) {
    const file = eligible.find((f) => normalizePath(f.path) === path);
    if (file) tryAdd(file);
  }

  for (const path of hints.searchPaths ?? []) {
    const file = eligible.find((f) => normalizePath(f.path) === normalizePath(path));
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
    if (avoidPaths.has(normalizePath(file.path))) continue;
    tryAdd(file);
  }

  const filtered = applyGuidance(selected);
  const includedPaths = new Set(filtered.map((f) => normalizePath(f.path)));
  const omittedPaths = allPaths.filter((path) => !includedPaths.has(path));

  return {
    included: filtered.sort((a, b) => a.path.localeCompare(b.path)),
    omittedPaths,
    allPaths,
    usedSmartContext: true,
  };
}

export function inferEditTargetPaths(instruction: string, allPaths: string[]): string[] {
  const guidance = buildEditGuidance(instruction, allPaths);
  if (guidance) return guidance.primary_targets;

  const pathSet = new Set(allPaths.map(normalizePath));
  const targets = new Set<string>();

  for (const { pattern, paths } of TOPIC_FILE_HINTS) {
    if (!pattern.test(instruction)) continue;
    for (const path of paths) {
      if (pathSet.has(path)) targets.add(path);
    }
  }

  if (pathSet.has("package.json") && /\b(header|nav|hero|footer|homepage|logo|banner)\b/i.test(instruction)) {
    if (pathSet.has("src/routes/index.tsx")) targets.add("src/routes/index.tsx");
  }

  return [...targets];
}

export function isViteReactProject(allPaths: string[]): boolean {
  return allPaths.map(normalizePath).includes("package.json");
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
