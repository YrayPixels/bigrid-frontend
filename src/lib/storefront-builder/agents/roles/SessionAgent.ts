import { BUILDER_EXECUTOR_SYSTEM_PROMPT } from "@/lib/storefront-builder/prompts";
import type { BuilderSession } from "@/lib/api/types";
import type { WebsiteBuilderToolDef } from "../types";
import {
  getAssistantMessageContent,
  getChatModelName,
  postChat,
  postChatCompletionStream,
} from "../openaiChat";
import { BuilderAgent } from "./BuilderAgent";
import type {
  ExecutorChatMessage,
  ExecutorStepDecision,
  ExecutorToolCall,
  OpenAiToolSchema,
} from "./ExecutorAgent";

/**
 * Single chat-model agent with all session tools (feature-flagged path).
 * No Interpret+Plan briefing — the model chooses tools directly.
 */
export class SessionAgent extends BuilderAgent {
  readonly role = "Session" as const;
  private sessionState = "";
  private contextHint = "";

  get systemPrompt(): string {
    return [BUILDER_EXECUTOR_SYSTEM_PROMPT, this.sessionState, this.contextHint]
      .filter(Boolean)
      .join("\n\n");
  }

  configure(input: {
    session: BuilderSession;
    toolDefs: WebsiteBuilderToolDef[];
    contextHint?: string;
  }): this {
    this.contextHint = input.contextHint?.trim() ? `### Context\n${input.contextHint.trim()}` : "";
    this.sessionState = input.session.storefront_snapshot
      ? "### Session state\nA website draft already exists in the preview. Call tools to fulfill the merchant request — do not ask permission first.\n" +
        "When calling replace_template_images, ALWAYS set scope yourself from the merchant's intent (full_site|hero|about|category_showcase|products). Do not omit scope. Banner/header/homepage background = hero.\n" +
        "When the merchant names a specific product for a photo update, pass product_name (and scope=products). Never refresh all product photos for one named product.\n" +
        "When the merchant names a specific product for a description update, call generate_product_descriptions with product_name. Never rewrite all descriptions for one named product.\n" +
        "When adding a product and they want a photo, call add_products with find_images=true. If price is missing, ask_clarifying_question for the price first.\n" +
        "If which product or section is unclear, call ask_clarifying_question instead of guessing.\n" +
        "If Pending clarification context is present, continue that pending action with the merchant's answer.\n" +
        "If Recent product focus is present and the merchant refers to it/its/again/the description without a product name, use that focused product_name.\n" +
        `Enabled tools: ${input.toolDefs.map((tool) => tool.name).join(", ")}`
      : "### Session state\nNo website draft yet. Gather business details if needed, then design and generate when the merchant is ready.\n" +
        `Enabled tools: ${input.toolDefs.map((tool) => tool.name).join(", ")}`;
    return this;
  }

  buildInitialMessages(
    history: Array<{ role: "user" | "assistant"; content: string }> | undefined,
    merchantMessage: string,
  ): ExecutorChatMessage[] {
    return [
      { role: "system", content: this.systemPrompt },
      ...(history ?? []).map((entry) => ({
        role: entry.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: entry.content,
      })),
      { role: "user", content: merchantMessage },
    ];
  }

  private applyRetryHint(messages: ExecutorChatMessage[], retryHint?: string) {
    if (!retryHint?.trim()) return;
    messages.push({
      role: "user",
      content:
        `[internal] Critic feedback — fix this and call the correct tool(s) now:\n${retryHint.trim()}\n` +
        "Do not apologize. Do not ask permission. Act with tools when possible.",
    });
  }

  /** One model turn (blocking). Prefer runStream for the SessionAgent path. */
  async run(input: {
    messages: ExecutorChatMessage[];
    tools: OpenAiToolSchema[];
    retryHint?: string;
  }): Promise<ExecutorStepDecision | null> {
    const { messages, tools, retryHint } = input;
    this.applyRetryHint(messages, retryHint);

    const model = await getChatModelName();

    const data = await postChat({
      model,
      messages,
      tools: tools.length ? tools : undefined,
      ...(tools.length ? { tool_choice: "auto" as const } : { tool_choice: "none" as const }),
      temperature: 0.2,
    });

    const assistant = data?.choices?.[0]?.message;
    if (!assistant) return null;

    const rawCalls = (assistant as { tool_calls?: ExecutorToolCall[] }).tool_calls;
    const toolCalls = Array.isArray(rawCalls) ? rawCalls : [];
    const assistantMessage: ExecutorChatMessage & { role: "assistant" } = {
      role: "assistant",
      content: typeof assistant.content === "string" ? assistant.content : null,
      ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
    };
    messages.push(assistantMessage);

    return {
      assistantMessage,
      toolCalls,
      prose: typeof assistant.content === "string" ? assistant.content.trim() : "",
    };
  }

  /** Streaming model turn — tool names surface as soon as deltas arrive. */
  async runStream(input: {
    messages: ExecutorChatMessage[];
    tools: OpenAiToolSchema[];
    retryHint?: string;
    onContentDelta?: (delta: string) => void;
    onToolCallDelta?: (partial: {
      index: number;
      id?: string;
      name?: string;
      argumentsDelta?: string;
    }) => void;
  }): Promise<ExecutorStepDecision | null> {
    const { messages, tools, retryHint, onContentDelta, onToolCallDelta } = input;
    this.applyRetryHint(messages, retryHint);

    const streamed = await postChatCompletionStream({
      model: await getChatModelName(),
      messages,
      tools: tools.length ? tools : undefined,
      ...(tools.length ? { tool_choice: "auto" as const } : { tool_choice: "none" as const }),
      temperature: 0.2,
      onContentDelta,
      onToolCallDelta,
    });

    const toolCalls: ExecutorToolCall[] = streamed.toolCalls.map((call) => ({
      id: call.id,
      type: "function",
      function: {
        name: call.function.name,
        arguments: call.function.arguments || "{}",
      },
    }));

    const prose = streamed.text.trim();
    const assistantMessage: ExecutorChatMessage & { role: "assistant" } = {
      role: "assistant",
      content: prose || null,
      ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
    };
    messages.push(assistantMessage);

    return {
      assistantMessage,
      toolCalls,
      prose,
    };
  }

  async composeMerchantReply(messages: ExecutorChatMessage[]): Promise<string> {
    const data = await postChat({
      model: await getChatModelName(),
      messages: [
        ...messages,
        {
          role: "user",
          content:
            "[internal] Respond to the merchant in 1-3 warm sentences about what just happened. " +
            "Do not mention templates, agents, or tools. " +
            "Acknowledge the specific action that was just completed (check the tool results in the conversation). " +
            "Never reply with a generic greeting or business-building prompt when an action was just taken. " +
            "If a tool modified the website, tell the merchant what changed and invite them to check the preview.",
        },
      ],
      tool_choice: "none",
      temperature: 0.4,
    });
    return getAssistantMessageContent(data);
  }
}
