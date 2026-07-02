import { stripAnsi } from "@/lib/bolt/terminal-output";

export type WorkbenchPreviewError = {
  id: string;
  source: "compile" | "runtime";
  title: string;
  message: string;
  content: string;
  filePath?: string;
  line?: number;
  seenAt: number;
};

const MAX_ERRORS = 3;
const MAX_ERROR_CONTENT = 4000;
const MAX_SCAN_BUFFER = 24_000;

const COMPILE_ERROR_MARKERS = [
  /\[plugin:vite:/i,
  /Pre-transform error:/i,
  /Internal server error:/i,
  /Error transforming route file/i,
  /✘ \[ERROR\]/,
  /error TS\d+:/i,
  /Failed to resolve import/i,
  /Could not resolve/i,
  /SyntaxError:/i,
  /Unexpected token/i,
];

type ErrorListener = () => void;

let scanBuffer = "";
let errors: WorkbenchPreviewError[] = [];
const listeners = new Set<ErrorListener>();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function errorId(source: WorkbenchPreviewError["source"], content: string): string {
  return `${source}:${content.slice(0, 240)}`;
}

function pushError(error: Omit<WorkbenchPreviewError, "id" | "seenAt">) {
  const content = error.content.trim().slice(0, MAX_ERROR_CONTENT);
  if (!content) return;

  const id = errorId(error.source, content);
  const existing = errors.find((entry) => entry.id === id);
  if (existing) {
    existing.seenAt = Date.now();
    notify();
    return;
  }

  errors = [{ ...error, id, content, seenAt: Date.now() }, ...errors].slice(0, MAX_ERRORS);
  notify();
}

function extractFileLocation(text: string): { filePath?: string; line?: number } {
  const withPath =
    text.match(/(?:\/home\/project\/)?((?:src|app)\/[^\s:)]+):(\d+)(?::\d+)?/) ??
    text.match(/\b((?:src|app)\/[^\s:)]+):(\d+)(?::\d+)?/);
  if (withPath) {
    return {
      filePath: withPath[1],
      line: Number.parseInt(withPath[2] ?? "", 10) || undefined,
    };
  }

  const pathOnly =
    text.match(/(?:\/home\/project\/)?((?:src|app)\/[^\s:)]+\.[tj]sx?)/i)?.[1] ??
    text.match(/\b((?:src|app)\/[^\s:)]+\.[tj]sx?)/i)?.[1];
  const parenLine = text.match(/\((\d+):(\d+)\)/);
  const line = parenLine ? Number.parseInt(parenLine[1] ?? "", 10) || undefined : undefined;

  if (pathOnly) {
    return { filePath: pathOnly, line };
  }

  return {};
}

function captureCompileBlock(lines: string[], startIndex: number): string {
  const block: string[] = [];
  let blankRun = 0;

  for (let i = startIndex; i < lines.length && block.length < 40; i++) {
    const line = lines[i] ?? "";
    if (!line.trim()) {
      blankRun += 1;
      if (blankRun >= 2 && block.length > 2) break;
      block.push(line);
      continue;
    }
    blankRun = 0;
    block.push(line);
  }

  return block.join("\n").trim();
}

function ingestCompileOutput(text: string) {
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (!COMPILE_ERROR_MARKERS.some((marker) => marker.test(line))) continue;

    const content = captureCompileBlock(lines, i);
    const location = extractFileLocation(content);
    pushError({
      source: "compile",
      title: "Compile error in preview",
      message: line.trim().slice(0, 240),
      content,
      ...location,
    });
    break;
  }
}

export function ingestWebContainerOutput(chunk: string): void {
  if (!chunk) return;
  const cleaned = stripAnsi(chunk).replace(/\r/g, "");
  if (!cleaned.trim()) return;

  scanBuffer = (scanBuffer + cleaned).slice(-MAX_SCAN_BUFFER);
  ingestCompileOutput(scanBuffer);
}

export function recordWorkbenchPreviewRuntimeError(args: {
  title: string;
  message: string;
  stack?: string;
  pathname?: string;
  port?: number;
}): void {
  const location = args.pathname ? ` at ${args.pathname}` : "";
  const port = args.port ? `\nPort: ${args.port}` : "";
  const stack = args.stack?.trim() ? `\n\n${args.stack.trim()}` : "";
  const content = `${args.title}: ${args.message}${location}${port}${stack}`.trim();

  pushError({
    source: "runtime",
    title: "Runtime error in preview",
    message: args.message,
    content,
  });
}

export function getLatestWorkbenchErrors(): WorkbenchPreviewError[] {
  return [...errors];
}

export function clearWorkbenchErrors(): void {
  errors = [];
  notify();
}

export function dismissWorkbenchError(id: string): void {
  errors = errors.filter((error) => error.id !== id);
  notify();
}

export function subscribeWorkbenchErrors(listener: ErrorListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function formatErrorsForAgent(errorsToFormat: WorkbenchPreviewError[]): string {
  if (errorsToFormat.length === 0) return "";

  return errorsToFormat
    .map((error, index) => {
      const location =
        error.filePath && error.line
          ? ` (${error.filePath}:${error.line})`
          : error.filePath
            ? ` (${error.filePath})`
            : "";
      return `Error ${index + 1} [${error.source}]${location}:\n${error.content}`;
    })
    .join("\n\n");
}

/** Short chat message for persistence; full error text goes through workbench context. */
export const FIX_PREVIEW_ERROR_MESSAGE = "Fix the compile error in the WebContainer preview.";

export function buildFixPreviewErrorMessage(error: WorkbenchPreviewError): string {
  const location =
    error.filePath && error.line
      ? `${error.filePath} at line ${error.line}`
      : error.filePath ?? "the project";

  return [
    `Fix this WebContainer compile error in ${location}.`,
    "Use grep → read_file → search_replace on the broken JSX/TSX only. Do not rewrite entire files.",
    "",
    error.message,
    "",
    error.content,
  ].join("\n");
}
