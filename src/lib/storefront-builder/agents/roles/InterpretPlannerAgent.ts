import { BUILDER_HISTORY_SNIPPET_MAX_CHARS } from "@/lib/storefront-builder/chat-history";
import { BUILDER_INTERPRET_PLANNER_SYSTEM_PROMPT_PREFIX } from "@/lib/storefront-builder/prompts";
import type { WebsiteBuilderToolDef } from "../types";
import { getAssistantMessageContent, getThinkingModelName, postChat } from "../openaiChat";
import {
  isCapabilityOrMetaQuestion,
  isGreetingOrSmallTalk,
  parseJsonObject,
  repairPlannerResult,
  type InterpretPlannerResult,
  type InterpreterResult,
  type PlannerResult,
} from "../agentThinking";
import { BuilderAgent } from "./BuilderAgent";

function toolCatalogLines(defs: WebsiteBuilderToolDef[]): string {
  if (!defs.length) return "(No tools are enabled for this session.)";
  return defs.map((tool) => `- \`${tool.name}\`: ${tool.description}`).join("\n");
}

function fallbackInterpretPlanner(userText: string): InterpretPlannerResult {
  if (isCapabilityOrMetaQuestion(userText)) {
    return {
      interpretation: {
        task_summary: "Explain what the website assistant can help with.",
        steps: ["Reply with capabilities in plain language. Do not capture business details or pick a design."],
        constraints: ["no_tools", "capability_question"],
      },
      plan: {
        intent: "Explain assistant capabilities without using tools.",
        plan_steps: [],
      },
    };
  }
  if (isGreetingOrSmallTalk(userText)) {
    return {
      interpretation: {
        task_summary: "Welcome the merchant.",
        steps: ["Reply warmly and invite them to describe their business or request website changes."],
        constraints: ["no_tools", "greeting"],
      },
      plan: {
        intent: "Greet the merchant; no tools needed.",
        plan_steps: [],
      },
    };
  }
  return {
    interpretation: {
      task_summary: userText.trim().slice(0, 500),
      steps: [
        "Understand what the merchant wants their website to communicate.",
        "Capture missing business details if needed.",
        "Design and generate the website when enough context exists.",
        "Reply warmly with the next step for the merchant.",
      ],
    },
    plan: {
      intent: userText.trim().slice(0, 400),
      plan_steps: [
        {
          step: 1,
          description: "Help the merchant build their website with tools only when needed.",
          tools: [],
        },
      ],
    },
  };
}

/**
 * Combined Interpreter + Planner: one thinking-model call that returns both
 * the merchant-language brief and tool-bearing plan steps.
 */
export class InterpretPlannerAgent extends BuilderAgent {
  readonly role = "InterpretPlanner" as const;
  private toolDefs: WebsiteBuilderToolDef[] = [];

  get systemPrompt(): string {
    const allowed = new Set(this.toolDefs.map((tool) => tool.name));
    return (
      BUILDER_INTERPRET_PLANNER_SYSTEM_PROMPT_PREFIX +
      "Allowed tools:\n" +
      (allowed.size ? [...allowed].sort().join(", ") : "(none enabled)") +
      "\n\n### Tool reference\n" +
      toolCatalogLines(this.toolDefs)
    );
  }

  configure(toolDefs: WebsiteBuilderToolDef[]): this {
    this.toolDefs = toolDefs;
    return this;
  }

  async run(input: { userText: string; historySnippet?: string }): Promise<InterpretPlannerResult> {
    const { userText, historySnippet } = input;
    const allowed = new Set(this.toolDefs.map((tool) => tool.name));
    const historyBlock =
      historySnippet && historySnippet.trim()
        ? `\n\n### Recent conversation\n${historySnippet.trim().slice(0, BUILDER_HISTORY_SNIPPET_MAX_CHARS)}`
        : "";

    const data = await postChat({
      model: await getThinkingModelName(),
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: this.systemPrompt },
        {
          role: "user",
          content: `### Latest merchant message\n${userText.trim()}${historyBlock}`,
        },
      ],
    });

    const content = getAssistantMessageContent(data);
    const parsed = parseJsonObject<
      Partial<InterpreterResult & PlannerResult> & { plan_steps?: unknown }
    >(content, {});

    const steps = Array.isArray(parsed.steps)
      ? parsed.steps.filter((step): step is string => typeof step === "string" && Boolean(step.trim()))
      : [];
    const taskSummary =
      typeof parsed.task_summary === "string" && parsed.task_summary.trim()
        ? parsed.task_summary.trim()
        : "";
    const constraints = Array.isArray(parsed.constraints)
      ? parsed.constraints.filter((item) => typeof item === "string" && item.trim()).map(String)
      : undefined;

    const intent =
      typeof parsed.intent === "string" && parsed.intent.trim()
        ? parsed.intent.trim()
        : taskSummary;
    const rawSteps = Array.isArray(parsed.plan_steps) ? parsed.plan_steps : [];
    const planSteps = rawSteps
      .map((row: unknown, index: number) => {
        const object = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
        const description = typeof object.description === "string" ? object.description.trim() : "";
        const toolsRaw = Array.isArray(object.tools) ? object.tools : [];
        const tools = [
          ...new Set(
            toolsRaw.filter(
              (tool): tool is string => typeof tool === "string" && allowed.has(tool as never),
            ),
          ),
        ];
        const step = typeof object.step === "number" && Number.isFinite(object.step) ? object.step : index + 1;
        return { step, description: description || `Step ${index + 1}`, tools };
      })
      .filter((row) => row.description.length > 0);

    if (!taskSummary || steps.length === 0) {
      return fallbackInterpretPlanner(userText);
    }

    const notes = typeof parsed.notes === "string" && parsed.notes.trim() ? parsed.notes.trim() : undefined;
    const interpretation: InterpreterResult = {
      task_summary: taskSummary,
      steps,
      ...(constraints?.length ? { constraints } : {}),
    };
    const plan = repairPlannerResult(
      { intent: intent || taskSummary, plan_steps: planSteps, ...(notes ? { notes } : {}) },
      userText,
      allowed,
    );

    return { interpretation, plan };
  }
}
