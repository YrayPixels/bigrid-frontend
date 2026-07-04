export function stripAnsi(input: string): string {
  const esc = String.fromCharCode(27);
  return input.replace(new RegExp(`${esc}(?:[@-Z\\-_]|\\[[0-?]*[ -/]*[@-~])`, "g"), "");
}

export function sanitizeTerminalOutput(chunk: string): string {
  const text = stripAnsi(chunk).replace(/\r/g, "");
  const trimmed = text.trim();
  if (!trimmed) return "";
  // npm progress spinner frames when not attached to a TTY
  if (/^[|/\\-]+$/.test(trimmed)) return "";
  return text;
}
