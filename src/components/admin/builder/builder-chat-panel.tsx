"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import type { BuilderMessage, BuilderSession, StorefrontTemplateId } from "@/lib/api/types";
import { BuilderMessageWidgets } from "@/components/admin/builder/builder-message-widgets";
import { BuilderTemplateRecommendations } from "@/components/admin/builder/builder-template-recommendations";
import type { StorefrontTemplateOption } from "@/lib/api/types";

type ConcreteTemplateOption = StorefrontTemplateOption & { value: StorefrontTemplateId };

const SUGGESTED_PROMPTS = [
  "I want a premium organic skincare store for busy professionals.",
  "Create a streetwear clothing storefront with bold editorial vibes.",
  "I sell handmade candles and need a simple, warm online shop.",
];

export function BuilderChatPanel({
  session,
  templateOptions,
  sending,
  generating,
  onSendMessage,
  onSelectTemplate,
  onGenerateDraft,
}: {
  session: BuilderSession;
  templateOptions: ConcreteTemplateOption[];
  sending: boolean;
  generating: boolean;
  onSendMessage: (message: string) => void;
  onSelectTemplate: (templateId: StorefrontTemplateId) => void;
  onGenerateDraft: () => void;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const brandColor = session.store?.brand_color ?? session.business_profile.brand_color ?? "#0E7C66";
  const showRecommendations =
    session.status !== "collecting_requirements" && session.recommendations.length > 0;
  const canGenerate = !!session.selected_template_id && session.status !== "content_generated";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [session.messages.length, sending]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || sending) return;
    setInput("");
    onSendMessage(message);
  }

  return (
    <div className="flex h-full min-h-[560px] flex-col rounded-2xl border border-border bg-card shadow-soft">
      <div className="border-b border-border px-5 py-4">
        <div className="flex items-center gap-2 text-sm font-medium text-ink-soft">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Storefront Builder
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          Describe your business, pick a template, then generate and refine your storefront.
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {session.messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message}
            brandColor={brandColor}
            recommendations={session.recommendations}
            templateOptions={templateOptions}
            selectedTemplateId={session.selected_template_id}
            disabled={sending || generating}
            onSelectTemplate={onSelectTemplate}
          />
        ))}
        {sending ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs text-ink-soft">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Thinking...
          </div>
        ) : null}

        {showRecommendations ? (
          <div className="rounded-xl border border-border bg-background p-4">
            <h3 className="text-sm font-semibold text-ink">Recommended templates</h3>
            <p className="mt-1 text-xs text-ink-soft">
              Select a template to continue, or keep chatting for a different style.
            </p>
            <div className="mt-4">
              <BuilderTemplateRecommendations
                brandColor={brandColor}
                recommendations={session.recommendations}
                templateOptions={templateOptions}
                selectedTemplateId={session.selected_template_id}
                disabled={sending || generating}
                onSelect={onSelectTemplate}
              />
            </div>
            {session.selected_template_id ? (
              <button
                type="button"
                onClick={onGenerateDraft}
                disabled={!canGenerate || generating}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating draft...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate storefront draft
                  </>
                )}
              </button>
            ) : null}
          </div>
        ) : null}

        {!session.messages.length ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
              Try one of these
            </p>
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

      <form onSubmit={handleSubmit} className="border-t border-border p-4">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={2}
            placeholder={
              session.storefront_snapshot
                ? 'Try "Make the homepage more premium" or "Change the CTA to Shop the Collection"'
                : "Tell me about your business..."
            }
            className="min-h-[72px] flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
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
  recommendations,
  templateOptions,
  selectedTemplateId,
  disabled,
  onSelectTemplate,
}: {
  message: BuilderMessage;
  brandColor: string;
  recommendations: BuilderSession["recommendations"];
  templateOptions: ConcreteTemplateOption[];
  selectedTemplateId: StorefrontTemplateId | null;
  disabled?: boolean;
  onSelectTemplate: (templateId: StorefrontTemplateId) => void;
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
        {!isUser ? (
          <BuilderMessageWidgets
            message={message}
            brandColor={brandColor}
            recommendations={recommendations}
            templateOptions={templateOptions}
            selectedTemplateId={selectedTemplateId}
            disabled={disabled}
            onSelectTemplate={onSelectTemplate}
          />
        ) : null}
      </div>
    </div>
  );
}
