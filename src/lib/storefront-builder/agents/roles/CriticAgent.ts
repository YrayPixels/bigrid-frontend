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
    if (allowRetry) {
      const actableRetry = missedActableRequestRetryHint(userText, completedToolNames);
      if (actableRetry) {
        return { status: "RETRY", reason: actableRetry };
      }
    }

    if (completedToolNames.includes("ask_clarifying_question")) {
      return {
        status: "NEED_USER",
        reason: assistantDraft.trim() || "Need a clarifying detail from the merchant.",
      };
    }

    // Content/design tools can succeed while still missing the request — always review.
    const needsQualityReview = completedToolNames.some((name) =>
      QUALITY_REVIEW_TOOLS.has(name),
    );
    const allToolsOk =
      completedToolNames.length > 0 &&
      lastToolSummaries.every((line) => !/\berror\b/i.test(line));

    if (allToolsOk && !needsQualityReview) {
      return { status: "DONE", reason: "Tools completed successfully." };
    }

    // FAQ invent/update under-fulfillment: one Q&A pair = 2 paths.
    if (
      allowRetry &&
      completedToolNames.includes("refine_website_copy") &&
      /\bfaqs?\b/i.test(userText) &&
      /\b(come up with|invent|generate|update|refresh|rewrite|revise|improve|fix|fit|brand|relevant)\b/i.test(
        userText,
      )
    ) {
      const pathMatch = lastToolSummaries
        .find((line) => /refine_website_copy/.test(line))
        ?.match(/\((\d+)\s+path/);
      const paths = pathMatch ? Number(pathMatch[1]) : null;
      if (paths !== null && paths > 0 && paths <= 2) {
        return {
          status: "RETRY",
          reason:
            "Rewrite the full FAQ section (3–5 Q&As) for this business brand — not a single FAQ item. Use the store business name, never a product name.",
        };
      }
    }

    if (allToolsOk && needsQualityReview && !allowRetry) {
      // After one retry, accept successful tool runs rather than looping forever.
      return { status: "DONE", reason: "Tools completed after retry." };
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

/** Tools that can return ok while still under-fulfilling the merchant request. */
const QUALITY_REVIEW_TOOLS = new Set([
  "refine_website_copy",
  "switch_design",
  "generate_website",
  "design_website",
  "apply_brand_color",
  "change_font",
  "update_theme_style",
  "replace_template_images",
  "source_website_images",
  "generate_product_descriptions",
  "generate_custom_site",
  "edit_custom_site_code",
]);

/**
 * Merchant asked for an inventable refine (SEO, headline, about, FAQ, colors, photos,
 * product descriptions) but the agent asked instead of calling the matching tool.
 */
export function missedActableRequestRetryHint(
  userText: string,
  completedToolNames: string[],
): string | null {
  const text = userText.trim();
  if (!text) return null;

  const onlyMissedAct =
    completedToolNames.length === 0 ||
    (completedToolNames.length === 1 && completedToolNames[0] === "ask_clarifying_question");
  if (!onlyMissedAct) return null;

  const inventVerb =
    /\b(update|improve|refresh|rewrite|revise|fix|optimize|optimise|polish|make|change|want|source|find|write|different|new)\b/i.test(
      text,
    );

  if (
    (/\bseo\b/i.test(text) ||
      /\b(search\s+visibility|meta\s+description|search\s+title)\b/i.test(text)) &&
    (inventVerb || /\bseo\s+title\s+and\s+description\b/i.test(text)) &&
    !(/\bseo\.(title|description)\b/i.test(text) ||
      (/\btitle\s*[:=]/i.test(text) && /\bdescription\s*[:=]/i.test(text)))
  ) {
    return (
      "Call refine_website_copy now to rewrite seo.title and seo.description for this business " +
      "(compelling search title and meta description). Do not ask the merchant for the title or description."
    );
  }

  if (/\bheadline\b/i.test(text) && inventVerb) {
    return (
      "Call refine_website_copy now to rewrite the homepage headline to be more compelling for this business. " +
      "Do not ask what the headline should say."
    );
  }

  if (/\babout\b/i.test(text) && inventVerb) {
    return (
      "Call refine_website_copy now to rewrite the about section for this business brand story. " +
      "Do not ask what the about copy should say."
    );
  }

  if (
    /\bfaqs?\b/i.test(text) &&
    /\b(come up with|invent|generate|update|refresh|rewrite|revise|improve|fix|fit|brand|relevant)\b/i.test(
      text,
    )
  ) {
    return (
      "Call refine_website_copy now to rewrite ALL FAQ items (3–5 Q&As) for this business brand. " +
      "Use the store business name, never a product name. Do not ask clarifying questions."
    );
  }

  if (
    /\b(color|colour|palette)\b/i.test(text) &&
    /\b(different|new|change|update|want|another)\b/i.test(text) &&
    !/\b(design|layout|look|style|template)\b/i.test(text)
  ) {
    return (
      "Call apply_brand_color now and pick a fresh palette that fits this business. " +
      "Do not ask which colors they want."
    );
  }

  if (
    /\b(product\s+descriptions?|descriptions?\s+for\s+(?:all\s+)?(?:my\s+)?products?|write\s+compelling\s+descriptions?)\b/i.test(
      text,
    ) &&
    !/\bfor\s+the\s+[a-z0-9][\w\s-]{1,40}\b/i.test(text)
  ) {
    return (
      "Call generate_product_descriptions now for all products. " +
      "Do not ask which product."
    );
  }

  if (
    /\b(source\s+brand\s+photos?|brand\s+photos?|photo\s+ideas?|find\s+(?:me\s+)?(?:better\s+)?(?:photos?|images?)|better\s+photos?|update\s+(?:the\s+)?(?:images?|photos?))\b/i.test(
      text,
    ) &&
    !/\b(iphone|samsung|sofa|for\s+the\s+)\b/i.test(text)
  ) {
    if (/\b(source|ideas?|what\s+photos|brand)\b/i.test(text)) {
      return (
        "Call source_website_images now with brand-matched photo suggestions. " +
        "Do not ask which photos they want first."
      );
    }
    return (
      "Call replace_template_images now with scope=full_site (or hero if they only mentioned the header). " +
      "Do not ask which photos first."
    );
  }

  return null;
}

/** @deprecated Prefer missedActableRequestRetryHint */
export function missedSeoInventRetryHint(
  userText: string,
  completedToolNames: string[],
): string | null {
  return missedActableRequestRetryHint(userText, completedToolNames);
}
