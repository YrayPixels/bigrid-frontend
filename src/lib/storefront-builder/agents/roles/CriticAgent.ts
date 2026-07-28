import { remainingPlannedTools } from "@/lib/storefront-builder/section-scope";
import {
  BUILDER_CRITIC_SYSTEM_PROMPT,
  BUILDER_OUTCOME_CRITIC_SYSTEM_PROMPT,
} from "@/lib/storefront-builder/prompts";
import { getAssistantMessageContent, getThinkingModelName, postChat } from "../openaiChat";
import {
  parseJsonObject,
  type CriticResult,
  type InterpreterResult,
  type PlannerResult,
} from "../agentThinking";
import { BuilderAgent } from "./BuilderAgent";

/** Reviews executor progress (waterfall) or SessionAgent outcome (tool-agent flag). */
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

  /**
   * Outcome review for SessionAgent path: DONE | NEED_USER | RETRY.
   * Manager allows at most one RETRY.
   */
  async reviewOutcome(input: {
    userText: string;
    memoryLines: string[];
    lastToolSummaries: string[];
    completedToolNames: string[];
    assistantDraft?: string;
    allowRetry: boolean;
  }): Promise<CriticResult> {
    const {
      userText,
      memoryLines,
      lastToolSummaries,
      completedToolNames,
      assistantDraft = "",
      allowRetry,
    } = input;

    // Deterministic short-circuits before spending an LLM call.
    if (completedToolNames.includes("ask_clarifying_question")) {
      return {
        status: "NEED_USER",
        reason: assistantDraft.trim() || "Need a clarifying detail from the merchant.",
      };
    }
    if (completedToolNames.length > 0 && lastToolSummaries.every((line) => !/\berror\b/i.test(line))) {
      // Successful tool work usually does not need a critic LLM.
      return { status: "DONE", reason: "Tools completed successfully." };
    }

    const data = await postChat({
      model: await getThinkingModelName(),
      temperature: 0.15,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: BUILDER_OUTCOME_CRITIC_SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            latest_message: userText,
            completed_tool_names: completedToolNames,
            last_tool_summaries: lastToolSummaries,
            memory: memoryLines.slice(-24),
            assistant_draft: assistantDraft.slice(0, 500),
            retry_allowed: allowRetry,
          }),
        },
      ],
    });

    const content = getAssistantMessageContent(data);
    const parsed = parseJsonObject<Partial<CriticResult>>(content, {});
    const reason = typeof parsed.reason === "string" ? parsed.reason.trim() : "";

    if (parsed.status === "RETRY") {
      if (!allowRetry) {
        return { status: "DONE", reason: reason || "Retry budget exhausted." };
      }
      return { status: "RETRY", reason: reason || "Retry with corrected tools." };
    }
    if (parsed.status === "NEED_USER") {
      return { status: "NEED_USER", reason: reason || "Need merchant input." };
    }
    if (parsed.status === "DONE") {
      return { status: "DONE", reason: reason || "Request fulfilled." };
    }

    return { status: "DONE", reason: "No further action required." };
  }
}
