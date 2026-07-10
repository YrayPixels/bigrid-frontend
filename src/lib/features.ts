/**
 * Feature flags for merchant UI.
 *
 * Code workbench is incomplete for production publish/runtime.
 * Enable locally with NEXT_PUBLIC_ENABLE_CODE_WORKBENCH=true.
 */
export function isCodeWorkbenchEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_CODE_WORKBENCH === "true";
}
