import type {
  BuilderSession,
  StorefrontTemplateOption,
  StorefrontTemplateRecommendation,
} from "@/lib/api/types";
import { StorefrontBuilderManager } from "@/lib/storefront-builder/agents/StorefrontBuilderManager";
import { encodeThinkingStreamEvent } from "@/lib/storefront-builder/agents/thinking-log";

type StreamRequest = {
  message: string;
  session: BuilderSession;
  recommendations: StorefrontTemplateRecommendation[];
  template_options: StorefrontTemplateOption[];
  history?: Array<{ role: "user" | "assistant"; content: string }>;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as StreamRequest | null;

  if (!body?.message?.trim() || !body.session) {
    return new Response(JSON.stringify({ message: "Invalid request." }), { status: 422 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = (event: Parameters<typeof encodeThinkingStreamEvent>[0]) => {
        controller.enqueue(encoder.encode(encodeThinkingStreamEvent(event)));
      };

      try {
        const manager = new StorefrontBuilderManager(undefined, (entry) => {
          push({ type: "log", entry });
        });

        const turn = await manager.runTurn({
          message: body.message,
          session: body.session,
          recommendations: body.recommendations ?? [],
          templateOptions: body.template_options ?? [],
          history: body.history,
        });

        push({ type: "complete", turn: turn as unknown as Record<string, unknown> });
      } catch (error) {
        push({
          type: "error",
          message: error instanceof Error ? error.message : "Thinking stream failed.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
