import { ingestWebContainerOutput } from "@/lib/bolt/workbench-preview-errors";

type OutputListener = (chunk: string) => void;

const listeners = new Set<OutputListener>();
let buffer = "";
const MAX_BUFFER = 120_000;

/** Append boot logs, install output, and shell command output for the preview terminal. */
export function appendWebContainerOutput(chunk: string): void {
  if (!chunk) return;
  buffer = (buffer + chunk).slice(-MAX_BUFFER);
  ingestWebContainerOutput(chunk);
  for (const listener of listeners) {
    listener(chunk);
  }
}

export function clearWebContainerOutput(): void {
  buffer = "";
}

/** Return the tail of buffered WebContainer boot/dev/shell output. */
export function getWebContainerOutputTail(maxChars = 12_000): string {
  if (!buffer) return "";
  return buffer.slice(-Math.max(500, maxChars));
}

/** Subscribe to terminal output. Replays the buffered log once when attaching. */
export function subscribeWebContainerOutput(listener: OutputListener): () => void {
  if (buffer) listener(buffer);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
