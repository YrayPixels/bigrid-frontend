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
      ? `\n\n### Recent conversation\n${historySnippet.trim().slice(0, 2500)}`
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
}): Promise<PlannerResult> {
  const { userText, interpretation, toolDefs } = args;
  const allowed = new Set(toolDefs.map((tool) => tool.name));

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
          `### Latest merchant message\n${userText.trim()}`,
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

  if (!intent || planSteps.length === 0) return fallbackPlanner(userText);

  const notes = typeof parsed.notes === "string" && parsed.notes.trim() ? parsed.notes.trim() : undefined;
  return { intent, plan_steps: planSteps, ...(notes ? { notes } : {}) };
}

export async function runCritic(args: {
  userText: string;
  interpretation: InterpreterResult;
  plan: PlannerResult;
  memoryLines: string[];
  lastToolSummaries: string[];
}): Promise<CriticResult> {
  const { userText, interpretation, plan, memoryLines, lastToolSummaries } = args;

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
          memory: memoryLines.slice(-12),
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
  if (name === "design_website" && result.ok) return "[tool:design_website] website design selected";
  if (name === "capture_business_details" && result.ok) return "[tool:capture_business_details] profile updated";
  if (name === "refine_website_copy" && result.ok) return "[tool:refine_website_copy] copy refined";
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
    "### Planner steps\n" +
    `${planLines || "(none)"}\n` +
    (plan.notes ? `\n### Planner notes\n${plan.notes}\n` : "") +
    BUILDER_EXECUTOR_CONTEXT_SUFFIX
  );
}
