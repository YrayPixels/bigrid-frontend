export function stripAnsi(input: string): string {
  return input.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "");
}

export function sanitizeTerminalOutput(chunk: string): string {
  let text = stripAnsi(chunk).replace(/\r/g, "");
  const trimmed = text.trim();
  if (!trimmed) return "";
  // npm progress spinner frames when not attached to a TTY
  if (/^[\|/\\\-]+$/.test(trimmed)) return "";
  return text;
}
