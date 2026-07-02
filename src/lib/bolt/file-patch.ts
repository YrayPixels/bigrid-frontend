export function normalizePatchPath(path: string): string {
  return path.replace(/^\/+/, "").trim();
}

/** Strip accidental line-number prefixes models copy from read_file output. */
export function normalizePatchOldString(oldString: string): string {
  return oldString
    .split("\n")
    .map((line) => line.replace(/^\s*\d+\|\s?/, ""))
    .join("\n");
}

export function applySearchReplace(
  content: string,
  oldString: string,
  newString: string,
  replaceAll = false,
): { ok: true; content: string; replacements: number } | { ok: false; error: string } {
  const candidates = [oldString, normalizePatchOldString(oldString)].filter(
    (value, index, arr) => value && arr.indexOf(value) === index,
  );

  for (const candidate of candidates) {
    if (!candidate) continue;

    if (!content.includes(candidate)) continue;

    if (replaceAll) {
      const parts = content.split(candidate);
      return {
        ok: true,
        content: parts.join(newString),
        replacements: parts.length - 1,
      };
    }

    const index = content.indexOf(candidate);
    return {
      ok: true,
      content: content.slice(0, index) + newString + content.slice(index + candidate.length),
      replacements: 1,
    };
  }

  return {
    ok: false,
    error: "old_string not found in file (must match exactly including whitespace; do not include line numbers)",
  };
}

export function readFileSlice(
  content: string,
  startLine = 1,
  endLine?: number,
): { text: string; startLine: number; endLine: number; totalLines: number } {
  const lines = content.split("\n");
  const start = Math.max(1, startLine);
  const end = Math.min(endLine ?? lines.length, lines.length);
  const slice = lines.slice(start - 1, end);

  const numbered = slice
    .map((line, index) => `${String(start + index).padStart(5, " ")}| ${line}`)
    .join("\n");

  return {
    text: numbered,
    startLine: start,
    endLine: end,
    totalLines: lines.length,
  };
}
