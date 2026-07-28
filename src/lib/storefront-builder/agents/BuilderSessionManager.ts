import {
  appendMemory,
  summarizeToolResult,
} from "./agentThinking";
import type { WebsiteBuilderContext, WebsiteBuilderToolDef } from "./types";
import type { SessionAgent } from "./roles/SessionAgent";
import type {
  ExecutorChatMessage,
  OpenAiToolSchema,
} from "./roles/ExecutorAgent";
import { SessionManager } from "./roles/SessionManager";

export type BuilderSessionLoopLog = {
  agent: "Session";
  phase: "start" | "complete" | "error" | "info";
  title: string;
  detail?: string;
  data?: Record<string, unknown>;
};

export type BuilderSessionLoopResult = {
  memory: string[];
  toolCallsLog: Array<{ name: string; arguments: Record<string, unknown> }>;
  toolResultsLog: Array<Record<string, unknown>>;
  informationalReplies: string[];
};

type SharedRealtimeSlot = {
  builderSessionId: string;
  manager: BuilderSessionManager;
};

/** One muted Realtime connection shared across merchant messages for a builder session. */
let sharedRealtime: SharedRealtimeSlot | null = null;

export function stopSharedBuilderRealtimeSession(): void {
  sharedRealtime?.manager.stop();
  sharedRealtime = null;
}

export function getSharedBuilderRealtimeSession(): BuilderSessionManager | null {
  return sharedRealtime?.manager?.isActive() ? sharedRealtime.manager : null;
}

export function isSharedBuilderRealtimeActive(builderSessionId?: string): boolean {
  if (!sharedRealtime?.manager.isActive()) return false;
  if (builderSessionId && sharedRealtime.builderSessionId !== builderSessionId) return false;
  return true;
}

/**
 * Owns one muted Realtime SessionManager.
 * Reused across messages via ensureShared() — open-token only on cold start.
 */
export class BuilderSessionManager {
  private readonly session = new SessionManager();
  private started = false;
  private toolDefs: WebsiteBuilderToolDef[];
  private openAiTools: OpenAiToolSchema[];
  private onLog: (entry: BuilderSessionLoopLog) => void;

  constructor(
    private readonly sessionAgent: SessionAgent,
    toolDefs: WebsiteBuilderToolDef[],
    openAiTools: OpenAiToolSchema[],
    onLog: (entry: BuilderSessionLoopLog) => void,
  ) {
    this.toolDefs = toolDefs;
    this.openAiTools = openAiTools;
    this.onLog = onLog;
  }

  /**
   * Return the shared live session for this builder session id, or create one.
   * Does not call open-token if an active session already exists for the same id.
   */
  static ensureShared(input: {
    builderSessionId: string;
    sessionAgent: SessionAgent;
    toolDefs: WebsiteBuilderToolDef[];
    openAiTools: OpenAiToolSchema[];
    onLog: (entry: BuilderSessionLoopLog) => void;
  }): BuilderSessionManager {
    const { builderSessionId, sessionAgent, toolDefs, openAiTools, onLog } = input;

    if (
      sharedRealtime &&
      sharedRealtime.builderSessionId === builderSessionId &&
      sharedRealtime.manager.isActive()
    ) {
      sharedRealtime.manager.replaceTools(toolDefs, openAiTools);
      sharedRealtime.manager.setLogHandler(onLog);
      return sharedRealtime.manager;
    }

    sharedRealtime?.manager.stop();
    const manager = new BuilderSessionManager(sessionAgent, toolDefs, openAiTools, onLog);
    sharedRealtime = { builderSessionId, manager };
    return manager;
  }

  isActive(): boolean {
    return this.started && this.session.isActive();
  }

  setLogHandler(onLog: (entry: BuilderSessionLoopLog) => void) {
    this.onLog = onLog;
  }

  replaceTools(toolDefs: WebsiteBuilderToolDef[], openAiTools: OpenAiToolSchema[]) {
    this.toolDefs = toolDefs;
    this.openAiTools = openAiTools;
  }

  private resolveInstructions(
    messages: ExecutorChatMessage[],
    foldTrailingUser: boolean,
  ): {
    instructions: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
  } {
    const systemMessage = messages.find((entry) => entry.role === "system");
    const instructions =
      systemMessage && "content" in systemMessage && typeof systemMessage.content === "string"
        ? systemMessage.content
        : this.sessionAgent.systemPrompt;

    const conversation = messages
      .filter(
        (entry): entry is { role: "user" | "assistant"; content: string } =>
          (entry.role === "user" || entry.role === "assistant") &&
          typeof entry.content === "string" &&
          entry.content.trim().length > 0,
      )
      .map((entry) => ({
        role: entry.role,
        content: entry.content,
      }));

    // When messages end with the current user turn, drop it from the folded history.
    const history = foldTrailingUser ? conversation.slice(0, -1) : conversation;

    return { instructions, history };
  }

  async start(input: {
    messages: ExecutorChatMessage[];
    /** When true (default), last user/assistant message is the current turn and is not folded into instructions. */
    foldTrailingUser?: boolean;
  }): Promise<void> {
    const foldTrailingUser = input.foldTrailingUser !== false;
    const { instructions, history } = this.resolveInstructions(input.messages, foldTrailingUser);
    const logBridge = (entry: {
      phase: BuilderSessionLoopLog["phase"];
      title: string;
      detail?: string;
      data?: Record<string, unknown>;
    }) =>
      this.onLog({
        agent: "Session",
        phase: entry.phase,
        title: entry.title,
        detail: entry.detail,
        data: entry.data,
      });

    if (this.isActive()) {
      // Live session: refresh tools/instructions only — no open-token.
      await this.session.refreshConfig({
        instructions,
        toolDefs: this.toolDefs,
        openAiTools: this.openAiTools,
        onLog: logBridge,
      });
      return;
    }

    this.onLog({
      agent: "Session",
      phase: "start",
      title: "Starting muted Realtime session",
    });

    await this.session.startSession({
      instructions,
      toolDefs: this.toolDefs,
      openAiTools: this.openAiTools,
      history,
      onLog: logBridge,
    });

    this.started = true;
  }

  async runLoop(input: {
    messages: ExecutorChatMessage[];
    ctx: WebsiteBuilderContext;
    retryHint?: string;
  }): Promise<BuilderSessionLoopResult> {
    const { messages, ctx, retryHint } = input;

    await this.start({ messages });

    let userMessage = ctx.message.trim();
    if (retryHint?.trim()) {
      userMessage =
        `${userMessage}\n\n[internal] Critic feedback — fix this and call the correct tool(s) now:\n${retryHint.trim()}\n` +
        "Do not apologize. Do not ask permission. Act with tools when possible.";
    }

    this.onLog({
      agent: "Session",
      phase: "info",
      title: retryHint ? "Retrying on open Realtime session" : "Sending message on Realtime session",
      detail: retryHint?.slice(0, 280) ?? userMessage.slice(0, 280),
    });

    try {
      const turn = await this.session.sendMessage({ userMessage, ctx });

      if (turn.prose && !ctx.assistantMessage.trim()) {
        ctx.assistantMessage = turn.prose;
      }

      let memory: string[] = [];
      for (const result of turn.toolResultsLog) {
        memory = appendMemory(
          memory,
          summarizeToolResult(String(result.name ?? "tool"), result),
        );
      }

      this.onLog({
        agent: "Session",
        phase: "complete",
        title: "Session turn finished",
        detail: `${turn.toolCallsLog.length} tool call(s)`,
      });

      return {
        memory,
        toolCallsLog: turn.toolCallsLog,
        toolResultsLog: turn.toolResultsLog,
        informationalReplies: turn.informationalReplies,
      };
    } catch (error) {
      this.onLog({
        agent: "Session",
        phase: "error",
        title: "Realtime turn failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      });
      // Drop the shared slot if the socket died so the next message cold-starts cleanly.
      if (!this.session.isActive()) {
        this.started = false;
        if (sharedRealtime?.manager === this) {
          sharedRealtime = null;
        }
      }
      return {
        memory: [],
        toolCallsLog: [],
        toolResultsLog: [],
        informationalReplies: [],
      };
    }
  }

  stop(): void {
    this.session.stopSession();
    this.started = false;
    if (sharedRealtime?.manager === this) {
      sharedRealtime = null;
    }
  }
}
