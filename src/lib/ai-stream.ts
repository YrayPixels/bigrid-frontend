type StreamDeltaHandler = (delta: string) => void;

export type StreamedToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type StreamedChatCompletion = {
  text: string;
  toolCalls: StreamedToolCall[];
  finishReason?: string | null;
};

export type ChatCompletionStreamHandlers = {
  onContentDelta?: (delta: string) => void;
  onToolCallDelta?: (partial: {
    index: number;
    id?: string;
    name?: string;
    argumentsDelta?: string;
  }) => void;
};

type ToolCallPartial = {
  id?: string;
  type?: "function";
  function: { name?: string; arguments?: string };
};

function parseOpenAiSseLine(line: string, onDelta: StreamDeltaHandler): void {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data:")) return;

  const payload = trimmed.slice(5).trim();
  if (!payload || payload === "[DONE]") return;

  try {
    const parsed = JSON.parse(payload) as {
      choices?: Array<{ delta?: { content?: string | null } }>;
    };
    const delta = parsed.choices?.[0]?.delta?.content;
    if (typeof delta === "string" && delta.length > 0) {
      onDelta(delta);
    }
  } catch {
    // Ignore malformed chunks.
  }
}

function parseAiSdkDataLine(line: string, onDelta: StreamDeltaHandler): void {
  const trimmed = line.trimEnd();
  if (!trimmed.startsWith("0:")) return;

  try {
    const delta = JSON.parse(trimmed.slice(2)) as string;
    if (typeof delta === "string" && delta.length > 0) {
      onDelta(delta);
    }
  } catch {
    // Ignore malformed chunks.
  }
}

export async function consumeAiStream(
  body: ReadableStream<Uint8Array>,
  onDelta: StreamDeltaHandler,
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const newlineIdx = buffer.indexOf("\n");
      if (newlineIdx === -1) break;
      const line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);

      if (!line.trim()) continue;

      const before = fullText.length;
      parseOpenAiSseLine(line, (delta) => {
        fullText += delta;
        onDelta(delta);
      });
      if (fullText.length === before) {
        parseAiSdkDataLine(line, (delta) => {
          fullText += delta;
          onDelta(delta);
        });
      }
    }
  }

  return fullText;
}

/**
 * Consume OpenAI Chat Completions SSE (content + tool_calls).
 * Also accepts AI SDK `0:"delta"` lines for content-only fallbacks.
 */
export async function consumeAiChatCompletionStream(
  body: ReadableStream<Uint8Array>,
  handlers: ChatCompletionStreamHandlers = {},
): Promise<StreamedChatCompletion> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  let finishReason: string | null | undefined;
  const toolPartials = new Map<number, ToolCallPartial>();
  const announcedNames = new Set<number>();

  const applyOpenAiChunk = (payload: string) => {
    if (!payload || payload === "[DONE]") return;
    try {
      const parsed = JSON.parse(payload) as {
        choices?: Array<{
          finish_reason?: string | null;
          delta?: {
            content?: string | null;
            tool_calls?: Array<{
              index?: number;
              id?: string;
              type?: string;
              function?: { name?: string; arguments?: string };
            }>;
          };
        }>;
      };
      const choice = parsed.choices?.[0];
      if (!choice) return;

      if (choice.finish_reason) {
        finishReason = choice.finish_reason;
      }

      const content = choice.delta?.content;
      if (typeof content === "string" && content.length > 0) {
        fullText += content;
        handlers.onContentDelta?.(content);
      }

      const toolDeltas = choice.delta?.tool_calls;
      if (!Array.isArray(toolDeltas)) return;

      for (const delta of toolDeltas) {
        const index = typeof delta.index === "number" ? delta.index : 0;
        const existing = toolPartials.get(index) ?? { function: {} };
        if (typeof delta.id === "string" && delta.id) existing.id = delta.id;
        if (delta.type === "function") existing.type = "function";
        if (typeof delta.function?.name === "string" && delta.function.name) {
          existing.function.name = (existing.function.name ?? "") + delta.function.name;
        }
        if (typeof delta.function?.arguments === "string" && delta.function.arguments) {
          existing.function.arguments =
            (existing.function.arguments ?? "") + delta.function.arguments;
        }
        toolPartials.set(index, existing);

        handlers.onToolCallDelta?.({
          index,
          id: existing.id,
          name: existing.function.name,
          argumentsDelta: delta.function?.arguments,
        });

        if (existing.function.name && !announcedNames.has(index)) {
          announcedNames.add(index);
        }
      }
    } catch {
      // Ignore malformed chunks.
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const newlineIdx = buffer.indexOf("\n");
      if (newlineIdx === -1) break;
      const line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      if (!line.trim()) continue;

      const trimmed = line.trim();
      if (trimmed.startsWith("data:")) {
        applyOpenAiChunk(trimmed.slice(5).trim());
        continue;
      }

      // Content-only AI SDK fallback (no tool_calls in this format).
      parseAiSdkDataLine(line, (delta) => {
        fullText += delta;
        handlers.onContentDelta?.(delta);
      });
    }
  }

  const toolCalls: StreamedToolCall[] = [...toolPartials.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, partial], fallbackIndex) => ({
      id: partial.id || `call_${fallbackIndex}`,
      type: "function" as const,
      function: {
        name: partial.function.name ?? "",
        arguments: partial.function.arguments ?? "{}",
      },
    }))
    .filter((call) => call.function.name.length > 0);

  return { text: fullText, toolCalls, finishReason };
}
