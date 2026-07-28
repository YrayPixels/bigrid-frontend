import {
  appendMemory,
  INFORMATIONAL_TOOL_NAMES,
  summarizeToolResult,
} from "./agentThinking";
import type { WebsiteBuilderContext, WebsiteBuilderToolDef } from "./types";
import type { SessionAgent } from "./roles/SessionAgent";
import type {
  ExecutorChatMessage,
  ExecutorToolCall,
  OpenAiToolSchema,
} from "./roles/ExecutorAgent";

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

/**
 * Text-only streaming session loop (SessionManager-style, no voice).
 * Streams each model step, executes tools as soon as the step completes, continues.
 */
export class BuilderSessionManager {
  constructor(
    private readonly sessionAgent: SessionAgent,
    private readonly toolDefs: WebsiteBuilderToolDef[],
    private readonly openAiTools: OpenAiToolSchema[],
    private readonly onLog: (entry: BuilderSessionLoopLog) => void,
  ) {}

  async runLoop(input: {
    messages: ExecutorChatMessage[];
    ctx: WebsiteBuilderContext;
    retryHint?: string;
    maxIterations?: number;
  }): Promise<BuilderSessionLoopResult> {
    const { messages, ctx, retryHint, maxIterations = 8 } = input;
    let memory: string[] = [];
    const toolCallsLog: Array<{ name: string; arguments: Record<string, unknown> }> = [];
    const toolResultsLog: Array<Record<string, unknown>> = [];
    const informationalReplies: string[] = [];
    const announcedToolNames = new Set<string>();

    this.onLog({
      agent: "Session",
      phase: "start",
      title: retryHint ? "Retrying with critic feedback" : "Running streaming session",
      detail: retryHint?.slice(0, 280) ?? ctx.message.trim().slice(0, 280),
    });

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      announcedToolNames.clear();
      const decision = await this.sessionAgent
        .runStream({
          messages,
          tools: this.openAiTools,
          retryHint: iteration === 0 ? retryHint : undefined,
          onToolCallDelta: (partial) => {
            if (!partial.name || announcedToolNames.has(partial.name)) return;
            announcedToolNames.add(partial.name);
            this.onLog({
              agent: "Session",
              phase: "info",
              title: `Streaming tool: ${partial.name}`,
              detail: "Receiving arguments…",
            });
          },
        })
        .catch((error) => {
          this.onLog({
            agent: "Session",
            phase: "error",
            title: "Session agent failed",
            detail: error instanceof Error ? error.message : "Unknown error",
          });
          return null;
        });

      if (!decision) break;

      if (!decision.toolCalls.length) {
        if (decision.prose) ctx.assistantMessage = decision.prose;
        this.onLog({
          agent: "Session",
          phase: "complete",
          title: "Agent replied without tools",
          detail: decision.prose.slice(0, 280) || undefined,
        });
        if (decision.prose && !ctx.profile.pending_action && !toolCallsLog.length) {
          // Caller handles pending clarification from prose-only replies.
        }
        break;
      }

      this.onLog({
        agent: "Session",
        phase: "info",
        title: `Calling ${decision.toolCalls.length} tool(s)`,
        data: {
          tool_calls: decision.toolCalls.map((call) => ({
            name: call.function?.name,
            arguments: call.function?.arguments,
          })),
        },
      });

      let lastFailedWithMessage = false;
      for (const toolCall of decision.toolCalls) {
        const outcome = await this.executeToolCall(toolCall, {
          messages,
          ctx,
          toolCallsLog,
          toolResultsLog,
          informationalReplies,
        });
        memory = appendMemory(memory, outcome.summary);
        if (outcome.failedWithMessage) lastFailedWithMessage = true;
      }

      if (lastFailedWithMessage) {
        this.onLog({
          agent: "Session",
          phase: "error",
          title: "Tool failed — stopping",
          detail: ctx.assistantMessage.slice(0, 280),
        });
        break;
      }
    }

    this.onLog({
      agent: "Session",
      phase: "complete",
      title: "Session agent finished",
      detail: `${toolCallsLog.length} tool call(s)`,
    });

    return { memory, toolCallsLog, toolResultsLog, informationalReplies };
  }

  private async executeToolCall(
    toolCall: ExecutorToolCall,
    state: {
      messages: ExecutorChatMessage[];
      ctx: WebsiteBuilderContext;
      toolCallsLog: Array<{ name: string; arguments: Record<string, unknown> }>;
      toolResultsLog: Array<Record<string, unknown>>;
      informationalReplies: string[];
    },
  ): Promise<{ summary: string; failedWithMessage: boolean }> {
    const { messages, ctx, toolCallsLog, toolResultsLog, informationalReplies } = state;
    const name = toolCall.function?.name;
    const callId = toolCall.id;
    if (!name || !callId) {
      return { summary: "[tool:unknown] skipped", failedWithMessage: false };
    }

    const def = this.toolDefs.find((tool) => tool.name === name);
    let parsed: Record<string, unknown> = {};
    try {
      parsed = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
    } catch {
      parsed = {};
    }

    toolCallsLog.push({ name, arguments: parsed });

    if (!def) {
      messages.push({
        role: "tool",
        tool_call_id: callId,
        content: JSON.stringify({ error: `Unknown tool: ${name}` }),
      });
      return { summary: `[tool:${name}] error: unknown tool`, failedWithMessage: false };
    }

    const result = await def.handler(parsed, ctx);
    toolResultsLog.push({ name, ...result });
    messages.push({ role: "tool", tool_call_id: callId, content: JSON.stringify(result) });
    const summary = summarizeToolResult(name, result);

    if (INFORMATIONAL_TOOL_NAMES.has(name) && ctx.assistantMessage.trim()) {
      informationalReplies.push(ctx.assistantMessage.trim());
    }

    this.onLog({
      agent: "Session",
      phase: "complete",
      title: `Tool finished: ${name}`,
      detail: summary,
      data: { name, arguments: parsed, result },
    });

    return {
      summary,
      failedWithMessage: result.ok === false && Boolean(ctx.assistantMessage),
    };
  }
}
