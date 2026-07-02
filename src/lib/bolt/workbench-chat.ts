import { postChat } from "@/lib/storefront-builder/agents/openaiChat";
import type { BuilderChatHistoryEntry } from "@/lib/storefront-builder/chat-history";

export async function respondWorkbenchChat(args: {
  message: string;
  chatHistory?: BuilderChatHistoryEntry[];
  focusedPath?: string | null;
}): Promise<string> {
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    {
      role: "system",
      content: [
        "You are a friendly assistant in the StoreHause website workbench.",
        "The merchant is editing a custom storefront with a live code editor and preview.",
        "Respond conversationally to greetings and general questions.",
        "If they ask to delete or remove a project file, tell them to say e.g. \"delete AGENTS.md\" — the workbench will remove it automatically.",
        "If they seem to want site changes, suggest they describe the change clearly (e.g. \"make the header background navy\").",
        "Keep replies short (1-3 sentences). Do not claim you edited any files.",
        args.focusedPath ? `The user is currently viewing: ${args.focusedPath}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    },
  ];

  for (const entry of args.chatHistory ?? []) {
    const content = entry.content.trim();
    if (!content) continue;
    messages.push({ role: entry.role, content });
  }

  messages.push({ role: "user", content: args.message });

  try {
    const data = await postChat({
      messages,
      tool_choice: "none",
      temperature: 0.7,
    });
    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (reply) return reply;
  } catch {
    // Fall through to template reply.
  }

  return "Hi! Tell me what you'd like to change on your site — for example, \"make the header navy\" or \"update the hero headline\".";
}
