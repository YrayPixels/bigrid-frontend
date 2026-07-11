import { remainingPlannedTools } from "@/lib/storefront-builder/section-scope";
import { BUILDER_CRITIC_SYSTEM_PROMPT } from "@/lib/storefront-builder/prompts";
import { getAssistantMessageContent, getThinkingModelName, postChat } from "../openaiChat";
import {
  parseJsonObject,
  type CriticResult,
  type InterpreterResult,
  type PlannerResult,
} from "../agentThinking";
import { BuilderAgent } from "./BuilderAgent";

/** Reviews executor progress. Fed by the manager after each tool-bearing step. */
export class CriticAgent extends BuilderAgent {
  readonly role = "Critic" as const;

  get systemPrompt(): string {
    return BUILDER_CRITIC_SYSTEM_PROMPT;
  }

  async run(input: {
    userText: string;
    interpretation: InterpreterResult;
    plan: PlannerResult;
    memoryLines: string[];
    lastToolSummaries: string[];
    completedToolNames?: string[];
  }): Promise<CriticResult> {
    const {
      userText,
      interpretation,
      plan,
      memoryLines,
      lastToolSummaries,
      completedToolNames = [],
    } = input;

    const pendingTools = remainingPlannedTools(plan.plan_steps, completedToolNames);
    if (pendingTools.length > 0) {
      return {
        status: "CONTINUE",
        reason: `Planned tools still pending: ${pendingTools.join(", ")}`,
      };
    }

    const data = await postChat({
      model: await getThinkingModelName(),
      temperature: 0.15,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: this.systemPrompt },
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
}
