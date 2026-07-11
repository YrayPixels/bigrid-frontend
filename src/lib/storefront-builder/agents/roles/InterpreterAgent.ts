import { BUILDER_HISTORY_SNIPPET_MAX_CHARS } from "@/lib/storefront-builder/chat-history";
import { BUILDER_INTERPRETER_SYSTEM_PROMPT } from "@/lib/storefront-builder/prompts";
import { getAssistantMessageContent, getThinkingModelName, postChat } from "../openaiChat";
import {
  parseJsonObject,
  type InterpreterResult,
} from "../agentThinking";
import { BuilderAgent } from "./BuilderAgent";

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

/** Interprets the merchant message. Fed by the manager with the raw user text. */
export class InterpreterAgent extends BuilderAgent {
  readonly role = "Interpreter" as const;

  get systemPrompt(): string {
    return BUILDER_INTERPRETER_SYSTEM_PROMPT;
  }

  async run(input: { userText: string; historySnippet?: string }): Promise<InterpreterResult> {
    const { userText, historySnippet } = input;
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

    return {
      task_summary: taskSummary,
      steps,
      ...(constraints?.length ? { constraints } : {}),
    };
  }
}
