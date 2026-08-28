import { createPlatformWebMcpTools } from "@/lib/webmcp/platform-tools";
import { getModelContext, registerWebMcpTools } from "./model-context";

const WEBMCP_LOG_PREFIX = "[bizgrid/webmcp]";

let bootstrapPromise: Promise<string[]> | null = null;
let abortController: AbortController | null = null;

function waitForModelContext(maxAttempts = 120): Promise<ReturnType<typeof getModelContext>> {
  return new Promise((resolve) => {
    let attempts = 0;

    const tick = () => {
      const context = getModelContext();
      if (context || attempts >= maxAttempts) {
        resolve(context);
        return;
      }
      attempts += 1;
      requestAnimationFrame(tick);
    };

    tick();
  });
}

function notifyToolChange(context: NonNullable<ReturnType<typeof getModelContext>>) {
  try {
    document.dispatchEvent(new Event("toolchange"));
  } catch {
    // Some browsers expose toolchange on modelContext instead of document.
  }

  const modelContext = context as NonNullable<ReturnType<typeof getModelContext>> & {
    dispatchEvent?: (event: Event) => boolean;
  };
  modelContext.dispatchEvent?.(new Event("toolchange"));
}

/**
 * Register platform tools once per page load. Avoids React Strict Mode cleanup
 * unregistering tools before agents can discover them.
 */
export function ensurePlatformWebMcpTools(): Promise<string[]> {
  if (typeof window === "undefined") {
    return Promise.resolve([]);
  }

  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    const context = await waitForModelContext();
    if (!context) {
      if (process.env.NODE_ENV === "development") {
        console.info(WEBMCP_LOG_PREFIX, "WebMCP API not available in this browser.");
      }
      bootstrapPromise = null;
      return [];
    }

    abortController?.abort();
    abortController = new AbortController();

    const tools = createPlatformWebMcpTools();
    const registered: string[] = [];
    const failed: Array<{ name: string; error: unknown }> = [];

    for (const tool of tools) {
      try {
        await context.registerTool(
          {
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            execute: tool.execute,
            ...(tool.annotations ? { annotations: tool.annotations } : {}),
          },
          { signal: abortController.signal },
        );
        registered.push(tool.name);
      } catch (error) {
        failed.push({ name: tool.name, error });
      }
    }

    if (registered.length > 0) {
      notifyToolChange(context);
      console.info(WEBMCP_LOG_PREFIX, `Registered ${registered.length} tool(s):`, registered.join(", "));
    }

    if (failed.length > 0) {
      console.error(WEBMCP_LOG_PREFIX, "Failed to register tool(s):", failed);
    }

    if (registered.length === 0) {
      bootstrapPromise = null;
    }

    return registered;
  })();

  return bootstrapPromise;
}

export function teardownPlatformWebMcpTools(): void {
  abortController?.abort();
  abortController = null;
  bootstrapPromise = null;
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    teardownPlatformWebMcpTools();
  });
}

declare global {
  interface Window {
    __bizgridWebMcp?: {
      ensure: () => Promise<string[]>;
      getTools: () => Promise<unknown>;
    };
  }
}

if (typeof window !== "undefined") {
  window.__bizgridWebMcp = {
    ensure: ensurePlatformWebMcpTools,
    getTools: async () => {
      await ensurePlatformWebMcpTools();
      return getModelContext()?.getTools?.() ?? [];
    },
  };
}
