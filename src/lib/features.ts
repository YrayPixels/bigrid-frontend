/**
 * Feature flags for merchant UI.
 *
 * Code workbench is incomplete for production publish/runtime.
 * Enable locally with NEXT_PUBLIC_ENABLE_CODE_WORKBENCH=true.
 */
export function isCodeWorkbenchEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_CODE_WORKBENCH === "true";
}

/**
 * Single LLM + tools builder agent (SessionAgent → Critic retry).
 * Default off — keeps Interpret+Plan → Executor waterfall.
 * Enable locally with NEXT_PUBLIC_ENABLE_BUILDER_TOOL_AGENT=true.
 */
export function isBuilderToolAgentEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_BUILDER_TOOL_AGENT === "true";
}

/**
 * AI process "Log" button in the storefront builder — internal debugging aid,
 * not meant for merchants. Dev-only.
 */
export function isThinkingLogEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}
