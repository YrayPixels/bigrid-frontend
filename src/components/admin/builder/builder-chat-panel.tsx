"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import type { BuilderMessage, BuilderSession } from "@/lib/api/types";
import { BuilderMessageWidgets } from "@/components/admin/builder/builder-message-widgets";

const SUGGESTED_PROMPTS = [
  "I want a premium organic skincare website for busy professionals.",
  "Build a bold streetwear clothing website with editorial vibes.",
  "I sell handmade candles and need a warm, simple online shop.",
];

export function BuilderChatPanel({
  session,
  sending,
  generating,
  onSendMessage,
}: {
  session: BuilderSession;
  sending: boolean;
  generating: boolean;
  onSendMessage: (message: string) => void;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const brandColor = session.store?.brand_color ?? session.business_profile.brand_color ?? "#0E7C66";

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollToBottom = () => {
      container.scrollTop = container.scrollHeight;
    };

    scrollToBottom();

    const observer = new ResizeObserver(scrollToBottom);
    observer.observe(container);
    return () => observer.disconnect();
  }, [session.messages, sending, generating]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || sending) return;
    setInput("");
    onSendMessage(message);
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="shrink-0 border-b border-border px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-medium text-ink-soft">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Website Builder
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          Describe your business and the AI will design and build your website for you.
        </p>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {session.messages.map((message) => (
          <ChatBubble key={message.id} message={message} brandColor={brandColor} />
        ))}
        {sending || generating ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs text-ink-soft">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {generating ? "Building your website..." : "Thinking..."}
          </div>
        ) : null}

        {!session.messages.length ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Try one of these</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onSendMessage(prompt)}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-left text-xs text-ink-soft hover:border-primary/40 hover:text-ink"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 border-t border-border p-4">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={2}
            placeholder={
              session.storefront_snapshot
                ? 'Try "Make the homepage more premium" or "Change the CTA to Shop the Collection"'
                : "Tell me about your business and say “build my website” when you're ready..."
            }
            className="min-h-[72px] flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending || generating}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-ink text-background disabled:opacity-50"
            aria-label="Send message"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </div>
  );
}

function ChatBubble({
  message,
  brandColor,
}: {
  message: BuilderMessage;
  brandColor: string;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 ${
          isUser ? "bg-ink text-background" : "bg-secondary text-ink"
        }`}
      >
        {message.content}
        {!isUser ? <BuilderMessageWidgets message={message} brandColor={brandColor} /> : null}
      </div>
    </div>
  );
}
