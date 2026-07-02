/** Must stay in sync with StorefrontBuilderController message validation. */
export const BUILDER_USER_MESSAGE_MAX = 8000;

export function truncateBuilderUserMessage(message: string, max = BUILDER_USER_MESSAGE_MAX): string {
  const trimmed = message.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 64)}\n\n[Message truncated — ${trimmed.length - max + 64} characters omitted]`;
}
