import { createPlatformWebMcpTools } from "@/lib/webmcp/platform-tools";
import { getModelContext, registerWebMcpTools } from "./model-context";

const WEBMCP_LOG_PREFIX = "[bizgrid/webmcp]";

const WAIT_TIMEOUT_MS = 20_000;
const WAIT_POLL_MS = 250;

let bootstrapPromise: Promise<string[]> | null = null;
let abortController: AbortController | null = null;
let rebroadcastTimers: number[] = [];
let visibilityWired = false;

function waitForModelContext(timeoutMs = WAIT_TIMEOUT_MS): Promise<ReturnType<typeof getModelContext>> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    let settled = false;

    const finish = (context: ReturnType<typeof getModelContext>) => {
      if (settled) return;
      settled = true;
      resolve(context);
    };

    // Fast frame-based checks for the common case (context ready at load).
    const tick = () => {
      if (settled) return;
      const context = getModelContext();
      if (context || Date.now() - startedAt >= timeoutMs) {
        finish(context);
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();

    // Slower time-based fallback in case rAF is throttled or the browser
    // injects modelContext long after load (e.g. ChatGPT's in-app browser).
    const interval = window.setInterval(() => {
      const context = getModelContext();
      if (settled || context || Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(interval);
        finish(context);
      }
    }, WAIT_POLL_MS);
  });
}

function dispatchToolChange() {
  const event = new Event("toolchange");

  try {
    document.dispatchEvent(event);
  } catch {
    // Ignore; some browsers expose the event on modelContext instead.
  }

  try {
    window.dispatchEvent(event);
  } catch {
    // Ignore.
  }

  const context = getModelContext();
  const withDispatch = context as (NonNullable<typeof context> & {
    dispatchEvent?: (event: Event) => boolean;
  }) | null;
  try {
    withDispatch?.dispatchEvent?.(event);
  } catch {
    // Ignore.
  }
}

/**
 * ChatGPT's in-app browser can take its site-tool snapshot before (or right
 * after) registration finishes, so a single `toolchange` event can be missed.
 * Re-broadcast a few times so late-attaching browsers still discover the tools.
 */
function scheduleToolChangeRebroadcasts() {
  for (const timer of rebroadcastTimers) {
    window.clearTimeout(timer);
  }
  rebroadcastTimers = [500, 2_000, 5_000, 15_000].map((delay) =>
    window.setTimeout(dispatchToolChange, delay),
  );
}

function wireVisibilityRebroadcast() {
  if (visibilityWired) return;
  visibilityWired = true;

  const rebroadcast = () => {
    if (getModelContext()) {
      dispatchToolChange();
    }
  };

  document.addEventListener("visibilitychange", rebroadcast, { once: false });
  window.addEventListener("focus", rebroadcast, { once: false });
  window.addEventListener("pageshow", rebroadcast, { once: false });
}

/**
 * If the browser already snapshotted tools before we finished registering,
 * re-register any tool names missing from getTools() so the agent can still
 * discover them on its next snapshot.
 */
async function reRegisterMissingTools(
  context: NonNullable<ReturnType<typeof getModelContext>>,
  registered: string[],
): Promise<string[]> {
  if (typeof context.getTools !== "function" || registered.length === 0) {
    return registered;
  }

  try {
    const current = (await context.getTools()) as Array<{ name?: string }>;
    const currentNames = new Set(
      current.map((tool) => tool?.name).filter((name): name is string => typeof name === "string"),
    );
    if (currentNames.size === 0) return registered;

    const missing = registered.filter((name) => !currentNames.has(name));
    if (missing.length === 0) return registered;

    const tools = createPlatformWebMcpTools().filter((tool) => missing.includes(tool.name));
    await registerWebMcpTools(tools, abortController?.signal ?? new AbortController().signal);

    console.info(WEBMCP_LOG_PREFIX, `Re-registered ${missing.length} missing tool(s):`, missing.join(", "));
  } catch {
    // getTools() can be unavailable/empty in ChatGPT's app shell — non-fatal.
  }

  return registered;
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
        // Some WebMCP implementations don't accept the options object. Retry
        // without it before giving up on the tool.
        try {
          await context.registerTool({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            execute: tool.execute,
            ...(tool.annotations ? { annotations: tool.annotations } : {}),
          });
          registered.push(tool.name);
        } catch (retryError) {
          failed.push({ name: tool.name, error: retryError ?? error });
        }
      }
    }

    if (registered.length > 0) {
      dispatchToolChange();
      scheduleToolChangeRebroadcasts();
      wireVisibilityRebroadcast();
      console.info(WEBMCP_LOG_PREFIX, `Registered ${registered.length} tool(s):`, registered.join(", "));
      await reRegisterMissingTools(context, registered);
      dispatchToolChange();
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

  for (const timer of rebroadcastTimers) {
    window.clearTimeout(timer);
  }
  rebroadcastTimers = [];
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
