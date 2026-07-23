import { BUILDER_EXECUTOR_SYSTEM_PROMPT } from "@/lib/storefront-builder/prompts";
import type { BuilderSession } from "@/lib/api/types";
import type { WebsiteBuilderToolDef } from "../types";
import {
  formatThinkingContext,
  type InterpreterResult,
  type PlannerPlanStep,
  type PlannerResult,
} from "../agentThinking";
import { getAssistantMessageContent, getChatModelName, postChat } from "../openaiChat";
import { BuilderAgent } from "./BuilderAgent";

export type ExecutorChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ExecutorToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type ExecutorToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type OpenAiToolSchema = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ExecutorStepDecision = {
  assistantMessage: ExecutorChatMessage & { role: "assistant" };
  toolCalls: ExecutorToolCall[];
  prose: string;
};

/** Executes one plan step at a time. Manager feeds briefing, then step instructions. */
export class ExecutorAgent extends BuilderAgent {
  readonly role = "Executor" as const;
  private briefing = "";
  private sessionState = "";

  get systemPrompt(): string {
    return [BUILDER_EXECUTOR_SYSTEM_PROMPT, this.briefing, this.sessionState]
      .filter(Boolean)
      .join("\n\n");
  }

  /** Manager feeds Interpreter + Planner output before any step runs. */
  receiveBriefing(input: {
    interpretation: InterpreterResult;
    plan: PlannerResult;
    scopeHint?: string;
    session: BuilderSession;
    toolDefs: WebsiteBuilderToolDef[];
  }): this {
    this.briefing =
      formatThinkingContext(input.interpretation, input.plan) +
      (input.scopeHint ? `\n\n### Scope\n${input.scopeHint}\n` : "");

    this.sessionState = input.session.storefront_snapshot
      ? "### Session state\nA website draft already exists in the preview. Follow the plan above — call each planned tool in order. Never reply with only prose when a tool is assigned to you. Execute tools silently and report results after.\n" +
        "When calling replace_template_images, ALWAYS set scope yourself from the merchant's intent (full_site|hero|about|category_showcase|products). Do not omit scope. Banner/header/homepage background = hero.\n" +
        "When the merchant names a specific product for a photo update, pass product_name (and scope=products). Never refresh all product photos for one named product.\n" +
        "When the merchant names a specific product for a description update, call generate_product_descriptions with product_name. Never rewrite all descriptions for one named product.\n" +
        "When adding a product and they want a photo (e.g. 'add Dell Latitude 5900 and find an image'), call add_products with find_images=true. If price is missing, ask_clarifying_question for the price first.\n" +
        "If which product or section is unclear, call ask_clarifying_question instead of guessing — when possible include resume_tool, resume_arguments, and await_field so their answer resumes the same action.\n" +
        "If Pending clarification context is present, continue that pending action with the merchant's answer.\n" +
        "If Recent product focus is present and the merchant refers to it/its/again/the description without a product name, use that focused product_name — never substitute an older product.\n" +
        `Enabled tools: ${input.toolDefs.map((tool) => tool.name).join(", ")}`
      : "### Session state\nNo website draft yet. Gather business details if needed, then design and generate when the merchant is ready.";

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

  /** Manager feeds one plan step; agent decides which tools to call. */
  async runStep(input: {
    messages: ExecutorChatMessage[];
    step: PlannerPlanStep;
    stepToolNames: string[];
    stepTools: OpenAiToolSchema[];
    allTools: OpenAiToolSchema[];
  }): Promise<ExecutorStepDecision | null> {
    const { messages, step, stepToolNames, stepTools, allTools } = input;

    const stepPrompt =
      `[internal] Execute ONLY step ${step.step} of the plan: "${step.description}". ` +
      (stepToolNames.length
        ? `You MUST call one of these tools now: ${stepToolNames.join(", ")}. `
        : "") +
      "Do NOT reply with only prose. Do NOT do anything else — just this one step.";

    messages.push({ role: "user", content: stepPrompt });

    const forcedToolChoice =
      stepToolNames.length === 1
        ? { type: "function", function: { name: stepToolNames[0] } }
        : stepToolNames.length > 1
          ? ("required" as const)
          : ("auto" as const);

    // Tool calling needs a normal chat model — thinking/reasoner models reject
    // forced tool_choice ("required" / specific function).
    const model = await getChatModelName();
    const thinkingUnsafe = /thinking|reasoner|\bo1\b|\bo3\b|\bo4-mini\b/i.test(model);
    const toolChoice = thinkingUnsafe ? ("auto" as const) : forcedToolChoice;

    const data = await postChat({
      model,
      messages,
      tools: stepTools.length ? stepTools : allTools,
      tool_choice: toolChoice,
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

  /** Manager asks for a merchant-facing reply when tools didn't set one. */
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
