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
  isBuildIntent,
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
import { BUILDER_EXECUTOR_SYSTEM_PROMPT } from "@/lib/storefront-builder/prompts";
import type { AgentActivityPayload, AgentThinkingLogEntry, WebsiteBuilderContext, WebsiteBuilderToolDef } from "./types";
import { createThinkingLogEntry } from "./thinking-log";
import { aiSuggestedActions, colorPresetActions } from "@/lib/storefront-builder/suggested-actions";

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
  constructor(
    private onActivity?: (payload: AgentActivityPayload) => void,
    private onLog?: (entry: AgentThinkingLogEntry) => void,
  ) {}

  private log(entry: Omit<AgentThinkingLogEntry, "id" | "ts">) {
    const full = createThinkingLogEntry(entry);
    this.onLog?.(full);
    if (entry.phase === "start") {
      this.emit({
        agent: entry.agent === "System" ? "Executor" : entry.agent,
        phase: entry.agent === "System" ? "system" : entry.phase,
        title: entry.title,
        detail: entry.detail,
      });
    }
  }

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

    if (session.storefront_snapshot && !isBuildIntent(message)) {
      return this.runRefineTurn(message, session, history);
    }

    if (!isSubstantiveBuilderMessage(message)) {
      this.log({
        agent: "System",
        phase: "info",
        title: "Skipped agent loop",
        detail: "Message was not substantive enough to run the thinking pipeline.",
      });
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

    this.log({
      agent: "Interpreter",
      phase: "start",
      title: "Understanding your request",
      detail: message.trim().slice(0, 280),
    });
    const interpretation = await runInterpreter({ userText: message, historySnippet }).catch((error) => {
      this.log({
        agent: "Interpreter",
        phase: "error",
        title: "Interpreter failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    });
    if (!interpretation) return fallback;

    this.log({
      agent: "Interpreter",
      phase: "complete",
      title: "Request interpreted",
      detail: interpretation.task_summary,
      data: {
        task_summary: interpretation.task_summary,
        steps: interpretation.steps,
        constraints: interpretation.constraints ?? [],
      },
    });

    this.log({
      agent: "Planner",
      phase: "start",
      title: "Planning your website",
    });
    const plan = await runPlanner({ userText: message, interpretation, toolDefs }).catch((error) => {
      this.log({
        agent: "Planner",
        phase: "error",
        title: "Planner failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      });
      return null;
    });
    if (!plan) return fallback;

    this.log({
      agent: "Planner",
      phase: "complete",
      title: "Plan ready",
      detail: plan.intent,
      data: {
        intent: plan.intent,
        plan_steps: plan.plan_steps,
        notes: plan.notes ?? null,
      },
    });

    const ctx: WebsiteBuilderContext = {
      message,
      session,
      profile: sanitizeBusinessProfile(session.business_profile ?? {}),
      recommendations,
      templateOptions,
      selectedTemplateId:
        session.selected_template_id && session.selected_template_id !== "ai_pick"
          ? session.selected_template_id
          : null,
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
        content: BUILDER_EXECUTOR_SYSTEM_PROMPT + "\n\n" + formatThinkingContext(interpretation, plan),
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
      this.log({
        agent: "Executor",
        phase: "start",
        title: iteration === 0 ? "Running executor" : `Executor iteration ${iteration + 1}`,
        data: { iteration: iteration + 1 },
      });

      const data = await postChat({
        messages,
        tools: openAiTools,
        tool_choice: "auto",
        temperature: 0.35,
      }).catch((error) => {
        this.log({
          agent: "Executor",
          phase: "error",
          title: "Executor model call failed",
          detail: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
      });

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
        this.log({
          agent: "Executor",
          phase: "complete",
          title: "Executor replied without tools",
          detail: assistantMessage.content?.trim().slice(0, 280) ?? undefined,
        });
        criticStatus = "DONE";
        break;
      }

      this.log({
        agent: "Executor",
        phase: "info",
        title: `Calling ${assistantMessage.tool_calls.length} tool(s)`,
        data: {
          tool_calls: assistantMessage.tool_calls.map((call) => ({
            name: call.function?.name,
            arguments: call.function?.arguments,
          })),
        },
      });

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

        this.log({
          agent: "Executor",
          phase: "complete",
          title: `Tool finished: ${name}`,
          detail: summarizeToolResult(name, result),
          data: { name, arguments: parsed, result },
        });
      }

      this.log({
        agent: "Critic",
        phase: "start",
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

      this.log({
        agent: "Critic",
        phase: "complete",
        title: `Critic decision: ${critic.status}`,
        detail: critic.reason,
        data: { status: critic.status, reason: critic.reason },
      });

      if (criticStatus === "NEED_USER" && !ctx.assistantMessage) {
        ctx.assistantMessage = critic.reason;
        ctx.payload = { type: "requirements_request", profile: ctx.profile };
      }
    }

    if (!ctx.assistantMessage) {
      this.log({
        agent: "System",
        phase: "start",
        title: "Composing merchant reply",
      });
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
      this.log({
        agent: "System",
        phase: "complete",
        title: "Merchant reply composed",
        detail: ctx.assistantMessage.slice(0, 280),
      });
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

    const industry = ctx.profile.industry ?? session.store?.industry ?? null;
    const colorOptions = colorPresetActions(industry, 3)
      .map((action) => (action.type === "color" ? action.color : null))
      .filter((value): value is string => typeof value === "string");
    const suggestedActions = await aiSuggestedActions({
      message,
      session: { ...session, business_profile: ctx.profile, storefront_snapshot: ctx.storefront ?? session.storefront_snapshot },
      assistantMessage: ctx.assistantMessage,
    });
    ctx.payload = {
      ...ctx.payload,
      suggested_actions: suggestedActions,
      color_options: colorOptions,
    };

    return {
      business_profile: ctx.profile,
      status: ctx.status,
      selected_template_id: ctx.selectedTemplateId,
      storefront: ctx.storefront ?? undefined,
      assistant_message: ctx.assistantMessage,
      assistant_payload: ctx.payload,
    };
  }

  private async runRefineTurn(
    message: string,
    session: BuilderSession,
    history?: Array<{ role: "user" | "assistant"; content: string }>,
  ): Promise<BuilderAiTurn> {
    const fallback = fallbackBuilderTurn({
      message,
      session,
      recommendations: session.recommendations ?? [],
      availableTemplateIds: [],
    });

    this.log({
      agent: "System",
      phase: "start",
      title: "Refine turn",
      detail: message.trim().slice(0, 280),
    });

    const refineToolDefs = websiteBuilderTools().filter(
      (tool) => tool.name === "refine_website_copy" || tool.name === "ask_clarifying_question",
    );
    const historySnippet = (history ?? [])
      .slice(-8)
      .map((entry) => `${entry.role === "assistant" ? "Assistant" : "Merchant"}: ${entry.content}`)
      .join("\n");

    this.log({
      agent: "Interpreter",
      phase: "start",
      title: "Understanding refinement request",
      detail: message.trim().slice(0, 280),
    });

    let interpretation: InterpreterResult;
    try {
      interpretation = await runInterpreter({ userText: message, historySnippet });
    } catch (error) {
      this.log({
        agent: "Interpreter",
        phase: "error",
        title: "Interpreter failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      });
      interpretation = {
        task_summary: message.trim().slice(0, 500),
        steps: ["Apply the merchant's requested copy changes to the existing website draft."],
      };
    }

    this.log({
      agent: "Interpreter",
      phase: "complete",
      title: "Refinement interpreted",
      detail: interpretation.task_summary,
      data: {
        task_summary: interpretation.task_summary,
        steps: interpretation.steps,
        constraints: interpretation.constraints ?? [],
      },
    });

    this.log({
      agent: "Planner",
      phase: "start",
      title: "Planning copy changes",
    });

    let plan: PlannerResult;
    try {
      plan = await runPlanner({ userText: message, interpretation, toolDefs: refineToolDefs });
    } catch (error) {
      this.log({
        agent: "Planner",
        phase: "error",
        title: "Planner failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      });
      plan = {
        intent: message.trim().slice(0, 400),
        plan_steps: [
          {
            step: 1,
            description: "Update the existing website copy to match the merchant request.",
            tools: ["refine_website_copy"],
          },
        ],
      };
    }

    this.log({
      agent: "Planner",
      phase: "complete",
      title: "Refine plan ready",
      detail: plan.intent,
      data: {
        intent: plan.intent,
        plan_steps: plan.plan_steps,
        notes: plan.notes ?? null,
      },
    });

    const refineTool = refineToolDefs.find((tool) => tool.name === "refine_website_copy");
    const ctx: WebsiteBuilderContext = {
      message,
      session,
      profile: sanitizeBusinessProfile(session.business_profile ?? {}),
      recommendations: session.recommendations,
      templateOptions: [],
      selectedTemplateId:
        session.selected_template_id && session.selected_template_id !== "ai_pick"
          ? session.selected_template_id
          : null,
      storefront: session.storefront_snapshot,
      assistantMessage: "",
      status: session.status,
      payload: { type: "agent_turn", plan: plan.plan_steps, tool_calls: [], tool_results: [] },
    };

    this.log({
      agent: "Executor",
      phase: "start",
      title: "Applying copy changes",
      data: { tool: "refine_website_copy", instruction: message.trim().slice(0, 280) },
    });

    let toolResult: Record<string, unknown> = { ok: false, error: "refine_tool_unavailable" };
    if (refineTool) {
      toolResult = await refineTool.handler({ instruction: message }, ctx);
      this.log({
        agent: "Executor",
        phase: toolResult.ok ? "complete" : "error",
        title: toolResult.ok ? "Copy refined" : "Refine failed",
        detail: ctx.assistantMessage || undefined,
        data: { name: "refine_website_copy", arguments: { instruction: message }, result: toolResult },
      });
    } else {
      this.log({
        agent: "Executor",
        phase: "error",
        title: "Refine tool unavailable",
      });
    }

    const toolSummary = summarizeToolResult("refine_website_copy", toolResult);

    this.log({
      agent: "Critic",
      phase: "start",
      title: "Reviewing refinement",
    });

    let criticStatus: "CONTINUE" | "DONE" | "NEED_USER" = toolResult.ok ? "DONE" : "NEED_USER";
    let criticReason = toolResult.ok
      ? "Copy refinement applied and merchant reply is ready."
      : "Refinement could not be applied automatically.";

    try {
      const critic = await runCritic({
        userText: message,
        interpretation,
        plan,
        memoryLines: [toolSummary],
        lastToolSummaries: [toolSummary],
      });
      criticStatus = critic.status;
      criticReason = critic.reason;
    } catch (error) {
      this.log({
        agent: "Critic",
        phase: "error",
        title: "Critic failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      });
    }

    this.log({
      agent: "Critic",
      phase: "complete",
      title: `Critic decision: ${criticStatus}`,
      detail: criticReason,
      data: { status: criticStatus, reason: criticReason },
    });

    this.log({
      agent: "System",
      phase: "complete",
      title: "Refine turn finished",
      detail: ctx.assistantMessage || criticReason,
    });

    if (toolResult.ok) {
      const industry = ctx.profile.industry ?? session.store?.industry ?? null;
      const colorOptions = colorPresetActions(industry, 3)
        .map((action) => (action.type === "color" ? action.color : null))
        .filter((value): value is string => typeof value === "string");
      const suggestedActions = await aiSuggestedActions({
        message,
        session: { ...session, business_profile: ctx.profile, storefront_snapshot: ctx.storefront ?? session.storefront_snapshot },
        assistantMessage: ctx.assistantMessage,
      });
      ctx.payload = {
        ...(ctx.payload ?? {}),
        suggested_actions: suggestedActions,
        color_options: colorOptions,
      };

      return {
        business_profile: ctx.profile,
        status: ctx.status,
        selected_template_id: ctx.selectedTemplateId,
        storefront: ctx.storefront ?? undefined,
        assistant_message: ctx.assistantMessage,
        assistant_payload: ctx.payload,
      };
    }

    if (criticStatus === "NEED_USER" && ctx.assistantMessage) {
      const industry = ctx.profile.industry ?? session.store?.industry ?? null;
      const colorOptions = colorPresetActions(industry, 3)
        .map((action) => (action.type === "color" ? action.color : null))
        .filter((value): value is string => typeof value === "string");
      const suggestedActions = await aiSuggestedActions({
        message,
        session: { ...session, business_profile: ctx.profile, storefront_snapshot: ctx.storefront ?? session.storefront_snapshot },
        assistantMessage: ctx.assistantMessage,
      });
      ctx.payload = {
        ...(ctx.payload ?? {}),
        suggested_actions: suggestedActions,
        color_options: colorOptions,
      };

      return {
        business_profile: ctx.profile,
        status: ctx.status,
        selected_template_id: ctx.selectedTemplateId,
        storefront: ctx.storefront ?? undefined,
        assistant_message: ctx.assistantMessage,
        assistant_payload: ctx.payload,
      };
    }

    return {
      business_profile: ctx.profile,
      status: "review_ready",
      selected_template_id: ctx.selectedTemplateId,
      assistant_message:
        ctx.assistantMessage ||
        "Tell me what you'd like to change — for example \"Change the button to Shop Gifts\" or \"Make the homepage more premium\".",
      assistant_payload: { type: "conversation" },
    };
  }
}
