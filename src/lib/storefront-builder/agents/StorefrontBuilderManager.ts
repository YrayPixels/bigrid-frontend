import type {
  BuilderSession,
  StorefrontTemplateId,
  StorefrontTemplateOption,
  StorefrontTemplateRecommendation,
} from "@/lib/api/types";
import type { BuilderAiTurn } from "@/lib/storefront-builder/local-ai";
import { fallbackBuilderTurn, sanitizeBusinessProfile } from "@/lib/storefront-builder/local-ai";
import {
  appendMemory,
  INFORMATIONAL_TOOL_NAMES,
  summarizeToolResult,
} from "./agentThinking";
import { websiteBuilderToolsForSession } from "./tools";
import type {
  AgentActivityPayload,
  AgentThinkingLogEntry,
  WebsiteBuilderContext,
  WebsiteBuilderToolDef,
} from "./types";
import { createThinkingLogEntry } from "./thinking-log";
import { aiSuggestedActions, colorPresetActions } from "@/lib/storefront-builder/suggested-actions";
import { formatBuilderHistorySnippet } from "@/lib/storefront-builder/chat-history";
import {
  createBuilderAgentRegistry,
  type BuilderAgentRegistry,
  type ExecutorChatMessage,
  type OpenAiToolSchema,
} from "./roles";

function toOpenAiTools(defs: WebsiteBuilderToolDef[]): OpenAiToolSchema[] {
  return defs.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/** Tools that can run from session/message context without model-chosen arguments. */
const DIRECT_EXEC_SAFE_TOOLS = new Set([
  "list_products",
  "get_store_metrics",
  "list_orders",
  "suggest_site_improvements",
  "get_storefront_readiness",
  "apply_stock_images",
  "generate_website",
  "design_website",
  "capture_business_details",
  "refine_website_copy",
  "apply_brand_color",
  "switch_design",
  "change_font",
  "source_website_images",
  "generate_product_descriptions",
  "generate_custom_site",
  "update_store_profile",
  "add_page_block",
]);

function canRunToolsDirectly(toolNames: string[]): boolean {
  return toolNames.length > 0 && toolNames.every((name) => DIRECT_EXEC_SAFE_TOOLS.has(name));
}

function defaultArgsForDirectTool(
  name: string,
  stepDescription: string,
  merchantMessage: string,
): Record<string, unknown> {
  if (name === "add_page_block") {
    if (/product grid|products? section/i.test(stepDescription)) return { type: "product_grid" };
    return { type: "rich_text" };
  }
  if (name === "refine_website_copy") {
    return { instruction: merchantMessage.trim() || stepDescription };
  }
  if (name === "apply_brand_color" || name === "switch_design" || name === "source_website_images") {
    return { instruction: merchantMessage.trim() || stepDescription, direction: merchantMessage.trim() };
  }
  return {};
}

/**
 * Waterfall orchestrator: creates role agents (with prompts ready), then feeds them
 * Interpreter → Planner → Executor(step) → Critic. Agents do not talk to each other.
 */
export class StorefrontBuilderManager {
  private readonly agents: BuilderAgentRegistry;

  constructor(
    private onActivity?: (payload: AgentActivityPayload) => void,
    private onLog?: (entry: AgentThinkingLogEntry) => void,
    agents?: BuilderAgentRegistry,
  ) {
    this.agents = agents ?? createBuilderAgentRegistry();
  }

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

    const { interpreter, planner, executor, critic } = this.agents;
    const toolDefs = websiteBuilderToolsForSession(session);
    const historySnippet = formatBuilderHistorySnippet(history ?? []);

    // ── Interpreter ──────────────────────────────────────────────
    this.log({
      agent: "Interpreter",
      phase: "start",
      title: "Understanding your request",
      detail: message.trim().slice(0, 280),
    });
    const interpretation = await interpreter
      .run({ userText: message, historySnippet })
      .catch((error) => {
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

    // ── Planner ──────────────────────────────────────────────────
    this.log({
      agent: "Planner",
      phase: "start",
      title: "Planning your website",
    });
    const plan = await planner
      .configure(toolDefs)
      .run({ userText: message, interpretation, historySnippet })
      .catch((error) => {
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
      planIntent: plan.intent,
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

    let memory: string[] = [];
    const toolCallsLog: Array<{ name: string; arguments: Record<string, unknown> }> = [];
    const toolResultsLog: Array<Record<string, unknown>> = [];
    const informationalReplies: string[] = [];

    // Feed Executor its briefing, then build the shared chat transcript.
    executor.receiveBriefing({
      interpretation,
      plan,
      session,
      toolDefs,
    });
    const messages: ExecutorChatMessage[] = executor.buildInitialMessages(history, message);
    const openAiTools = toOpenAiTools(toolDefs);
    const completedStepIndices = new Set<number>();
    let criticStatus: "CONTINUE" | "DONE" | "NEED_USER" = "CONTINUE";
    const toolSteps = plan.plan_steps.filter((s) => s.tools.length > 0);

    // Bolt-style fast path: custom site with no planner tool steps.
    const wantsCustomSite =
      plan.intent.toLowerCase().includes("custom") ||
      interpretation.task_summary.toLowerCase().includes("custom") ||
      /\bcustom\b|\bfrom scratch\b|\bbuild a custom site\b/i.test(message);
    const customTool = toolDefs.find((tool) => tool.name === "generate_custom_site");
    if (toolSteps.length === 0 && wantsCustomSite && customTool) {
      this.log({
        agent: "Executor",
        phase: "start",
        title: "Generating custom site",
        detail: "Running bolt-style generator (no planner steps returned).",
        data: { tool: "generate_custom_site" },
      });

      const result = await customTool.handler({ style_note: "" }, ctx);
      toolCallsLog.push({ name: "generate_custom_site", arguments: { style_note: "" } });
      toolResultsLog.push({ name: "generate_custom_site", ...result });

      this.log({
        agent: "Executor",
        phase: result.ok === false ? "error" : "complete",
        title: "Custom site generation finished",
        detail: summarizeToolResult("generate_custom_site", result),
        data: { result },
      });

      ctx.payload = {
        type: "agent_turn",
        plan: plan.plan_steps,
        tool_calls: toolCallsLog,
        tool_results: toolResultsLog,
        profile: ctx.profile,
      };

      return {
        business_profile: ctx.profile,
        status: ctx.status,
        selected_template_id: ctx.selectedTemplateId,
        storefront: ctx.storefront ?? undefined,
        assistant_message: ctx.assistantMessage || fallback.assistant_message,
        assistant_payload: ctx.payload,
      };
    }

    const runToolsDirectly = async (stepToolNames: string[], stepDescription: string) => {
      const lastToolSummaries: string[] = [];
      for (const name of stepToolNames) {
        const def = toolDefs.find((tool) => tool.name === name);
        if (!def) continue;
        const toolArgs = defaultArgsForDirectTool(name, stepDescription, message);
        toolCallsLog.push({ name, arguments: toolArgs });
        const result = await def.handler(toolArgs, ctx);
        toolResultsLog.push({ name, ...result });
        const summary = summarizeToolResult(name, result);
        lastToolSummaries.push(summary);
        memory = appendMemory(memory, summary);
        if (INFORMATIONAL_TOOL_NAMES.has(name) && ctx.assistantMessage.trim()) {
          informationalReplies.push(ctx.assistantMessage.trim());
        }
        this.log({
          agent: "Executor",
          phase: "complete",
          title: `Tool finished: ${name}`,
          detail: summary,
          data: { name, arguments: toolArgs, result },
        });
      }
      return lastToolSummaries;
    };

    const askCritic = async (lastToolSummaries: string[], remainingCount: number) => {
      this.log({
        agent: "Critic",
        phase: "start",
        title: "Reviewing progress",
      });
      const decision = await critic
        .run({
          userText: message,
          interpretation,
          plan,
          memoryLines: memory,
          lastToolSummaries,
          completedToolNames: toolCallsLog.map((call) => call.name),
        })
        .catch(() => ({ status: "CONTINUE" as const, reason: "Proceeding to next step." }));

      let status = decision.status;
      if (status === "DONE" && remainingCount > 0) status = "CONTINUE";
      memory = appendMemory(memory, `[critic] ${status}: ${decision.reason}`);
      this.log({
        agent: "Critic",
        phase: "complete",
        title: `Critic decision: ${status}`,
        detail: decision.reason,
        data: { status, reason: decision.reason, completed_steps: [...completedStepIndices] },
      });
      return { status, reason: decision.reason };
    };

    // ── Executor loop (fed one plan step at a time) ──────────────
    for (let iteration = 0; iteration < 8 && criticStatus === "CONTINUE"; iteration++) {
      const nextStep = toolSteps.find((s) => !completedStepIndices.has(s.step));
      if (!nextStep) {
        criticStatus = "DONE";
        break;
      }

      const stepToolNames = nextStep.tools.filter((name) =>
        toolDefs.some((tool) => tool.name === name),
      );
      const stepOpenAiTools =
        stepToolNames.length > 0
          ? openAiTools.filter((tool) => stepToolNames.includes(tool.function.name))
          : openAiTools;

      this.log({
        agent: "Executor",
        phase: "start",
        title: iteration === 0 ? "Running executor" : `Executor iteration ${iteration + 1}`,
        detail: `Step ${nextStep.step}: ${nextStep.description}`,
        data: { iteration: iteration + 1, step: nextStep.step, tools: stepToolNames },
      });

      // When the planner already named safe tools, run them directly.
      // DeepSeek often returns finish_reason "stop" with prose instead of tool_calls.
      if (canRunToolsDirectly(stepToolNames)) {
        this.log({
          agent: "Executor",
          phase: "info",
          title: "Running planned tools directly",
          detail: stepToolNames.join(", "),
        });

        const lastToolSummaries = await runToolsDirectly(stepToolNames, nextStep.description);

        const directFailed = toolResultsLog.slice(-stepToolNames.length).some((r) => r.ok === false);
        if (directFailed && ctx.assistantMessage) {
          criticStatus = "DONE";
          break;
        }

        completedStepIndices.add(nextStep.step);
        const remainingAfterDirect = toolSteps.filter((s) => !completedStepIndices.has(s.step));
        if (remainingAfterDirect.length === 0) {
          criticStatus = "DONE";
          this.log({
            agent: "Critic",
            phase: "complete",
            title: "All plan steps complete",
            detail: `${completedStepIndices.size} step(s) executed.`,
          });
          break;
        }

        const criticDecision = await askCritic(lastToolSummaries, remainingAfterDirect.length);
        criticStatus = criticDecision.status;
        if (criticStatus === "NEED_USER" && !ctx.assistantMessage) {
          ctx.assistantMessage = criticDecision.reason;
          ctx.payload = { type: "requirements_request", profile: ctx.profile };
          break;
        }
        continue;
      }

      const decision = await executor
        .runStep({
          messages,
          step: nextStep,
          stepToolNames,
          stepTools: stepOpenAiTools,
          allTools: openAiTools,
        })
        .catch((error) => {
          this.log({
            agent: "Executor",
            phase: "error",
            title: "Executor model call failed",
            detail: error instanceof Error ? error.message : "Unknown error",
          });
          return null;
        });

      if (!decision) break;

      let lastToolSummaries: string[] = [];

      if (!decision.toolCalls.length) {
        // Model returned prose (finish_reason stop) — still honor planned tools if any.
        if (stepToolNames.length > 0) {
          this.log({
            agent: "Executor",
            phase: "info",
            title: "Executor skipped tools — running planned tools directly",
            detail: stepToolNames.join(", "),
          });
          lastToolSummaries = await runToolsDirectly(stepToolNames, nextStep.description);
          const directFailed = toolResultsLog.slice(-stepToolNames.length).some((r) => r.ok === false);
          if (directFailed && ctx.assistantMessage) {
            criticStatus = "DONE";
            break;
          }
          completedStepIndices.add(nextStep.step);
          const remainingAfterDirect = toolSteps.filter((s) => !completedStepIndices.has(s.step));
          if (remainingAfterDirect.length === 0) {
            criticStatus = "DONE";
            break;
          }
          const criticDecision = await askCritic(lastToolSummaries, remainingAfterDirect.length);
          criticStatus = criticDecision.status;
          continue;
        }

        if (decision.prose) ctx.assistantMessage = decision.prose;
        this.log({
          agent: "Executor",
          phase: "complete",
          title: "Executor replied without tools",
          detail: decision.prose.slice(0, 280) || undefined,
        });
        criticStatus = "NEED_USER";
        break;
      }

      this.log({
        agent: "Executor",
        phase: "info",
        title: `Calling ${decision.toolCalls.length} tool(s)`,
        data: {
          tool_calls: decision.toolCalls.map((call) => ({
            name: call.function?.name,
            arguments: call.function?.arguments,
          })),
        },
      });

      for (const toolCall of decision.toolCalls) {
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
          messages.push({
            role: "tool",
            tool_call_id: callId,
            content: JSON.stringify({ error: `Unknown tool: ${name}` }),
          });
          continue;
        }

        const result = await def.handler(parsed, ctx);
        toolResultsLog.push({ name, ...result });
        messages.push({ role: "tool", tool_call_id: callId, content: JSON.stringify(result) });
        const summary = summarizeToolResult(name, result);
        lastToolSummaries.push(summary);
        memory = appendMemory(memory, summary);
        if (INFORMATIONAL_TOOL_NAMES.has(name) && ctx.assistantMessage.trim()) {
          informationalReplies.push(ctx.assistantMessage.trim());
        }

        this.log({
          agent: "Executor",
          phase: "complete",
          title: `Tool finished: ${name}`,
          detail: summary,
          data: { name, arguments: parsed, result },
        });
      }

      const stepResults = toolResultsLog.slice(-decision.toolCalls.length);
      if (stepResults.some((r) => r.ok === false) && ctx.assistantMessage) {
        criticStatus = "DONE";
        this.log({
          agent: "Executor",
          phase: "error",
          title: "Step failed — stopping",
          detail: ctx.assistantMessage.slice(0, 280),
        });
        break;
      }

      completedStepIndices.add(nextStep.step);
      const remaining = toolSteps.filter((s) => !completedStepIndices.has(s.step));
      if (remaining.length === 0) {
        criticStatus = "DONE";
        this.log({
          agent: "Critic",
          phase: "complete",
          title: "All plan steps complete",
          detail: `${completedStepIndices.size} step(s) executed.`,
        });
        break;
      }

      const criticDecision = await askCritic(lastToolSummaries, remaining.length);
      criticStatus = criticDecision.status;

      if (criticStatus === "NEED_USER" && !ctx.assistantMessage) {
        ctx.assistantMessage = criticDecision.reason;
        ctx.payload = { type: "requirements_request", profile: ctx.profile };
        break;
      }
    }

    if (informationalReplies.length > 0) {
      const unique = [...new Set(informationalReplies)];
      const mutateReply =
        ctx.assistantMessage &&
        !unique.includes(ctx.assistantMessage.trim()) &&
        toolCallsLog.some((call) => !INFORMATIONAL_TOOL_NAMES.has(call.name))
          ? ctx.assistantMessage.trim()
          : "";
      ctx.assistantMessage = [...unique, mutateReply].filter(Boolean).join("\n\n");
    }

    if (!ctx.assistantMessage) {
      this.log({
        agent: "System",
        phase: "start",
        title: "Composing merchant reply",
      });
      const composed = await executor.composeMerchantReply(messages).catch(() => "");
      ctx.assistantMessage = composed || fallback.assistant_message;

      const isFallbackReply = !ctx.assistantMessage || ctx.assistantMessage === fallback.assistant_message;
      if (toolCallsLog.length > 0 && isFallbackReply) {
        const lastTool = toolCallsLog[toolCallsLog.length - 1];
        const toolMessages: Record<string, string> = {
          refine_website_copy: "Done — I've updated the copy. Check the preview on the right!",
          capture_business_details:
            "Got it! I've saved your business details. Ready to build your website — just say 'build my website' when you're ready.",
          design_website:
            "I've picked the best design for your brand. Ready to build — just say 'build my website'!",
          apply_brand_color: "Done — colors updated. Check the preview!",
          change_font: "Done — font updated. Check the preview!",
          add_products: "Products added! Check your Products page.",
          list_products: "I've pulled your product catalog — see the list above.",
          generate_product_descriptions: "Product descriptions updated! Check your Products page.",
          add_page_block: "Done — I added that section. Check the preview!",
          get_store_metrics: "Here's your store performance snapshot.",
          list_orders: "Here are your recent orders.",
        };
        ctx.assistantMessage = lastTool
          ? (toolMessages[lastTool.name] ?? "Done — I finished that request.")
          : "Done — I finished that request.";
      }
      this.log({
        agent: "System",
        phase: "complete",
        title: "Merchant reply composed",
        detail: ctx.assistantMessage.slice(0, 280),
      });
    }

    const toolMetadata = {
      plan: plan.plan_steps,
      tool_calls: toolCallsLog,
      tool_results: toolResultsLog,
      profile: ctx.profile,
    };

    if (ctx.payload.type && ctx.payload.type !== "agent_turn") {
      ctx.payload = { ...ctx.payload, ...toolMetadata };
    } else {
      ctx.payload = { type: "agent_turn", ...toolMetadata };
    }

    if (
      ctx.storefront &&
      ctx.payload.type === "agent_turn" &&
      toolCallsLog.some((call) => call.name === "generate_website")
    ) {
      ctx.payload = { ...ctx.payload, type: "website_generated" };
      if (!ctx.assistantMessage || ctx.assistantMessage === fallback.assistant_message) {
        ctx.assistantMessage =
          "Your website is ready. Preview it on the right, then tell me what to refine — headline, about section, CTA, or SEO.";
      }
    }

    const payloadColorOptions = Array.isArray(ctx.payload.color_options)
      ? ctx.payload.color_options.filter((value): value is string => typeof value === "string")
      : [];
    const industry = ctx.profile.industry ?? session.store?.industry ?? null;
    const colorOptions = [
      ...payloadColorOptions,
      ...colorPresetActions(industry, 3)
        .map((action) => (action.type === "color" ? action.color : null))
        .filter((value): value is string => typeof value === "string"),
    ];
    const suggestedActions = await aiSuggestedActions({
      message,
      session: {
        ...session,
        business_profile: ctx.profile,
        storefront_snapshot: ctx.storefront ?? session.storefront_snapshot,
      },
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
}
