import type {
  BuilderBusinessProfile,
  BuilderSession,
  StorefrontContent,
  StorefrontTemplateId,
  StorefrontTemplateOption,
  StorefrontTemplateRecommendation,
} from "@/lib/api/types";
import type { BuilderAiTurn } from "@/lib/storefront-builder/local-ai";
import {
  fallbackBuilderTurn,
  hasMinimumBusinessProfile,
  isSubstantiveBuilderMessage,
  sanitizeBusinessProfile,
} from "@/lib/storefront-builder/local-ai";
import {
  appendMemory,
  formatThinkingContext,
  runCritic,
  runInterpreter,
  runPlanner,
  summarizeToolResult,
  type InterpreterResult,
  type PlannerResult,
} from "./agentThinking";
import { getAssistantMessageContent, postChat } from "./openaiChat";
import { websiteBuilderTools } from "./tools";
import type { AgentActivityPayload, WebsiteBuilderContext, WebsiteBuilderToolDef } from "./types";

type AssistantToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: AssistantToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

function toOpenAiTools(defs: WebsiteBuilderToolDef[]) {
  return defs.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export class StorefrontBuilderManager {
  constructor(private onActivity?: (payload: AgentActivityPayload) => void) {}

  private emit(payload: AgentActivityPayload) {
    this.onActivity?.(payload);
  }

  async runTurn(args: {
    message: string;
    session: BuilderSession;
    recommendations: StorefrontTemplateRecommendation[];
    templateOptions: StorefrontTemplateOption[];
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  }): Promise<BuilderAiTurn> {
    const { message, session, recommendations, templateOptions, history } = args;
    const availableTemplateIds = templateOptions
      .filter((option) => option.value !== "ai_pick")
      .map((option) => option.value as StorefrontTemplateId);
    const fallback = fallbackBuilderTurn({
      message,
      session,
      recommendations,
      availableTemplateIds,
    });

    if (session.storefront_snapshot) {
      return this.runRefineTurn(message, session);
    }

    if (!isSubstantiveBuilderMessage(message)) {
      return {
        business_profile: sanitizeBusinessProfile(session.business_profile ?? {}),
        status: session.status,
        assistant_message: fallback.assistant_message,
        assistant_payload: { type: "conversation" },
      };
    }

    const toolDefs = websiteBuilderTools();
    const historySnippet = (history ?? [])
      .slice(-8)
      .map((entry) => `${entry.role === "assistant" ? "Assistant" : "Merchant"}: ${entry.content}`)
      .join("\n");

    this.emit({
      agent: "Interpreter",
      phase: "interpret",
      title: "Understanding your request",
    });
    const interpretation = await runInterpreter({ userText: message, historySnippet }).catch(() => null);
    if (!interpretation) return fallback;

    this.emit({
      agent: "Planner",
      phase: "plan",
      title: "Planning your website",
      detail: interpretation.task_summary,
    });
    const plan = await runPlanner({ userText: message, interpretation, toolDefs }).catch(() => null);
    if (!plan) return fallback;

    const ctx: WebsiteBuilderContext = {
      message,
      session,
      profile: sanitizeBusinessProfile(session.business_profile ?? {}),
      recommendations,
      templateOptions,
      selectedTemplateId: session.selected_template_id,
      storefront: session.storefront_snapshot,
      assistantMessage: "",
      status: session.status,
      payload: { type: "agent_turn", plan: plan.plan_steps, tool_calls: [], tool_results: [] },
    };

    const memory: string[] = [];
    const toolCallsLog: Array<{ name: string; arguments: Record<string, unknown> }> = [];
    const toolResultsLog: Array<Record<string, unknown>> = [];

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "You are the Storehaus website builder assistant.\n" +
          "You personally design and build websites for merchants through tools.\n" +
          "Never mention templates, themes, or internal design systems.\n" +
          "When the merchant asks you to build, create, or go ahead, design the website and generate it.\n\n" +
          formatThinkingContext(interpretation, plan),
      },
      ...(history ?? []).map((entry) => ({
        role: entry.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: entry.content,
      })),
      { role: "user", content: message },
    ];

    const openAiTools = toOpenAiTools(toolDefs);
    let criticStatus: "CONTINUE" | "DONE" | "NEED_USER" = "CONTINUE";

    for (let iteration = 0; iteration < 8 && criticStatus === "CONTINUE"; iteration++) {
      this.emit({
        agent: "Executor",
        phase: "execute",
        title: iteration === 0 ? "Building your website" : "Continuing website work",
      });

      const data = await postChat({
        messages,
        tools: openAiTools,
        tool_choice: "auto",
        temperature: 0.35,
      }).catch(() => null);

      const assistant = data?.choices?.[0]?.message;
      if (!assistant) break;

      const rawCalls = (assistant as { tool_calls?: AssistantToolCall[] }).tool_calls;
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: typeof assistant.content === "string" ? assistant.content : null,
        ...(Array.isArray(rawCalls) ? { tool_calls: rawCalls } : {}),
      };
      messages.push(assistantMessage);

      if (!assistantMessage.tool_calls?.length) {
        if (assistantMessage.content?.trim()) ctx.assistantMessage = assistantMessage.content.trim();
        criticStatus = "DONE";
        break;
      }

      const lastToolSummaries: string[] = [];
      for (const toolCall of assistantMessage.tool_calls) {
        const name = toolCall.function?.name;
        const callId = toolCall.id;
        if (!name || !callId) continue;

        const def = toolDefs.find((tool) => tool.name === name);
        let parsed: Record<string, unknown> = {};
        try {
          parsed = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
        } catch {
          parsed = {};
        }

        toolCallsLog.push({ name, arguments: parsed });

        if (!def) {
          const payload = JSON.stringify({ error: `Unknown tool: ${name}` });
          messages.push({ role: "tool", tool_call_id: callId, content: payload });
          continue;
        }

        const result = await def.handler(parsed, ctx);
        toolResultsLog.push({ name, ...result });
        const payload = JSON.stringify(result);
        messages.push({ role: "tool", tool_call_id: callId, content: payload });
        lastToolSummaries.push(summarizeToolResult(name, result));
        memory.push(...lastToolSummaries);
      }

      this.emit({
        agent: "Critic",
        phase: "critique",
        title: "Reviewing progress",
      });

      const critic = await runCritic({
        userText: message,
        interpretation,
        plan,
        memoryLines: memory,
        lastToolSummaries,
      }).catch(() => ({ status: "DONE" as const, reason: "fallback" }));

      criticStatus = critic.status;
      memory.push(`[critic] ${critic.status}: ${critic.reason}`);

      if (criticStatus === "NEED_USER" && !ctx.assistantMessage) {
        ctx.assistantMessage = critic.reason;
        ctx.payload = { type: "requirements_request", profile: ctx.profile };
      }
    }

    if (!ctx.assistantMessage) {
      const finalData = await postChat({
        messages: [
          ...messages,
          {
            role: "user",
            content:
              "[internal] Respond to the merchant in 1-3 warm sentences. Do not mention templates. " +
              "If a website was generated, invite them to preview it and ask for refinements.",
          },
        ],
        tool_choice: "none",
        temperature: 0.4,
      }).catch(() => null);
      ctx.assistantMessage =
        getAssistantMessageContent(finalData ?? {}) || fallback.assistant_message;
    }

    ctx.payload = {
      type: "agent_turn",
      plan: plan.plan_steps,
      tool_calls: toolCallsLog,
      tool_results: toolResultsLog,
      profile: ctx.profile,
    };

    if (ctx.storefront) {
      ctx.payload = { type: "website_generated" };
      if (!ctx.assistantMessage || ctx.assistantMessage === fallback.assistant_message) {
        ctx.assistantMessage =
          "Your website is ready. Preview it on the right, then tell me what to refine — headline, about section, CTA, or SEO.";
      }
    }

    return {
      business_profile: ctx.profile,
      status: ctx.status,
      selected_template_id: ctx.selectedTemplateId,
      storefront: ctx.storefront ?? undefined,
      assistant_message: ctx.assistantMessage,
      assistant_payload: ctx.payload,
    };
  }

  private async runRefineTurn(message: string, session: BuilderSession): Promise<BuilderAiTurn> {
    const toolDefs = websiteBuilderTools();
    const refineTool = toolDefs.find((tool) => tool.name === "refine_website_copy");
    const ctx: WebsiteBuilderContext = {
      message,
      session,
      profile: sanitizeBusinessProfile(session.business_profile ?? {}),
      recommendations: session.recommendations,
      templateOptions: [],
      selectedTemplateId: session.selected_template_id,
      storefront: session.storefront_snapshot,
      assistantMessage: "",
      status: session.status,
      payload: {},
    };

    if (refineTool) {
      const result = await refineTool.handler({ instruction: message }, ctx);
      if (result.ok) {
        return {
          business_profile: ctx.profile,
          status: ctx.status,
          selected_template_id: ctx.selectedTemplateId,
          storefront: ctx.storefront ?? undefined,
          assistant_message: ctx.assistantMessage,
          assistant_payload: ctx.payload,
        };
      }
    }

    return {
      business_profile: ctx.profile,
      status: "review_ready",
      selected_template_id: session.selected_template_id,
      assistant_message: "Tell me which part of the website you want changed and I will update it.",
      assistant_payload: { type: "conversation" },
    };
  }
}
