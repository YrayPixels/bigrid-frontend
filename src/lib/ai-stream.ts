type StreamDeltaHandler = (delta: string) => void;

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
