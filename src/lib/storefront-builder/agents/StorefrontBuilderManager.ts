import { isBuilderToolAgentEnabled } from "@/lib/features";
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
  builderCapabilitiesReply,
  INFORMATIONAL_TOOL_NAMES,
  isCapabilityOrMetaQuestion,
  isGreetingOrSmallTalk,
  summarizeToolResult,
  type CriticStatus,
} from "./agentThinking";
import { websiteBuilderToolsForSession } from "./tools";
import type {
  AgentActivityPayload,
  AgentThinkingLogEntry,
  WebsiteBuilderContext,
  WebsiteBuilderToolDef,
} from "./types";
import { createThinkingLogEntry } from "./thinking-log";
import { BuilderSessionManager } from "./BuilderSessionManager";
import { fallbackSuggestedActions, colorPresetActions } from "@/lib/storefront-builder/suggested-actions";
import { formatBuilderHistorySnippet } from "@/lib/storefront-builder/chat-history";
import {
  applyPriceToPendingProducts,
  buildResumedToolArguments,
  canDeterministicallyResume,
  formatPendingActionHint,
  getPendingAction,
  isCancelPendingAction,
  looksLikeNewRequest,
  parseMerchantPrice,
  pendingActionSummary,
  sanitizePendingAction,
  withPendingAction,
} from "@/lib/storefront-builder/pending-action";
import {
  formatProductFocusHint,
  getProductFocus,
} from "@/lib/storefront-builder/product-focus";
import {
  createBuilderAgentRegistry,
  type BuilderAgentRegistry,
  type ExecutorChatMessage,
  type OpenAiToolSchema,
} from "./roles";
import { missedActableRequestRetryHint } from "./roles/CriticAgent";

const STATIC_TOOL_REPLY_MESSAGES: Record<string, string> = {
  refine_website_copy: "Done — I've updated the copy. Check the preview on the right!",
  capture_business_details:
    "Got it! I've saved your business details. Ready to build your website — just say 'build my website' when you're ready.",
  design_website:
    "I've picked the best design for your brand. Ready to build — just say 'build my website'!",
  apply_brand_color: "Done — colors updated. Check the preview!",
  change_font: "Done — font updated. Check the preview!",
  update_theme_style: "Done — style updated. Check the preview!",
  add_products: "Products added! Check your Products page.",
  list_products: "I've pulled your product catalog — see the list above.",
  generate_product_descriptions: "Product descriptions updated! Check your Products page.",
  add_page_block: "Done — I added that section. Check the preview!",
  get_store_metrics: "Here's your store performance snapshot.",
  get_top_selling_products: "Here are your top selling products.",
  get_traffic_sources: "Here's where your traffic is coming from.",
  list_orders: "Here are your recent orders.",
  get_order: "Here's the order detail.",
  update_order_status: "Order status updated.",
  list_customers: "Here's your customer list.",
  get_customer: "Here's that customer's details.",
  list_discounts: "Here are your discounts and promos.",
  create_discount: "Discount created.",
  update_discount: "Discount updated.",
  get_payment_settings: "Here's your payment setup.",
  update_payment_settings: "Payment settings updated.",
  list_domains: "Here are your domains.",
  add_domain: "Domain added — follow the DNS steps to verify.",
  verify_domain: "Checked domain verification status.",
  list_abandoned_carts: "Here are abandoned carts.",
  draft_abandoned_recovery: "Here's a recovery message draft.",
  send_abandoned_recovery: "Recovery message sent.",
  suggest_site_improvements: "Here are suggested next steps for your store.",
};
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
  "get_top_selling_products",
  "get_traffic_sources",
  "list_orders",
  "list_customers",
  "list_discounts",
  "get_payment_settings",
  "list_domains",
  "list_abandoned_carts",
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
  "update_theme_style",
  "source_website_images",
  // generate_product_descriptions needs model-chosen product_name for single-product asks
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
  if (name === "update_theme_style") {
    const text = `${merchantMessage} ${stepDescription}`.toLowerCase();
    const args: Record<string, unknown> = {};
    if (/\bpill\b/.test(text)) args.button_style = "pill";
    else if (/\bsquare|sharp(er)?\b/.test(text)) args.button_style = "square";
    else if (/\brounded\b/.test(text)) args.button_style = "rounded";
    if (/\b(airy|more space|breathing room|looser)\b/.test(text)) args.density = "airy";
    else if (/\b(compact|tighter|denser)\b/.test(text)) args.density = "compact";
    if (/\breset\b/.test(text)) args.reset = true;
    return args;
  }
  return {};
}

/** Temporary: skip Critic LLM calls so Executor/Session run unreviewed. Flip back to true when done checking. */
const CRITIC_ENABLED = false;

/**
 * Waterfall orchestrator (default): InterpretPlanner → Executor → Critic.
 * Feature-flagged path: SessionAgent (tools) → outcome Critic (max 1 retry).
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

  private finalizeAssistantTurn(args: {
    ctx: WebsiteBuilderContext;
    session: BuilderSession;
    message: string;
    fallback: BuilderAiTurn;
    toolCallsLog: Array<{ name: string; arguments: Record<string, unknown> }>;
    toolResultsLog: Array<Record<string, unknown>>;
    informationalReplies: string[];
    planSteps?: Array<{ step: number; description: string; tools: string[] }>;
    messages?: ExecutorChatMessage[];
    composeWith?: { composeMerchantReply: (messages: ExecutorChatMessage[]) => Promise<string> };
  }): Promise<BuilderAiTurn> {
    const {
      ctx,
      session,
      message,
      fallback,
      toolCallsLog,
      toolResultsLog,
      informationalReplies,
      planSteps = [],
      messages = [],
      composeWith,
    } = args;

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

    const ensureReply = async () => {
      if (ctx.assistantMessage) return;

      const lastTool = toolCallsLog[toolCallsLog.length - 1];
      const staticReply =
        toolCallsLog.length > 0
          ? lastTool
            ? (STATIC_TOOL_REPLY_MESSAGES[lastTool.name] ?? "Done — I finished that request.")
            : "Done — I finished that request."
          : "";

      if (staticReply) {
        ctx.assistantMessage = staticReply;
        this.log({
          agent: "System",
          phase: "complete",
          title: "Merchant reply composed",
          detail: ctx.assistantMessage.slice(0, 280),
        });
        return;
      }

      this.log({
        agent: "System",
        phase: "start",
        title: "Composing merchant reply",
      });
      const composed =
        composeWith && messages.length
          ? await composeWith.composeMerchantReply(messages).catch(() => "")
          : "";
      ctx.assistantMessage = composed || fallback.assistant_message;
      this.log({
        agent: "System",
        phase: "complete",
        title: "Merchant reply composed",
        detail: ctx.assistantMessage.slice(0, 280),
      });
    };

    return ensureReply().then(() => {
      const toolMetadata = {
        plan: planSteps,
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
      const suggestedActions = fallbackSuggestedActions({
        ...session,
        business_profile: ctx.profile,
        storefront_snapshot: ctx.storefront ?? session.storefront_snapshot,
      });
      ctx.payload = {
        ...ctx.payload,
        suggested_actions: suggestedActions,
        color_options: colorOptions,
      };

      if (ctx.status === "collecting_requirements") {
        if (!ctx.profile.pending_action && ctx.assistantMessage.trim()) {
          ctx.profile = withPendingAction(ctx.profile, {
            type: "clarification",
            question: ctx.assistantMessage.trim(),
            original_message: message,
          });
        }
        ctx.payload = {
          ...ctx.payload,
          pending_action: ctx.profile.pending_action ?? null,
        };
      } else if (ctx.profile.pending_action) {
        ctx.profile = withPendingAction(ctx.profile, null);
      }

      return {
        business_profile: ctx.profile,
        status: ctx.status,
        selected_template_id: ctx.selectedTemplateId,
        storefront: ctx.storefront ?? undefined,
        assistant_message: ctx.assistantMessage,
        assistant_payload: ctx.payload,
      };
    });
  }
  async runTurn(args: {
    message: string;
    session: BuilderSession;
    recommendations: StorefrontTemplateRecommendation[];
    templateOptions: StorefrontTemplateOption[];
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    onAssistantDelta?: (text: string) => void;
  }): Promise<BuilderAiTurn> {
    const { message, session, recommendations, templateOptions, history, onAssistantDelta } = args;
    const availableTemplateIds = templateOptions
      .filter((option) => option.value !== "ai_pick")
      .map((option) => option.value as StorefrontTemplateId);
    const fallback = fallbackBuilderTurn({
      message,
      session,
      recommendations,
      availableTemplateIds,
    });

    // Capability / meta questions must never invent a business brief from store profile.
    if (isCapabilityOrMetaQuestion(message) || isGreetingOrSmallTalk(message)) {
      const hasDraft = Boolean(session.storefront_snapshot);
      const assistantMessage = isCapabilityOrMetaQuestion(message)
        ? builderCapabilitiesReply(hasDraft)
        : hasDraft
          ? "Hi! Tell me what you'd like to change on your website — copy, colors, products, photos, or layout."
          : "Hi! Tell me about your business — what you sell, who it's for, and the vibe you want. I'll design and build your website.";
      this.log({
        agent: "System",
        phase: "complete",
        title: isCapabilityOrMetaQuestion(message) ? "Answered capabilities question" : "Greeting reply",
        detail: assistantMessage.slice(0, 280),
      });
      return {
        business_profile: sanitizeBusinessProfile(session.business_profile ?? {}),
        status: session.status,
        selected_template_id:
          session.selected_template_id && session.selected_template_id !== "ai_pick"
            ? session.selected_template_id
            : null,
        storefront: session.storefront_snapshot ?? undefined,
        assistant_message: assistantMessage,
        assistant_payload: {
          type: "agent_turn",
          plan: [],
          tool_calls: [],
          tool_results: [],
        },
      };
    }

    const toolDefs = websiteBuilderToolsForSession(session);

    // Resume pending clarifications (price, which product, etc.) instead of reinterpreting the reply.
    let pendingAction = getPendingAction(session);
    if (pendingAction) {
      if (isCancelPendingAction(message)) {
        this.log({
          agent: "System",
          phase: "complete",
          title: "Cancelled pending clarification",
          detail: pendingActionSummary(pendingAction),
        });
        return {
          business_profile: withPendingAction(
            sanitizeBusinessProfile(session.business_profile ?? {}),
            null,
          ),
          status: session.status,
          selected_template_id:
            session.selected_template_id && session.selected_template_id !== "ai_pick"
              ? session.selected_template_id
              : null,
          storefront: session.storefront_snapshot ?? undefined,
          assistant_message: "Okay — cancelled. Tell me what you'd like to do next.",
          assistant_payload: {
            type: "agent_turn",
            plan: [],
            tool_calls: [],
            tool_results: [],
          },
        };
      }

      if (canDeterministicallyResume(pendingAction, message)) {
        const baseProfile = withPendingAction(
          sanitizeBusinessProfile(session.business_profile ?? {}),
          null,
        );
        const selectedTemplateId =
          session.selected_template_id && session.selected_template_id !== "ai_pick"
            ? session.selected_template_id
            : null;

        if (pendingAction.type === "add_products") {
          const price = parseMerchantPrice(message);
          const addTool = toolDefs.find((tool) => tool.name === "add_products");
          if (price && addTool) {
            this.log({
              agent: "System",
              phase: "start",
              title: "Resuming product add with price",
              detail: `${pendingAction.products.map((product) => product.name).join(", ")} @ ${price}`,
            });

            const ctx: WebsiteBuilderContext = {
              message,
              planIntent: "Resume adding product with price",
              session,
              profile: baseProfile,
              recommendations,
              templateOptions,
              selectedTemplateId,
              storefront: session.storefront_snapshot,
              assistantMessage: "",
              status: session.status,
              payload: { type: "agent_turn", plan: [], tool_calls: [], tool_results: [] },
            };

            const products = applyPriceToPendingProducts(pendingAction, price);
            const toolArgs = {
              products,
              find_images: pendingAction.find_images !== false,
            };
            const result = await addTool.handler(toolArgs, ctx);

            this.log({
              agent: "Executor",
              phase: result.ok === false ? "error" : "complete",
              title: "Tool finished: add_products",
              detail: summarizeToolResult("add_products", result),
              data: { name: "add_products", arguments: toolArgs, result },
            });

            return {
              business_profile: ctx.profile,
              status: ctx.status,
              selected_template_id: ctx.selectedTemplateId,
              storefront: ctx.storefront ?? undefined,
              assistant_message:
                ctx.assistantMessage ||
                (result.ok === false
                  ? "I still need a bit more detail to add that product."
                  : "Done — product added."),
              assistant_payload: {
                ...(ctx.payload ?? {}),
                tool_calls: [{ name: "add_products", arguments: toolArgs }],
                tool_results: [{ name: "add_products", ...result }],
              },
            };
          }
        }

        if (pendingAction.type === "resume_tool") {
          const resumePending = pendingAction;
          const resumeToolName = resumePending.tool;
          const resumeTool = toolDefs.find((tool) => tool.name === resumeToolName);
          const toolArgs = buildResumedToolArguments(resumePending, message);
          if (resumeTool && toolArgs) {
            this.log({
              agent: "System",
              phase: "start",
              title: "Resuming pending tool after clarification",
              detail: pendingActionSummary(resumePending),
            });

            const ctx: WebsiteBuilderContext = {
              message,
              planIntent: `Resume ${resumeToolName} after clarification`,
              session,
              profile: baseProfile,
              recommendations,
              templateOptions,
              selectedTemplateId,
              storefront: session.storefront_snapshot,
              assistantMessage: "",
              status: session.status,
              payload: { type: "agent_turn", plan: [], tool_calls: [], tool_results: [] },
            };

            const result = await resumeTool.handler(toolArgs, ctx);

            this.log({
              agent: "Executor",
              phase: result.ok === false ? "error" : "complete",
              title: `Tool finished: ${resumeToolName}`,
              detail: summarizeToolResult(resumeToolName, result),
              data: { name: resumeToolName, arguments: toolArgs, result },
            });

            // Keep pending if the resumed tool asked another clarifying question.
            const stillPending = sanitizePendingAction(ctx.profile.pending_action);

            return {
              business_profile: stillPending
                ? withPendingAction(ctx.profile, stillPending)
                : withPendingAction(ctx.profile, null),
              status: ctx.status,
              selected_template_id: ctx.selectedTemplateId,
              storefront: ctx.storefront ?? undefined,
              assistant_message:
                ctx.assistantMessage ||
                (result.ok === false
                  ? "I still need a bit more detail to finish that."
                  : "Done — I finished that request."),
              assistant_payload: {
                ...(ctx.payload ?? {}),
                tool_calls: [{ name: resumeToolName, arguments: toolArgs }],
                tool_results: [{ name: resumeToolName, ...result }],
              },
            };
          }
        }
      }

      if (looksLikeNewRequest(message)) {
        // User moved on — drop the pending clarification and continue normally.
        session.business_profile = withPendingAction(
          sanitizeBusinessProfile(session.business_profile ?? {}),
          null,
        );
        pendingAction = null;
      }
    }

    if (isBuilderToolAgentEnabled()) {
      return this.runToolAgentTurn({
        message,
        session,
        recommendations,
        templateOptions,
        history,
        toolDefs,
        pendingAction,
        fallback,
        onAssistantDelta,
      });
    }

    const { interpretPlanner, executor, critic } = this.agents;
    const historySnippet = [
      formatBuilderHistorySnippet(history ?? []),
      pendingAction ? formatPendingActionHint(pendingAction) : "",
      formatProductFocusHint(getProductFocus(session.business_profile)),
    ]
      .filter(Boolean)
      .join("\n\n");

    // ── Interpret + Plan (single thinking-model call) ─────────────
    this.log({
      agent: "InterpretPlanner",
      phase: "start",
      title: "Understanding and planning",
      detail: message.trim().slice(0, 280),
    });
    const interpreted = await interpretPlanner
      .configure(toolDefs)
      .run({ userText: message, historySnippet })
      .catch((error) => {
        this.log({
          agent: "InterpretPlanner",
          phase: "error",
          title: "Interpret+Plan failed",
          detail: error instanceof Error ? error.message : "Unknown error",
        });
        return null;
      });
    if (!interpreted) return fallback;

    const { interpretation, plan } = interpreted;

    this.log({
      agent: "InterpretPlanner",
      phase: "complete",
      title: "Plan ready",
      detail: plan.intent || interpretation.task_summary,
      data: {
        task_summary: interpretation.task_summary,
        steps: interpretation.steps,
        constraints: interpretation.constraints ?? [],
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
      scopeHint: [
        pendingAction ? formatPendingActionHint(pendingAction) : "",
        formatProductFocusHint(getProductFocus(session.business_profile)),
      ]
        .filter(Boolean)
        .join("\n\n") || undefined,
    });
    const messages: ExecutorChatMessage[] = executor.buildInitialMessages(history, message);
    const openAiTools = toOpenAiTools(toolDefs);
    const completedStepIndices = new Set<number>();
    let criticStatus: CriticStatus = "CONTINUE";
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
      if (!CRITIC_ENABLED) {
        const status = remainingCount > 0 ? ("CONTINUE" as const) : ("DONE" as const);
        this.log({
          agent: "Critic",
          phase: "complete",
          title: `Critic skipped: ${status}`,
          detail: "CRITIC_ENABLED=false",
        });
        return { status, reason: "Critic disabled." };
      }

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
      // Waterfall does not use RETRY — treat as continue to next plan step.
      if (status === "RETRY") status = "CONTINUE";
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
        if (decision.prose && !ctx.profile.pending_action) {
          ctx.profile = withPendingAction(ctx.profile, {
            type: "clarification",
            question: decision.prose,
            original_message: message,
          });
          ctx.payload = {
            type: "requirements_request",
            profile: ctx.profile,
            pending_action: ctx.profile.pending_action,
          };
        }
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
      if (criticStatus === "NEED_USER" && !ctx.profile.pending_action) {
        ctx.profile = withPendingAction(ctx.profile, {
          type: "clarification",
          question: ctx.assistantMessage || criticDecision.reason,
          original_message: message,
        });
        ctx.payload = {
          ...(ctx.payload ?? {}),
          type: "requirements_request",
          profile: ctx.profile,
          pending_action: ctx.profile.pending_action,
        };
        break;
      }
    }

    return this.finalizeAssistantTurn({
      ctx,
      session,
      message,
      fallback,
      toolCallsLog,
      toolResultsLog,
      informationalReplies,
      planSteps: plan.plan_steps,
      messages,
      composeWith: executor,
    });
  }

  /**
   * Open the muted Realtime session (mint token + WebRTC) without sending a merchant message.
   * Subsequent runTurn calls reuse this connection.
   */
  async startRealtimeSession(args: {
    session: BuilderSession;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    toolDefs: WebsiteBuilderToolDef[];
  }): Promise<void> {
    const { session, history = [], toolDefs } = args;
    const { sessionAgent } = this.agents;
    const pendingAction = getPendingAction(session);
    const contextHint = [
      pendingAction ? formatPendingActionHint(pendingAction) : "",
      formatProductFocusHint(getProductFocus(session.business_profile)),
      formatBuilderHistorySnippet(history),
    ]
      .filter(Boolean)
      .join("\n\n");

    sessionAgent.configure({ session, toolDefs, contextHint });
    const openAiTools = toOpenAiTools(toolDefs);
    const messages: ExecutorChatMessage[] = [
      { role: "system", content: sessionAgent.systemPrompt },
      ...history.map((entry) => ({
        role: entry.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: entry.content,
      })),
    ];

    const streamingSession = BuilderSessionManager.ensureShared({
      builderSessionId: session.id,
      sessionAgent,
      toolDefs,
      openAiTools,
      onLog: (entry) => this.log(entry),
    });

    await streamingSession.start({ messages, foldTrailingUser: false });
  }

  /**
   * Feature-flagged path: SessionAgent (all tools) → outcome Critic (max 1 RETRY).
   */
  private async runToolAgentTurn(args: {
    message: string;
    session: BuilderSession;
    recommendations: StorefrontTemplateRecommendation[];
    templateOptions: StorefrontTemplateOption[];
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    toolDefs: WebsiteBuilderToolDef[];
    pendingAction: ReturnType<typeof getPendingAction>;
    fallback: BuilderAiTurn;
    onAssistantDelta?: (text: string) => void;
  }): Promise<BuilderAiTurn> {
    const {
      message,
      session,
      recommendations,
      templateOptions,
      history,
      toolDefs,
      pendingAction,
      fallback,
      onAssistantDelta,
    } = args;
    const { sessionAgent, critic } = this.agents;

    const contextHint = [
      pendingAction ? formatPendingActionHint(pendingAction) : "",
      formatProductFocusHint(getProductFocus(session.business_profile)),
      formatBuilderHistorySnippet(history ?? []),
    ]
      .filter(Boolean)
      .join("\n\n");

    sessionAgent.configure({ session, toolDefs, contextHint });
    const messages: ExecutorChatMessage[] = sessionAgent.buildInitialMessages(history, message);
    const openAiTools = toOpenAiTools(toolDefs);

    const ctx: WebsiteBuilderContext = {
      message,
      planIntent: "session_agent",
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
      payload: { type: "agent_turn", plan: [], tool_calls: [], tool_results: [] },
    };

    const streamingSession = BuilderSessionManager.ensureShared({
      builderSessionId: session.id,
      sessionAgent,
      toolDefs,
      openAiTools,
      onLog: (entry) => this.log(entry),
    });

    const applyProseClarification = (
      toolCallsLog: Array<{ name: string; arguments: Record<string, unknown> }>,
    ) => {
      if (
        ctx.assistantMessage.trim() &&
        !ctx.profile.pending_action &&
        toolCallsLog.length === 0
      ) {
        ctx.profile = withPendingAction(ctx.profile, {
          type: "clarification",
          question: ctx.assistantMessage.trim(),
          original_message: message,
        });
        ctx.payload = {
          type: "requirements_request",
          profile: ctx.profile,
          pending_action: ctx.profile.pending_action,
        };
      }
    };

    // Session must already be started via BuilderRealtimeProvider / Start button.
    // runLoop refreshes tools in place and sendMessage — never remints open-token.
    const loop = await streamingSession.runLoop({
      messages,
      ctx,
      onContentDelta: onAssistantDelta,
    });
    applyProseClarification(loop.toolCallsLog);

    let memory = loop.memory;
    let toolCallsLog = loop.toolCallsLog;
    let toolResultsLog = loop.toolResultsLog;
    let informationalReplies = loop.informationalReplies;

    if (CRITIC_ENABLED) {
      const lastToolSummaries = toolResultsLog.map((result) =>
        summarizeToolResult(String(result.name ?? "tool"), result),
      );

      this.log({
        agent: "Critic",
        phase: "start",
        title: "Reviewing outcome",
      });
      let criticDecision = await critic
        .reviewOutcome({
          userText: message,
          memoryLines: memory,
          lastToolSummaries,
          completedToolNames: toolCallsLog.map((call) => call.name),
          assistantDraft: ctx.assistantMessage,
          allowRetry: true,
        })
        .catch(() => ({ status: "DONE" as const, reason: "Proceeding." }));

      this.log({
        agent: "Critic",
        phase: "complete",
        title: `Critic decision: ${criticDecision.status}`,
        detail: criticDecision.reason,
        data: { status: criticDecision.status, reason: criticDecision.reason },
      });

      if (criticDecision.status === "RETRY") {
        ctx.profile = withPendingAction(ctx.profile, null);
        if (!toolCallsLog.length) ctx.assistantMessage = "";
        const retryLoop = await streamingSession.runLoop({
          messages,
          ctx,
          retryHint: criticDecision.reason,
          onContentDelta: onAssistantDelta,
        });
        memory = [...memory, ...retryLoop.memory];
        toolCallsLog = [...toolCallsLog, ...retryLoop.toolCallsLog];
        toolResultsLog = [...toolResultsLog, ...retryLoop.toolResultsLog];
        informationalReplies = [...informationalReplies, ...retryLoop.informationalReplies];
        applyProseClarification(toolCallsLog);

        const retrySummaries = toolResultsLog.map((result) =>
          summarizeToolResult(String(result.name ?? "tool"), result),
        );
        this.log({
          agent: "Critic",
          phase: "start",
          title: "Reviewing retry outcome",
        });
        criticDecision = await critic
          .reviewOutcome({
            userText: message,
            memoryLines: memory,
            lastToolSummaries: retrySummaries,
            completedToolNames: toolCallsLog.map((call) => call.name),
            assistantDraft: ctx.assistantMessage,
            allowRetry: false,
          })
          .catch(() => ({ status: "DONE" as const, reason: "Proceeding after retry." }));
        this.log({
          agent: "Critic",
          phase: "complete",
          title: `Critic decision: ${criticDecision.status}`,
          detail: criticDecision.reason,
          data: { status: criticDecision.status, reason: criticDecision.reason },
        });
      }

      if (criticDecision.status === "NEED_USER") {
        if (!ctx.assistantMessage) ctx.assistantMessage = criticDecision.reason;
        if (!ctx.profile.pending_action) {
          ctx.profile = withPendingAction(ctx.profile, {
            type: "clarification",
            question: ctx.assistantMessage || criticDecision.reason,
            original_message: message,
          });
        }
        ctx.payload = {
          type: "requirements_request",
          profile: ctx.profile,
          pending_action: ctx.profile.pending_action,
        };
      }
    } else {
      // Critic LLM off — still force one deterministic retry for clear invent/refine misses.
      const actableRetryHint = missedActableRequestRetryHint(
        message,
        toolCallsLog.map((call) => call.name),
      );
      if (actableRetryHint) {
        this.log({
          agent: "Critic",
          phase: "complete",
          title: "Critic skipped: RETRY",
          detail: actableRetryHint,
        });
        ctx.profile = withPendingAction(ctx.profile, null);
        ctx.assistantMessage = "";
        const retryLoop = await streamingSession.runLoop({
          messages,
          ctx,
          retryHint: actableRetryHint,
          onContentDelta: onAssistantDelta,
        });
        memory = [...memory, ...retryLoop.memory];
        toolCallsLog = [...toolCallsLog, ...retryLoop.toolCallsLog];
        toolResultsLog = [...toolResultsLog, ...retryLoop.toolResultsLog];
        informationalReplies = [...informationalReplies, ...retryLoop.informationalReplies];
        applyProseClarification(toolCallsLog);
      } else {
        this.log({
          agent: "Critic",
          phase: "complete",
          title: "Critic skipped: DONE",
          detail: "CRITIC_ENABLED=false",
        });
      }
    }

    return this.finalizeAssistantTurn({
      ctx,
      session,
      message,
      fallback,
      toolCallsLog,
      toolResultsLog,
      informationalReplies,
      planSteps: [],
      messages,
      composeWith: sessionAgent,
    });
  }
}
