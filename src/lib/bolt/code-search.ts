import type { CodeFile } from "@/lib/code-fs";

export type CodeSearchMatch = {
  path: string;
  line: number;
  column: number;
  text: string;
  query: string;
};

const SEARCHABLE_EXT = /\.(tsx?|jsx?|css|html?|json|md|vue|svelte)$/i;

const IGNORE_PATH =
  /^(pnpm-lock\.yaml|bun\.lock|package-lock\.json|yarn\.lock|\.DS_Store)$|\.gen\.ts$|^public\/|\/node_modules\//;

function normalizePath(path: string): string {
  return path.replace(/^\/+/, "");
}

function isSearchableFile(file: CodeFile): boolean {
  const path = normalizePath(file.path);
  if (!path || IGNORE_PATH.test(path)) return false;
  if (file.encoding === "base64") return false;
  return SEARCHABLE_EXT.test(path);
}

/** Build grep queries from a natural-language edit instruction. */
export function buildSearchQueries(instruction: string): string[] {
  const queries = new Set<string>();
  const lower = instruction.toLowerCase();

  for (const token of lower.split(/[^a-z0-9]+/g)) {
    if (token.length >= 3) queries.add(token);
  }

  if (/\bheader\b/i.test(instruction)) {
    queries.add("<header");
    queries.add("function Nav");
    queries.add("Nav()");
  }
  if (/\b(nav|navigation|menu)\b/i.test(instruction)) {
    queries.add("function Nav");
    queries.add("<nav");
  }
  if (/\b(hero|banner)\b/i.test(instruction)) {
    queries.add("function Hero");
    queries.add("<section");
  }
  if (/\bfooter\b/i.test(instruction)) {
    queries.add("footer");
    queries.add("function Footer");
  }
  if (/\b(color|background|navy|blue|red|green|theme|font)\b/i.test(instruction)) {
    queries.add("background");
    queries.add("className");
    queries.add("bg-");
    queries.add("--primary");
  }
  if (/\b(button|cta)\b/i.test(instruction)) {
    queries.add("<button");
    queries.add("Button");
  }
  if (/\b(logo|brand)\b/i.test(instruction)) {
    queries.add("Logo");
    queries.add("logo");
  }

  return [...queries].slice(0, 12);
}

export function searchCodeFiles(
  files: CodeFile[],
  queries: string[],
  options?: {
    maxMatchesPerQuery?: number;
    maxTotal?: number;
    pathFilter?: string[];
  },
): CodeSearchMatch[] {
  const maxPerQuery = options?.maxMatchesPerQuery ?? 8;
  const maxTotal = options?.maxTotal ?? 40;
  const pathFilter = options?.pathFilter?.map(normalizePath);
  const pathFilterSet = pathFilter?.length ? new Set(pathFilter) : null;

  const matches: CodeSearchMatch[] = [];
  const seen = new Set<string>();

  const searchable = files.filter(isSearchableFile).filter((file) => {
    if (!pathFilterSet) return true;
    return pathFilterSet.has(normalizePath(file.path));
  });

  for (const query of queries) {
    if (!query.trim()) continue;
    const q = query.toLowerCase();
    let queryCount = 0;

    for (const file of searchable) {
      const path = normalizePath(file.path);
      const lines = file.content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        const index = line.toLowerCase().indexOf(q);
        if (index === -1) continue;

        const key = `${path}:${i + 1}:${q}`;
        if (seen.has(key)) continue;
        seen.add(key);

        matches.push({
          path,
          line: i + 1,
          column: index + 1,
          text: line.trimEnd(),
          query,
        });

        queryCount++;
        if (queryCount >= maxPerQuery || matches.length >= maxTotal) break;
      }

      if (queryCount >= maxPerQuery || matches.length >= maxTotal) break;
    }

    if (matches.length >= maxTotal) break;
  }

  return matches.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);
}

export function topPathsFromMatches(matches: CodeSearchMatch[], limit = 6): string[] {
  const counts = new Map<string, number>();
  for (const match of matches) {
    counts.set(match.path, (counts.get(match.path) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([path]) => path);
}

export function formatSearchResultsForPrompt(matches: CodeSearchMatch[], limit = 24): string {
  if (matches.length === 0) return "No matches found.";

  const lines: string[] = [];
  for (const match of matches.slice(0, limit)) {
    lines.push(`${match.path}:${match.line}: ${match.text}`);
  }
  if (matches.length > limit) {
    lines.push(`… ${matches.length - limit} more matches`);
  }
  return lines.join("\n");
}
