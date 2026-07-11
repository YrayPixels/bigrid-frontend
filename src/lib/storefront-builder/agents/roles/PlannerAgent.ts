import { BUILDER_HISTORY_SNIPPET_MAX_CHARS } from "@/lib/storefront-builder/chat-history";
import { BUILDER_PLANNER_SYSTEM_PROMPT_PREFIX } from "@/lib/storefront-builder/prompts";
import type { WebsiteBuilderToolDef } from "../types";
import { getAssistantMessageContent, getThinkingModelName, postChat } from "../openaiChat";
import {
  parseJsonObject,
  repairPlannerResult,
  type InterpreterResult,
  type PlannerResult,
} from "../agentThinking";
import { BuilderAgent } from "./BuilderAgent";

function toolCatalogLines(defs: WebsiteBuilderToolDef[]): string {
  if (!defs.length) return "(No tools are enabled for this session.)";
  return defs.map((tool) => `- \`${tool.name}\`: ${tool.description}`).join("\n");
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

/** Turns interpretation into tool-bearing plan steps. Fed by the manager after Interpreter. */
export class PlannerAgent extends BuilderAgent {
  readonly role = "Planner" as const;
  private toolDefs: WebsiteBuilderToolDef[] = [];

  get systemPrompt(): string {
    const allowed = new Set(this.toolDefs.map((tool) => tool.name));
    return (
      BUILDER_PLANNER_SYSTEM_PROMPT_PREFIX +
      "Allowed tools:\n" +
      (allowed.size ? [...allowed].sort().join(", ") : "(none enabled)") +
      "\n\n### Tool reference\n" +
      toolCatalogLines(this.toolDefs)
    );
  }

  /** Manager configures which tools this planner may assign before feeding work. */
  configure(toolDefs: WebsiteBuilderToolDef[]): this {
    this.toolDefs = toolDefs;
    return this;
  }

  async run(input: {
    userText: string;
    interpretation: InterpreterResult;
    historySnippet?: string;
  }): Promise<PlannerResult> {
    const { userText, interpretation, historySnippet } = input;
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

    if (!intent) return fallbackPlanner(userText);

    const notes = typeof parsed.notes === "string" && parsed.notes.trim() ? parsed.notes.trim() : undefined;
    return repairPlannerResult(
      { intent, plan_steps: planSteps, ...(notes ? { notes } : {}) },
      userText,
      allowed,
    );
  }
}
