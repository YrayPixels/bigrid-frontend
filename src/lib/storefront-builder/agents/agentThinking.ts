import { BUILDER_EXECUTOR_CONTEXT_SUFFIX } from "@/lib/storefront-builder/prompts";

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

/** Greeting / thanks — no tools. */
export function isGreetingOrSmallTalk(message: string): boolean {
  const text = message.trim().toLowerCase();
  if (!text || text.length > 80) return false;
  return /^(hi|hello|hey|thanks|thank you|thx|yo|good (morning|afternoon|evening)|how are you|how's it going)[\s!.?]*$/i.test(
    text,
  );
}

/**
 * Capability / help questions — explain what the assistant can do; do NOT capture
 * business details or invent a design from existing store profile.
 */
export function isCapabilityOrMetaQuestion(message: string): boolean {
  const text = message.trim().toLowerCase();
  if (!text || text.length > 160) return false;
  if (/^(help|help me)[\s!.?]*$/.test(text)) return true;
  if (/\bwhat can you (do|help)\b/.test(text)) return true;
  if (/\bwhat do you (do|help with)\b/.test(text)) return true;
  if (/\b(how can you help|how do you help)\b/.test(text)) return true;
  if (/\b(what are you|who are you)\b/.test(text)) return true;
  if (
    /\b(capabilities|what.*(possible|able to))\b/.test(text) &&
    /\b(you|this|here|chat|assistant)\b/.test(text)
  ) {
    return true;
  }
  return false;
}

export function builderCapabilitiesReply(hasDraft: boolean): string {
  if (hasDraft) {
    return (
      "I can refine your live website in this chat — change copy, colors, fonts, button style and spacing, photos, products, categories, and homepage sections. " +
      "I can also check orders and store performance, or help you publish when you're ready. " +
      "Tell me what you'd like to update."
    );
  }
  return (
    "I design and build your online store from this chat. Tell me what you sell and the vibe you want, then say \"build my website\". " +
    "After that I can update copy, colors, fonts, photos, products, and layout — and help you get ready to publish. " +
    "What do you sell, and who is it for?"
  );
}

/** Infer tools from a step description when the planner left tools empty. */
export function inferToolsFromStepDescription(description: string, allowed: Set<string>): string[] {
  const text = description.toLowerCase();
  const pick = (...names: string[]) => names.filter((name) => allowed.has(name));

  if (/\b(list|show|display|retrieve|fetch|get)\b.*\bproducts?\b|\bproducts?\b.*\b(list|inventory|catalog)\b/.test(text)) {
    return pick("list_products");
  }
  if (/\b(list|show|display)\b.*\borders?\b|\borders?\b.*\b(list|pending|recent)\b/.test(text)) {
    return pick("list_orders");
  }
  if (/\b(metrics|sales|performance|dashboard|how.*(store|business).*(doing|performing))\b/.test(text)) {
    return pick("get_store_metrics");
  }
  if (/\b(product grid|products? section|add.*(section|block).*product)\b/.test(text)) {
    return pick("add_page_block");
  }
  if (/\b(reorder|rearrange)\b.*\b(section|block|page)\b/.test(text)) {
    return pick("reorder_page_blocks");
  }
  if (/\b(remove|delete)\b.*\b(section|block)\b/.test(text)) {
    return pick("remove_page_block");
  }
  if (/\b(regenerate|redesign)\b.*\b(section|block)\b/.test(text)) {
    return pick("regenerate_section");
  }
  if (/\b(publish|go live|make.*(live|public))\b/.test(text)) {
    return pick("publish_website");
  }
  if (/\b(readiness|ready to publish|before publish)\b/.test(text)) {
    return pick("get_storefront_readiness");
  }
  if (/\b(archive)\b.*\bproduct|\bproduct\b.*\barchive\b/.test(text)) {
    return pick("archive_product");
  }
  if (/\b(delete|remove)\b.*\bproduct|\bproduct\b.*\b(delete|remove)\b/.test(text)) {
    return pick("delete_product");
  }
  if (/\b(update|edit|change)\b.*\bproduct|\bproduct\b.*(price|stock|name)\b/.test(text)) {
    return pick("update_product");
  }
  if (/\b(categor(y|ies))\b/.test(text) && !/\bshowcase|essentials\b/.test(text)) {
    return pick("manage_categories");
  }
  if (/\b(essentials|category showcase)\b/.test(text)) {
    return pick("link_category_showcase");
  }
  if (/\b(add|create)\b.*\bproducts?\b/.test(text)) {
    return pick("add_products");
  }
  if (/\b(description)\b.*\bproduct|\bproduct description/.test(text)) {
    return pick("generate_product_descriptions");
  }
  if (/\b(color|palette|hex)\b/.test(text) && !/\b(design|layout|look|style|template)\b/.test(text)) {
    return pick("apply_brand_color");
  }
  if (/\b(font|typography|typeface)\b/.test(text)) {
    return pick("change_font");
  }
  if (
    /\b(button|buttons|spacing|densit|sharper|pill|square corners|more space|tighter)\b/.test(text) &&
    !/\b(new design|different look|another style|switch.*(design|template))\b/.test(text)
  ) {
    return pick("update_theme_style");
  }
  if (/\b(new design|different look|switch.*(design|style)|another style)\b/.test(text)) {
    return pick("switch_design");
  }
  if (/\b(build|generate|create)\b.*\b(website|site|storefront)\b/.test(text)) {
    return pick("generate_website");
  }
  if (/\b(copy|headline|cta|about|faq|seo)\b/.test(text)) {
    return pick("refine_website_copy");
  }
  return [];
}

/** Narrow over-scoped plans for clear read-only merchant asks. */
export function repairPlannerResult(
  plan: PlannerResult,
  userText: string,
  allowed: Set<string>,
): PlannerResult {
  const message = userText.toLowerCase();
  const listOnlyProducts =
    /\b(list|show|display|what are|which)\b[\s\S]{0,40}\bproducts?\b/.test(message) &&
    !/\b(add|create|build|generate|grid|section|homepage|website|update|delete|archive|publish)\b/.test(
      message,
    );

  let steps = plan.plan_steps.map((step) => {
    const tools =
      step.tools.length > 0
        ? step.tools.filter((tool) => allowed.has(tool))
        : inferToolsFromStepDescription(step.description, allowed);
    return { ...step, tools };
  });

  if (listOnlyProducts && allowed.has("list_products")) {
    steps = [
      {
        step: 1,
        description: "List all products in your store catalog",
        tools: ["list_products"],
      },
    ];
  }

  return { ...plan, plan_steps: steps };
}

export const INFORMATIONAL_TOOL_NAMES = new Set([
  "list_products",
  "list_orders",
  "get_order",
  "get_store_metrics",
  "get_storefront_readiness",
  "suggest_site_improvements",
  "manage_categories",
]);

export function summarizeToolResult(name: string, result: Record<string, unknown>): string {
  if (typeof result.error === "string") return `[tool:${name}] error: ${result.error}`;
  if (name === "generate_website" && result.ok) return "[tool:generate_website] website generated";
  if (name === "switch_design" && result.ok) return "[tool:switch_design] design and palette applied";
  if (name === "apply_brand_color" && result.ok) return "[tool:apply_brand_color] brand color updated";
  if (name === "change_font" && result.ok) return "[tool:change_font] font updated";
  if (name === "update_theme_style" && result.ok) return "[tool:update_theme_style] style tokens updated";
  if (name === "apply_stock_images" && result.ok) return "[tool:apply_stock_images] stock photos applied";
  if (name === "source_website_images" && result.ok) return "[tool:source_website_images] image recommendations ready";
  if (name === "replace_template_images" && result.ok) return "[tool:replace_template_images] template photos replaced";
  if (name === "add_products" && result.ok) {
    const added = Array.isArray(result.added) ? result.added.length : 0;
    return `[tool:add_products] ${added} product(s) created`;
  }
  if (name === "list_products" && result.ok) {
    return `[tool:list_products] ${result.count ?? 0} product(s) listed`;
  }
  if (name === "update_product" && result.ok) return "[tool:update_product] product updated";
  if (name === "archive_product" && result.ok) return "[tool:archive_product] product archived";
  if (name === "delete_product" && result.ok) return "[tool:delete_product] product deleted";
  if (name === "set_product_variants" && result.ok) return "[tool:set_product_variants] variants updated";
  if (name === "manage_categories" && result.ok) return "[tool:manage_categories] categories updated";
  if (name === "link_category_showcase" && result.ok) return "[tool:link_category_showcase] essentials linked";
  if (name === "duplicate_product" && result.ok) return "[tool:duplicate_product] product duplicated";
  if (name === "add_page_block" && result.ok) return `[tool:add_page_block] added ${result.block_type ?? "section"}`;
  if (name === "remove_page_block" && result.ok) return "[tool:remove_page_block] section removed";
  if (name === "reorder_page_blocks" && result.ok) return "[tool:reorder_page_blocks] sections reordered";
  if (name === "update_page_section" && result.ok) return "[tool:update_page_section] section updated";
  if (name === "regenerate_section" && result.ok) return "[tool:regenerate_section] section regenerated";
  if (name === "get_storefront_readiness" && result.ok) {
    return `[tool:get_storefront_readiness] ready=${result.ready === true}`;
  }
  if (name === "publish_website" && result.ok) return "[tool:publish_website] storefront published";
  if (name === "update_store_profile" && result.ok) return "[tool:update_store_profile] store profile updated";
  if (name === "get_store_metrics" && result.ok) return "[tool:get_store_metrics] metrics loaded";
  if (name === "list_orders" && result.ok) {
    const count = Array.isArray(result.orders) ? result.orders.length : 0;
    return `[tool:list_orders] ${count} order(s)`;
  }
  if (name === "get_order" && result.ok) return "[tool:get_order] order detail loaded";
  if (name === "update_order_status" && result.ok) return "[tool:update_order_status] status updated";
  if (name === "suggest_site_improvements" && result.ok) {
    const count = Array.isArray(result.suggestions) ? result.suggestions.length : 0;
    return `[tool:suggest_site_improvements] ${count} suggestion(s)`;
  }
  if (name === "generate_product_descriptions" && result.ok) {
    return `[tool:generate_product_descriptions] ${result.updated ?? 0} description(s) updated`;
  }
  if (name === "generate_custom_site" && result.ok) {
    return `[tool:generate_custom_site] custom website generated (${(result.html_size as number) ?? 0} bytes)`;
  }
  if (name === "process_product_image" && result.ok) {
    return `[tool:process_product_image] product identified: ${(result.product as { name?: string })?.name ?? "unknown"}`;
  }
  if (name === "design_website" && result.ok) return "[tool:design_website] website design selected";
  if (name === "capture_business_details" && result.ok) return "[tool:capture_business_details] profile updated";
  if (name === "refine_website_copy" && result.ok) return "[tool:refine_website_copy] copy refined";
  if (name === "change_font" && result.ok) {
    return `[tool:change_font] font changed to ${result.font_label ?? result.font}`;
  }
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
