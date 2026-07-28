import { getToken } from "@/lib/api/client";
import { INFORMATIONAL_TOOL_NAMES } from "../agentThinking";
import type { WebsiteBuilderContext, WebsiteBuilderToolDef } from "../types";
import type { OpenAiToolSchema } from "./ExecutorAgent";

const REALTIME_MODEL = "gpt-realtime-mini";
const REALTIME_CALLS_URL = "https://api.openai.com/v1/realtime/calls";

export type RealtimeToolCallLog = {
  name: string;
  arguments: Record<string, unknown>;
};

export type RealtimeSessionTurnResult = {
  prose: string;
  toolCallsLog: RealtimeToolCallLog[];
  toolResultsLog: Array<Record<string, unknown>>;
  informationalReplies: string[];
};

export type RealtimeSessionLog = {
  phase: "start" | "complete" | "error" | "info";
  title: string;
  detail?: string;
  data?: Record<string, unknown>;
};

export type StartSessionInput = {
  instructions: string;
  toolDefs: WebsiteBuilderToolDef[];
  openAiTools: OpenAiToolSchema[];
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  onLog?: (entry: RealtimeSessionLog) => void;
};

type RealtimeToolDef = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (
    args: Record<string, unknown>,
    ctx: WebsiteBuilderContext,
  ) => Promise<Record<string, unknown>>;
};

type PendingResponse = {
  resolve: (value: RealtimeSessionTurnResult) => void;
  reject: (error: Error) => void;
};

/**
 * Muted OpenAI Realtime session (text + tools only, no mic/speaker).
 *
 * Lifecycle:
 *   startSession() → sendMessage()… → stopSession()
 *
 * Ephemeral client secrets come from Laravel OpenTokenController via /api/open-token.
 */
export class SessionManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private isSessionActive = false;
  private startPromise: Promise<void> | null = null;
  private tools: RealtimeToolDef[] = [];
  private openAiTools: OpenAiToolSchema[] = [];
  private instructions = "";
  private ctx: WebsiteBuilderContext | null = null;
  private onLog: ((entry: RealtimeSessionLog) => void) | null = null;

  private pending: PendingResponse | null = null;
  private prose = "";
  private toolCallsLog: RealtimeToolCallLog[] = [];
  private toolResultsLog: Array<Record<string, unknown>> = [];
  private informationalReplies: string[] = [];
  private outstandingToolCalls = 0;
  private responseHadTools = false;
  private turnFinished = false;
  private sessionReady: {
    resolve: () => void;
    reject: (error: Error) => void;
  } | null = null;

  private functionCallArgs = new Map<
    string,
    { name: string; arguments: string; callId: string }
  >();

  isActive(): boolean {
    return this.isSessionActive && this.dataChannel?.readyState === "open";
  }

  /**
   * Mint ephemeral token, open muted WebRTC, register tools/instructions.
   * Safe to call when already active (no-op). Concurrent callers share one promise.
   */
  async startSession(input: StartSessionInput): Promise<void> {
    if (this.isActive()) {
      // Already live — refresh tools/instructions without reminting.
      this.applyLocalConfig({ ...input, history: undefined });
      await this.pushSessionConfig();
      return;
    }
    if (this.startPromise) return this.startPromise;

    this.startPromise = this.startSessionInternal(input).finally(() => {
      this.startPromise = null;
    });
    return this.startPromise;
  }

  /**
   * Update tools/instructions on an open session (no open-token, no reconnect).
   */
  async refreshConfig(input: Omit<StartSessionInput, "history">): Promise<void> {
    if (!this.isActive()) {
      throw new Error("Realtime session is not started. Call startSession() first.");
    }
    this.applyLocalConfig(input);
    await this.pushSessionConfig();
    this.onLog?.({
      phase: "info",
      title: "Realtime session config refreshed",
      detail: `${this.openAiTools.length} tool(s)`,
    });
  }

  private applyLocalConfig(input: {
    instructions: string;
    toolDefs: WebsiteBuilderToolDef[];
    openAiTools: OpenAiToolSchema[];
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    onLog?: (entry: RealtimeSessionLog) => void;
  }) {
    if (input.onLog) this.onLog = input.onLog;
    this.tools = input.toolDefs.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
      handler: tool.handler,
    }));
    this.openAiTools = input.openAiTools;

    const history = input.history ?? [];
    const historyBlock =
      history.length > 0
        ? `\n\n### Recent conversation\n${history
            .slice(-12)
            .map((entry) => `${entry.role}: ${entry.content}`)
            .join("\n")}`
        : "";
    // Only fold history into instructions on cold start; live session keeps its own transcript.
    this.instructions = historyBlock
      ? `${input.instructions}${historyBlock}`
      : input.instructions;
  }

  private async pushSessionConfig(): Promise<void> {
    await this.sendSessionUpdate({
      type: "realtime",
      model: REALTIME_MODEL,
      instructions: this.instructions,
      output_modalities: ["text"],
      tools: this.formatTools(this.openAiTools),
      tool_choice: this.openAiTools.length ? "auto" : "none",
      audio: {
        input: {
          turn_detection: null,
        },
      },
    });
  }

  private async startSessionInternal(input: StartSessionInput): Promise<void> {
    this.applyLocalConfig(input);

    this.onLog?.({
      phase: "start",
      title: "Starting muted Realtime session",
      detail: "Minting ephemeral token…",
    });

    try {
      if (this.peerConnection || this.dataChannel) {
        this.cleanup();
      }

      const ephemeralKey = await this.fetchEphemeralToken(this.instructions);
      await this.connectMuted(ephemeralKey);
      await this.pushSessionConfig();

      this.onLog?.({
        phase: "complete",
        title: "Realtime session ready",
        detail: `${this.openAiTools.length} tool(s) registered`,
      });
    } catch (error) {
      this.cleanup();
      this.onLog?.({
        phase: "error",
        title: "Failed to start Realtime session",
        detail: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /**
   * Send one merchant message on an already-started session and wait for tools + final text.
   */
  async sendMessage(input: {
    userMessage: string;
    ctx: WebsiteBuilderContext;
  }): Promise<RealtimeSessionTurnResult> {
    if (!this.isActive()) {
      throw new Error("Realtime session is not started. Call startSession() first.");
    }

    this.ctx = input.ctx;
    this.prose = "";
    this.toolCallsLog = [];
    this.toolResultsLog = [];
    this.informationalReplies = [];
    this.outstandingToolCalls = 0;
    this.responseHadTools = false;
    this.turnFinished = false;
    this.functionCallArgs.clear();

    this.onLog?.({
      phase: "info",
      title: "Sending message",
      detail: input.userMessage.slice(0, 280),
    });

    this.sendClientEvent({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: input.userMessage }],
      },
    });

    this.sendClientEvent({
      type: "response.create",
      response: { output_modalities: ["text"] },
    });

    try {
      const result = await this.waitForTurnComplete();
      this.onLog?.({
        phase: "complete",
        title: "Turn finished",
        detail: `${result.toolCallsLog.length} tool call(s)`,
      });
      return result;
    } catch (error) {
      this.onLog?.({
        phase: "error",
        title: "Turn failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  /** Tear down WebRTC + data channel. Safe to call multiple times. */
  stopSession(): void {
    if (this.pending && !this.turnFinished) {
      this.pending.reject(new Error("Realtime session stopped"));
      this.pending = null;
    }
    this.cleanup();
    this.onLog?.({
      phase: "complete",
      title: "Realtime session stopped",
    });
  }

  private async fetchEphemeralToken(prompt: string): Promise<string> {
    const authToken = getToken();
    if (!authToken) {
      throw new Error("Not authenticated — cannot mint realtime token.");
    }

    const res = await fetch("/api/open-token", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        prompt,
        muted: true,
        model: REALTIME_MODEL,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const message =
        (typeof data.error === "string" && data.error) ||
        (typeof data.message === "string" && data.message) ||
        `Failed to mint realtime token (${res.status})`;
      throw new Error(message);
    }

    const token =
      (typeof data.value === "string" && data.value) ||
      (typeof (data.client_secret as { value?: unknown } | undefined)?.value === "string"
        ? (data.client_secret as { value: string }).value
        : null);

    if (!token) {
      throw new Error("Open token response missing client secret value");
    }

    return token;
  }

  private async connectMuted(ephemeralKey: string): Promise<void> {
    if (typeof window === "undefined" || typeof RTCPeerConnection === "undefined") {
      throw new Error("Realtime WebRTC requires a browser environment.");
    }

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    this.peerConnection = pc;

    // SDP still needs an audio m-line; recvonly keeps mic permission off (muted).
    pc.addTransceiver("audio", { direction: "recvonly" });

    // Intentionally ignore remote audio tracks — session is muted.
    pc.ontrack = () => {};

    const dc = pc.createDataChannel("oai-events", {
      ordered: true,
      maxRetransmits: 3,
    });
    this.dataChannel = dc;
    this.setupDataChannel(dc);

    const readyPromise = new Promise<void>((resolve, reject) => {
      this.sessionReady = { resolve, reject };
      window.setTimeout(() => {
        if (this.sessionReady) {
          this.sessionReady.reject(new Error("Timed out waiting for Realtime data channel"));
          this.sessionReady = null;
        }
      }, 15_000);
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpResponse = await fetch(`${REALTIME_CALLS_URL}?model=${REALTIME_MODEL}`, {
      method: "POST",
      body: offer.sdp ?? "",
      headers: {
        Authorization: `Bearer ${ephemeralKey}`,
        "Content-Type": "application/sdp",
      },
    });

    if (!sdpResponse.ok) {
      const errorText = await sdpResponse.text();
      throw new Error(`Failed to establish Realtime call: ${errorText}`);
    }

    const answerSdp = await sdpResponse.text();
    await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    await readyPromise;
    this.isSessionActive = true;
  }

  private setupDataChannel(dc: RTCDataChannel) {
    dc.addEventListener("open", () => {
      this.isSessionActive = true;
      this.sessionReady?.resolve();
      this.sessionReady = null;
    });

    dc.addEventListener("close", () => {
      this.isSessionActive = false;
      if (this.pending && !this.turnFinished) {
        this.pending.reject(new Error("Realtime data channel closed"));
        this.pending = null;
      }
    });

    dc.addEventListener("error", () => {
      this.sessionReady?.reject(new Error("Realtime data channel error"));
      this.sessionReady = null;
      if (this.pending && !this.turnFinished) {
        this.pending.reject(new Error("Realtime data channel error"));
        this.pending = null;
      }
    });

    dc.addEventListener("message", (event) => {
      void this.handleServerEvent(event.data);
    });
  }

  private async handleServerEvent(raw: unknown) {
    let message: Record<string, unknown>;
    try {
      message = typeof raw === "string" ? JSON.parse(raw) : (raw as Record<string, unknown>);
    } catch {
      return;
    }

    const type = String(message.type ?? "");

    if (type === "error") {
      const err = message.error as { message?: string } | undefined;
      const detail = err?.message ?? "Realtime API error";
      this.onLog?.({ phase: "error", title: "Realtime error", detail });
      if (this.pending) {
        this.pending.reject(new Error(detail));
        this.pending = null;
      }
      return;
    }

    if (type === "response.created") {
      this.responseHadTools = false;
      return;
    }

    if (type === "response.output_text.delta" || type === "response.text.delta") {
      const delta = typeof message.delta === "string" ? message.delta : "";
      if (delta) this.prose += delta;
      return;
    }

    if (type === "response.output_text.done" || type === "response.text.done") {
      const finalText = typeof message.text === "string" ? message.text : "";
      if (finalText) this.prose = finalText;
      return;
    }

    if (type === "response.function_call_arguments.delta") {
      const itemId = String(message.item_id ?? "");
      const delta = typeof message.delta === "string" ? message.delta : "";
      const existing = this.functionCallArgs.get(itemId);
      if (existing) {
        existing.arguments += delta;
      } else {
        this.functionCallArgs.set(itemId, {
          name: String(message.name ?? ""),
          arguments: delta,
          callId: String(message.call_id ?? ""),
        });
      }
      return;
    }

    if (type === "response.function_call_arguments.done") {
      const itemId = String(message.item_id ?? "");
      const name = String(message.name ?? "");
      const callId = String(message.call_id ?? "");
      const argsJson = typeof message.arguments === "string" ? message.arguments : "{}";
      this.functionCallArgs.set(itemId, {
        name,
        arguments: argsJson,
        callId,
      });
      return;
    }

    if (type === "response.output_item.done") {
      const item = message.item as Record<string, unknown> | undefined;
      if (item?.type === "function_call") {
        this.responseHadTools = true;
        await this.executeFunctionCall(item);
      }
      return;
    }

    if (type === "response.done") {
      if (this.responseHadTools || this.outstandingToolCalls > 0) return;
      this.finishTurn();
    }
  }

  private async executeFunctionCall(item: Record<string, unknown>) {
    const name = String(item.name ?? "");
    const callId = String(item.call_id ?? "");
    const argsJson =
      typeof item.arguments === "string"
        ? item.arguments
        : this.functionCallArgs.get(String(item.id ?? ""))?.arguments ?? "{}";

    if (!name || !callId || !this.ctx) return;

    this.outstandingToolCalls += 1;
    this.onLog?.({
      phase: "info",
      title: `Calling tool: ${name}`,
      detail: "Executing…",
    });

    let parsed: Record<string, unknown> = {};
    try {
      parsed = argsJson ? JSON.parse(argsJson) : {};
    } catch {
      parsed = {};
    }

    this.toolCallsLog.push({ name, arguments: parsed });

    const def = this.tools.find((tool) => tool.name === name);
    let result: Record<string, unknown>;
    if (!def) {
      result = { ok: false, error: `Unknown tool: ${name}` };
    } else {
      try {
        result = await def.handler(parsed, this.ctx);
      } catch (error) {
        result = {
          ok: false,
          error: error instanceof Error ? error.message : "Tool execution failed",
        };
      }
    }

    this.toolResultsLog.push({ name, ...result });
    if (INFORMATIONAL_TOOL_NAMES.has(name) && this.ctx.assistantMessage.trim()) {
      this.informationalReplies.push(this.ctx.assistantMessage.trim());
    }

    this.onLog?.({
      phase: "complete",
      title: `Tool finished: ${name}`,
      data: { name, arguments: parsed, result },
    });

    this.sendClientEvent({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify(result ?? {}),
      },
    });

    this.outstandingToolCalls = Math.max(0, this.outstandingToolCalls - 1);
    this.sendClientEvent({
      type: "response.create",
      response: { output_modalities: ["text"] },
    });
  }

  private waitForTurnComplete(): Promise<RealtimeSessionTurnResult> {
    return new Promise((resolve, reject) => {
      this.pending = { resolve, reject };
      window.setTimeout(() => {
        if (this.pending) {
          this.pending.reject(new Error("Realtime turn timed out"));
          this.pending = null;
        }
      }, 180_000);
    });
  }

  private finishTurn() {
    if (this.turnFinished || !this.pending) return;
    this.turnFinished = true;
    if (this.ctx && this.prose.trim() && !this.ctx.assistantMessage.trim()) {
      this.ctx.assistantMessage = this.prose.trim();
    }
    this.pending.resolve({
      prose: this.prose.trim(),
      toolCallsLog: this.toolCallsLog,
      toolResultsLog: this.toolResultsLog,
      informationalReplies: this.informationalReplies,
    });
    this.pending = null;
  }

  private formatTools(openAiTools: OpenAiToolSchema[]) {
    return openAiTools.map((tool) => ({
      type: "function",
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters,
    }));
  }

  private async sendSessionUpdate(session: Record<string, unknown>) {
    this.sendClientEvent({ type: "session.update", session });
  }

  private sendClientEvent(message: Record<string, unknown>) {
    if (!this.dataChannel || this.dataChannel.readyState !== "open") return;
    this.dataChannel.send(JSON.stringify(message));
  }

  private cleanup() {
    try {
      this.dataChannel?.close();
    } catch {
      // ignore
    }
    this.dataChannel = null;

    try {
      this.peerConnection?.getSenders().forEach((sender) => sender.track?.stop());
      this.peerConnection?.close();
    } catch {
      // ignore
    }
    this.peerConnection = null;
    this.isSessionActive = false;
    this.sessionReady = null;
  }
}

export default SessionManager;
