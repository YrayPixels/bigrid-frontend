import type { WebMcpModelContext, WebMcpToolDefinition } from "./types";

export function getModelContext(): WebMcpModelContext | null {
  if (typeof document === "undefined") return null;

  const context = document.modelContext ?? navigator.modelContext ?? null;
  if (!context || typeof context.registerTool !== "function") return null;

  return context;
}

export function isWebMcpSupported(): boolean {
  return getModelContext() !== null;
}

export async function registerWebMcpTools(
  tools: WebMcpToolDefinition[],
  signal: AbortSignal,
): Promise<void> {
  const context = getModelContext();
  if (!context) return;

  await Promise.all(
    tools.map((tool) =>
      context.registerTool(
        {
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          execute: tool.execute,
          ...(tool.annotations ? { annotations: tool.annotations } : {}),
        },
        { signal },
      ),
    ),
  );
}

export function webMcpJson(payload: unknown): string {
  return JSON.stringify(payload, null, 2);
}
