type OutputListener = (chunk: string) => void;

const listeners = new Set<OutputListener>();
let buffer = "";
const MAX_BUFFER = 120_000;

/** Append boot logs, install output, and shell command output for the preview terminal. */
export function appendWebContainerOutput(chunk: string): void {
  if (!chunk) return;
  buffer = (buffer + chunk).slice(-MAX_BUFFER);
  for (const listener of listeners) {
    listener(chunk);
  }
}

export function clearWebContainerOutput(): void {
  buffer = "";
}

/** Subscribe to terminal output. Replays the buffered log once when attaching. */
export function subscribeWebContainerOutput(listener: OutputListener): () => void {
  if (buffer) listener(buffer);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
