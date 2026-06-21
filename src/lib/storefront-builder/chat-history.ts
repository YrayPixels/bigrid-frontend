export const BUILDER_CHAT_HISTORY_LIMIT = 20;
export const BUILDER_HISTORY_SNIPPET_MAX_CHARS = 4000;

export type BuilderChatHistoryEntry = { role: "user" | "assistant"; content: string };

export function buildBuilderChatHistory(
  messages: Array<{ role: string; content: string }>,
  limit = BUILDER_CHAT_HISTORY_LIMIT,
): BuilderChatHistoryEntry[] {
  return messages
    .slice(-limit)
    .filter(
      (entry): entry is BuilderChatHistoryEntry =>
        (entry.role === "user" || entry.role === "assistant") && typeof entry.content === "string",
    )
    .map((entry) => ({ role: entry.role, content: entry.content }));
}

export function formatBuilderHistorySnippet(
  history: BuilderChatHistoryEntry[],
  maxChars = BUILDER_HISTORY_SNIPPET_MAX_CHARS,
): string {
  if (!history.length) return "";
  const lines = history.map(
    (entry) => `${entry.role === "assistant" ? "Assistant" : "Merchant"}: ${entry.content}`,
  );
  return lines.join("\n").trim().slice(0, maxChars);
}
