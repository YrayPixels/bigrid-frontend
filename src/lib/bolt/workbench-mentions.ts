/** Parse `@path/to/file` or `@path/to/folder` tokens from a chat message. */
const MENTION_TOKEN = /@([\w./@-]+)/g;

export type MentionCandidate = {
  path: string;
  kind: "file" | "folder";
};

export function normalizeMentionPath(path: string): string {
  return path.replace(/^\/+/, "").replace(/\/+$/, "");
}

function collectFolderPaths(filePaths: string[]): string[] {
  const folders = new Set<string>();
  for (const file of filePaths) {
    const parts = normalizeMentionPath(file).split("/").filter(Boolean);
    for (let i = 1; i < parts.length; i++) {
      folders.add(parts.slice(0, i).join("/"));
    }
  }
  return [...folders].sort((a, b) => a.localeCompare(b));
}

function filesUnderPrefix(projectPaths: string[], prefix: string): string[] {
  const normalized = normalizeMentionPath(prefix);
  return projectPaths
    .map((path) => normalizeMentionPath(path))
    .filter(
      (path) =>
        path.toLowerCase() === normalized.toLowerCase() ||
        path.toLowerCase().startsWith(`${normalized.toLowerCase()}/`),
    );
}

export function resolveMentionPath(token: string, projectPaths: string[]): string | null {
  const raw = normalizeMentionPath(token.replace(/[.,;:!?)]+$/, ""));
  if (!raw) return null;

  const normalized = projectPaths.map((path) => normalizeMentionPath(path));

  const exact = normalized.find((path) => path === raw);
  if (exact) return exact;

  const caseInsensitive = normalized.find((path) => path.toLowerCase() === raw.toLowerCase());
  if (caseInsensitive) return caseInsensitive;

  const byFileName = normalized.filter(
    (path) => path.split("/").pop()?.toLowerCase() === raw.toLowerCase(),
  );
  if (byFileName.length === 1) return byFileName[0]!;

  const suffixMatch = normalized.filter((path) => path.toLowerCase().endsWith(`/${raw.toLowerCase()}`));
  if (suffixMatch.length === 1) return suffixMatch[0]!;

  const folderChildren = filesUnderPrefix(projectPaths, raw);
  if (folderChildren.length > 0) return raw;

  return null;
}

export function expandTaggedPaths(tagged: string[], projectPaths: string[]): string[] {
  const expanded = new Set<string>();

  for (const tag of tagged) {
    const normalized = normalizeMentionPath(tag);
    const exactFile = projectPaths.find(
      (path) => normalizeMentionPath(path).toLowerCase() === normalized.toLowerCase(),
    );
    if (exactFile) {
      expanded.add(normalizeMentionPath(exactFile));
      continue;
    }

    for (const path of filesUnderPrefix(projectPaths, normalized)) {
      expanded.add(path);
    }
  }

  return [...expanded];
}

export function extractTaggedPaths(message: string, projectPaths: string[]): string[] {
  const tagged = new Set<string>();
  for (const match of message.matchAll(MENTION_TOKEN)) {
    const resolved = resolveMentionPath(match[1] ?? "", projectPaths);
    if (resolved) tagged.add(resolved);
  }
  return expandTaggedPaths([...tagged], projectPaths);
}

export function extractTaggedMentions(message: string, projectPaths: string[]): string[] {
  const tagged = new Set<string>();
  for (const match of message.matchAll(MENTION_TOKEN)) {
    const resolved = resolveMentionPath(match[1] ?? "", projectPaths);
    if (resolved) tagged.add(resolved);
  }
  return [...tagged];
}

export function getActiveMention(
  value: string,
  cursor: number,
): { start: number; query: string } | null {
  const before = value.slice(0, cursor);
  const at = before.lastIndexOf("@");
  if (at === -1) return null;

  const charBefore = at > 0 ? before[at - 1] : " ";
  if (charBefore && !/\s/.test(charBefore)) return null;

  const query = before.slice(at + 1);
  if (/\s/.test(query)) return null;

  return { start: at, query };
}

const BINARY_EXT = /\.(jpg|jpeg|png|webp|gif|ico|woff2?|ttf|eot)$/i;

function scoreMention(path: string, kind: MentionCandidate["kind"], query: string): number | null {
  const q = query.trim().toLowerCase();
  const name = path.split("/").pop()?.toLowerCase() ?? path.toLowerCase();
  const lower = path.toLowerCase();
  let score = kind === "folder" ? 2 : 0;

  if (!q) score += 1;
  else if (name === q) score += 120;
  else if (name.startsWith(q)) score += 90;
  else if (lower.includes(q)) score += 50;
  else return null;

  if (path.startsWith("src/routes")) score += 8;
  if (kind === "folder" && q && name.startsWith(q)) score += 10;
  return score;
}

export function filterMentionCandidates(
  paths: string[],
  query: string,
  limit = 14,
): MentionCandidate[] {
  const files = paths
    .map((path) => normalizeMentionPath(path))
    .filter((path) => path && !BINARY_EXT.test(path));

  const folders = collectFolderPaths(files);
  const scored: Array<MentionCandidate & { score: number }> = [];

  for (const path of files) {
    const score = scoreMention(path, "file", query);
    if (score !== null) scored.push({ path, kind: "file", score });
  }

  for (const path of folders) {
    const score = scoreMention(path, "folder", query);
    if (score !== null) scored.push({ path, kind: "folder", score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, limit)
    .map(({ path, kind }) => ({ path, kind }));
}
