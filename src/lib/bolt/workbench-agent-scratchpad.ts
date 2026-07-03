/** In-memory scratchpad for a single workbench agent run (plan, hypotheses, notes). */
let notes: string[] = [];

export function clearAgentScratchpad(): void {
  notes = [];
}

export function getAgentScratchpad(): string {
  if (notes.length === 0) return "";
  return notes.map((note, index) => `${index + 1}. ${note}`).join("\n");
}

export function setAgentScratchpad(next: string[]): void {
  notes = next.filter((note) => note.trim().length > 0);
}

export function appendAgentScratchpad(note: string): void {
  const trimmed = note.trim();
  if (!trimmed) return;
  notes.push(trimmed);
}
