import { BUILDER_HISTORY_SNIPPET_MAX_CHARS } from "@/lib/storefront-builder/chat-history";
import { remainingPlannedTools } from "@/lib/storefront-builder/section-scope";
import type { WebsiteBuilderToolDef } from "./types";
import { getAssistantMessageContent, getThinkingModel, postChat } from "./openaiChat";
import {
  BUILDER_CRITIC_SYSTEM_PROMPT,
  BUILDER_EXECUTOR_CONTEXT_SUFFIX,
  BUILDER_INTERPRETER_SYSTEM_PROMPT,
  BUILDER_PLANNER_SYSTEM_PROMPT_PREFIX,
} from "@/lib/storefront-builder/prompts";

export type InterpreterResult = {
  task_summary: string;
  steps: string[];
  constraints?: string[];
};

export type PlannerPlanStep = {
  step: number;
  description: string;
  tools: string[];
};

export type PlannerResult = {
  intent: string;
  plan_steps: PlannerPlanStep[];
  notes?: string;
};

export type CriticStatus = "CONTINUE" | "DONE" | "NEED_USER";

export type CriticResult = {
  status: CriticStatus;
  reason: string;
};

function extractJsonObject(text: string): string | null {
  const trimmed = text.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  return trimmed.slice(start, end + 1);
}

export function parseJsonObject<T>(content: string, fallback: T): T {
  const slice = extractJsonObject(content);
  if (!slice) return fallback;
  try {
    return JSON.parse(slice) as T;
  } catch {
    return fallback;
  }
}

function fallbackInterpreter(userText: string): InterpreterResult {
  return {
    task_summary: userText.trim().slice(0, 500),
    steps: [
      "Understand what the merchant wants their website to communicate.",
      "Capture missing business details if needed.",
      "Design and generate the website when enough context exists.",
      "Reply warmly with the next step for the merchant.",
    ],
  };
}

function fallbackPlanner(userText: string): PlannerResult {
  return {
    intent: userText.trim().slice(0, 400),
    plan_steps: [
      {
        step: 1,
        description: "Help the merchant build their website with tools only when needed.",
        tools: [],
      },
    ],
  };
}

function toolCatalogLines(defs: WebsiteBuilderToolDef[]): string {
  if (!defs.length) return "(No tools are enabled for this session.)";
  return defs.map((tool) => `- \`${tool.name}\`: ${tool.description}`).join("\n");
}

export async function runInterpreter(args: {
  userText: string;
  historySnippet?: string;
}): Promise<InterpreterResult> {
  const { userText, historySnippet } = args;
  const historyBlock =
    historySnippet && historySnippet.trim()
      ? `\n\n### Recent conversation\n${historySnippet.trim().slice(0, BUILDER_HISTORY_SNIPPET_MAX_CHARS)}`
      : "";

  const data = await postChat({
    model: getThinkingModel(),
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: BUILDER_INTERPRETER_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: `### Latest merchant message\n${userText.trim()}${historyBlock}`,
      },
    ],
  });

  const content = getAssistantMessageContent(data);
  const parsed = parseJsonObject<Partial<InterpreterResult>>(content, {});
  const steps = Array.isArray(parsed.steps)
    ? parsed.steps.filter((step) => typeof step === "string" && step.trim())
    : [];
  const taskSummary =
    typeof parsed.task_summary === "string" && parsed.task_summary.trim()
      ? parsed.task_summary.trim()
      : "";

  if (!taskSummary || steps.length === 0) return fallbackInterpreter(userText);

  const constraints = Array.isArray(parsed.constraints)
    ? parsed.constraints.filter((item) => typeof item === "string" && item.trim()).map(String)
    : undefined;

  return { task_summary: taskSummary, steps, ...(constraints?.length ? { constraints } : {}) };
}

export async function runPlanner(args: {
  userText: string;
  interpretation: InterpreterResult;
  toolDefs: WebsiteBuilderToolDef[];
  historySnippet?: string;
}): Promise<PlannerResult> {
  const { userText, interpretation, toolDefs, historySnippet } = args;
  const allowed = new Set(toolDefs.map((tool) => tool.name));
  const historyBlock =
    historySnippet && historySnippet.trim()
      ? `\n\n### Recent conversation\n${historySnippet.trim().slice(0, BUILDER_HISTORY_SNIPPET_MAX_CHARS)}`
      : "";

  const data = await postChat({
    model: getThinkingModel(),
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          BUILDER_PLANNER_SYSTEM_PROMPT_PREFIX +
          "Allowed tools:\n" +
          (allowed.size ? [...allowed].sort().join(", ") : "(none enabled)") +
          "\n\n### Tool reference\n" +
          toolCatalogLines(toolDefs),
      },
      {
        role: "user",
        content:
          `### Interpreter output\n${JSON.stringify(interpretation)}\n\n` +
          `### Latest merchant message\n${userText.trim()}${historyBlock}`,
      },
    ],
  });

  const content = getAssistantMessageContent(data);
  const parsed = parseJsonObject<Partial<PlannerResult>>(content, {});
  const intent = typeof parsed.intent === "string" && parsed.intent.trim() ? parsed.intent.trim() : "";
  const rawSteps = Array.isArray(parsed.plan_steps) ? parsed.plan_steps : [];
  const planSteps = rawSteps
    .map((row: unknown, index: number) => {
      const object = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
      const description = typeof object.description === "string" ? object.description.trim() : "";
      const toolsRaw = Array.isArray(object.tools) ? object.tools : [];
      const tools = [...new Set(toolsRaw.filter((tool): tool is string => typeof tool === "string" && allowed.has(tool as never)))];
      const step = typeof object.step === "number" && Number.isFinite(object.step) ? object.step : index + 1;
      return { step, description: description || `Step ${index + 1}`, tools };
    })
    .filter((row) => row.description.length > 0);

  // Allow empty plan_steps when the AI explicitly returned them (greetings, small talk).
  // Only fall back when the AI call failed to produce any usable output at all.
  if (!intent) return fallbackPlanner(userText);

  const notes = typeof parsed.notes === "string" && parsed.notes.trim() ? parsed.notes.trim() : undefined;
  return { intent, plan_steps: planSteps, ...(notes ? { notes } : {}) };
}

export async function runCritic(args: {
  userText: string;
  interpretation: InterpreterResult;
  plan: PlannerResult;
  memoryLines: string[];
  lastToolSummaries: string[];
  completedToolNames?: string[];
}): Promise<CriticResult> {
  const { userText, interpretation, plan, memoryLines, lastToolSummaries, completedToolNames = [] } = args;
  const pendingTools = remainingPlannedTools(plan.plan_steps, completedToolNames);
  if (pendingTools.length > 0) {
    return {
      status: "CONTINUE",
      reason: `Planned tools still pending: ${pendingTools.join(", ")}`,
    };
  }

  const data = await postChat({
    model: getThinkingModel(),
    temperature: 0.15,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: BUILDER_CRITIC_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: JSON.stringify({
          latest_message: userText,
          interpretation,
          plan,
          completed_tool_names: completedToolNames,
          pending_plan_tools: pendingTools,
          memory: memoryLines.slice(-24),
          last_tool_summaries: lastToolSummaries,
        }),
      },
    ],
  });

  const content = getAssistantMessageContent(data);
  const parsed = parseJsonObject<Partial<CriticResult>>(content, {});
  const status = parsed.status;
  const reason = typeof parsed.reason === "string" ? parsed.reason.trim() : "";

  if (status === "CONTINUE" || status === "DONE" || status === "NEED_USER") {
    return { status, reason: reason || status };
  }

  return { status: "DONE", reason: "No further tool actions required." };
}

export function summarizeToolResult(name: string, result: Record<string, unknown>): string {
  if (typeof result.error === "string") return `[tool:${name}] error: ${result.error}`;
  if (name === "generate_website" && result.ok) return "[tool:generate_website] website generated";
  if (name === "switch_design" && result.ok) return "[tool:switch_design] design and palette applied";
  if (name === "apply_brand_color" && result.ok) return "[tool:apply_brand_color] brand color updated";
  if (name === "apply_stock_images" && result.ok) return "[tool:apply_stock_images] stock photos applied";
  if (name === "source_website_images" && result.ok) return "[tool:source_website_images] image recommendations ready";
  if (name === "replace_template_images" && result.ok) return "[tool:replace_template_images] template photos replaced";
  if (name === "add_products" && result.ok) {
    const added = Array.isArray(result.added) ? result.added.length : 0;
    return `[tool:add_products] ${added} product(s) created`;
  }
  if (name === "generate_product_descriptions" && result.ok) return `[tool:generate_product_descriptions] ${result.updated ?? 0} description(s) updated`;
  if (name === "process_product_image" && result.ok) return `[tool:process_product_image] product identified: ${(result.product as { name?: string })?.name ?? "unknown"}`;
  if (name === "design_website" && result.ok) return "[tool:design_website] website design selected";
  if (name === "capture_business_details" && result.ok) return "[tool:capture_business_details] profile updated";
  if (name === "refine_website_copy" && result.ok) return "[tool:refine_website_copy] copy refined";
  if (name === "change_font" && result.ok) return `[tool:change_font] font changed to ${result.font_label ?? result.font}`;
  return `[tool:${name}] ${JSON.stringify(result).slice(0, 220)}`;
}

export function appendMemory(lines: string[], line: string, max = 24): string[] {
  const next = [...lines, line.slice(0, 550)];
  return next.slice(-max);
}

export function formatThinkingContext(interpretation: InterpreterResult, plan: PlannerResult): string {
  const steps = interpretation.steps.map((step, index) => `${index + 1}. ${step}`).join("\n");
  const planLines = plan.plan_steps
    .map(
      (step) =>
        `Step ${step.step}: ${step.description}${step.tools.length ? ` → tools: ${step.tools.join(", ")}` : ""}`,
    )
    .join("\n");

  return (
    "### Task brief (internal)\n" +
    `${interpretation.task_summary}\n\n` +
    "### Ordered work steps\n" +
    `${steps}\n` +
    (interpretation.constraints?.length
      ? `\n### Constraints\n${interpretation.constraints.map((item) => `- ${item}`).join("\n")}\n`
      : "\n") +
    "### Planner intent\n" +
    `${plan.intent}\n\n` +
    "### Planner steps (you MUST execute these — never ask permission first)\n" +
    `${planLines || "(none)"}\n` +
    (plan.notes ? `\n### Planner notes\n${plan.notes}\n` : "") +
    "\n### Execution rule\n" +
    "Call every planned tool that has not run yet. Do not ask 'shall I proceed?' or 'would you like me to?' — just call the tool(s) immediately. " +
    "If a plan step has no tools assigned but a later step does, SKIP the tool-less step and jump straight to the first step with tools. " +
    "Never reply with only prose when any plan step has tools assigned. " +
    "If you are unsure about a detail, infer it from the plan and the merchant's business. " +
    "Only reply without tools if no plan step has any tools remaining.\n" +
    BUILDER_EXECUTOR_CONTEXT_SUFFIX
  );
}
