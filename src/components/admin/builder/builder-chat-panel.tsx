"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, ListTree, Loader2, Send, Sparkles, Trash2 } from "lucide-react";
import type {
  BuilderMediaTarget,
  BuilderMessage,
  BuilderSession,
  StorefrontTemplateId,
  StorefrontTemplateOption,
} from "@/lib/api/types";
import { BuilderMessageWidgets } from "@/components/admin/builder/builder-message-widgets";
import { BuilderSuggestedActions } from "@/components/admin/builder/builder-suggested-actions";
import { BuilderTemplateRecommendations } from "@/components/admin/builder/builder-template-recommendations";
import { BuilderThinkingLogCompact } from "@/components/admin/builder/builder-thinking-log-compact";
import { BUILDER_CHAT_HEADER } from "@/lib/storefront-builder/copy";
import { getLatestSuggestedActions } from "@/lib/storefront-builder/suggested-actions";
import type { AgentThinkingLogEntry } from "@/lib/storefront-builder/agents/types";

export function BuilderChatPanel({
  session,
  sending,
  generating,
  clearing,
  thinkingEntries = [],
  thinkingStreaming = false,
  hasThinkingHistory = false,
  templateOptions = [],
  selectingTemplate = false,
  onOpenThinkingLog,
  onSendMessage,
  onApplyColor,
  onUploadMedia,
  onSelectTemplate,
  onClearChat,
}: {
  session: BuilderSession;
  sending: boolean;
  generating: boolean;
  clearing?: boolean;
  thinkingEntries?: AgentThinkingLogEntry[];
  thinkingStreaming?: boolean;
  hasThinkingHistory?: boolean;
  templateOptions?: StorefrontTemplateOption[];
  selectingTemplate?: boolean;
  onOpenThinkingLog?: () => void;
  onSendMessage: (message: string) => void;
  onApplyColor: (color: string, label: string) => void;
  onUploadMedia: (target: BuilderMediaTarget, file: File) => void;
  onSelectTemplate?: (templateId: StorefrontTemplateId) => void;
  onClearChat?: () => void;
}) {
  const [input, setInput] = useState("");
  const [designPickerOpen, setDesignPickerOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<BuilderMediaTarget>("media.hero_image_url");
  const brandColor = session.store?.brand_color ?? session.business_profile.brand_color ?? "#0E7C66";
  const suggestedActions = getLatestSuggestedActions(session);
  const busy = sending || generating || clearing || selectingTemplate;
  const selectedTemplateId =
    session.selected_template_id && session.selected_template_id !== "ai_pick"
      ? session.selected_template_id
      : session.store?.storefront_template_id && session.store.storefront_template_id !== "ai_pick"
        ? session.store.storefront_template_id
        : null;
  const concreteTemplateOptions = templateOptions.filter(
    (option): option is StorefrontTemplateOption & { value: StorefrontTemplateId } =>
      option.value !== "ai_pick",
  );
  const showInitialTemplatePicker =
    !session.storefront_snapshot &&
    session.recommendations.length > 0 &&
    concreteTemplateOptions.length > 0 &&
    onSelectTemplate;
  const showDesignSwitcher =
    !!session.storefront_snapshot && concreteTemplateOptions.length > 0 && onSelectTemplate;
  const showTemplatePicker = showInitialTemplatePicker || (showDesignSwitcher && designPickerOpen);

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
  }, [session.messages, sending, generating, thinkingEntries, thinkingStreaming]);

  const showLiveThinking = busy && (thinkingStreaming || thinkingEntries.length > 0);

  function sendMessage() {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    onSendMessage(message);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    sendMessage();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    sendMessage();
  }

  function openUploadPicker(target: BuilderMediaTarget) {
    if (!session.store || busy) return;
    setUploadTarget(target);
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy) return;
    onUploadMedia(uploadTarget, file);
  }

  const canClear = session.messages.length > 0 && onClearChat && !busy;
  const inputPlaceholder = session.storefront_snapshot
    ? 'Try "Switch to a cozy candle shop with warm earthy colors" or pick a design below'
    : "Tell me about your business — what you sell, who it's for, and the vibe you want...";

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="shrink-0 border-b border-border px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-ink-soft">
              <Sparkles className="h-4 w-4 text-primary" />
              {BUILDER_CHAT_HEADER.title}
            </div>
            <p className="mt-1 text-sm text-ink-soft">{BUILDER_CHAT_HEADER.subtitle}</p>
          </div>
          {hasThinkingHistory || thinkingStreaming ? (
            <button
              type="button"
              onClick={() => onOpenThinkingLog?.()}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-ink-soft transition hover:border-primary/40 hover:text-ink"
              aria-label="View AI process log"
            >
              <ListTree className="h-3.5 w-3.5" />
              Log
            </button>
          ) : null}
          {canClear ? (
            <button
              type="button"
              onClick={onClearChat}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-ink-soft transition hover:border-primary/40 hover:text-ink"
              aria-label="Clear chat"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear chat
            </button>
          ) : null}
        </div>
      </div>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {session.messages.map((message) => (
          <ChatBubble key={message.id} message={message} brandColor={brandColor} />
        ))}
        {showLiveThinking ? (
          <BuilderThinkingLogCompact entries={thinkingEntries} streaming={thinkingStreaming} />
        ) : busy ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs text-ink-soft">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {generating ? "Building your website..." : "Thinking..."}
          </div>
        ) : null}

        {!busy ? (
          <BuilderSuggestedActions
            actions={suggestedActions}
            disabled={busy}
            onPrompt={onSendMessage}
            onColor={onApplyColor}
            onUpload={openUploadPicker}
          />
        ) : null}

        {showDesignSwitcher ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setDesignPickerOpen((open) => !open)}
            className="w-full rounded-xl border border-dashed border-border bg-background px-4 py-3 text-left text-sm text-ink-soft transition hover:border-primary/40 hover:text-ink disabled:opacity-60"
          >
            {designPickerOpen
              ? "Hide design options"
              : "Try a different design — pick another look and preview updates instantly"}
          </button>
        ) : null}

        {showTemplatePicker ? (
          <BuilderTemplateRecommendations
            brandColor={brandColor}
            recommendations={session.recommendations}
            templateOptions={concreteTemplateOptions}
            selectedTemplateId={selectedTemplateId}
            title={session.storefront_snapshot ? "Switch website design" : "Pick a website design"}
            subtitle={
              session.storefront_snapshot
                ? "Choose a look below. Your business details and brand color stay the same."
                : undefined
            }
            disabled={busy}
            onSelect={(templateId) => {
              onSelectTemplate?.(templateId);
              if (session.storefront_snapshot) setDesignPickerOpen(false);
            }}
          />
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="shrink-0 border-t border-border p-4">
        <div className="flex items-end gap-2">
          <button
            type="button"
            disabled={!session.store || busy}
            onClick={() => openUploadPicker("media.hero_image_url")}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-ink-soft hover:border-primary/40 hover:text-ink disabled:opacity-50"
            aria-label="Upload image"
            title="Upload a photo for your website"
          >
            <ImagePlus className="h-4 w-4" />
          </button>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder={inputPlaceholder}
            className="min-h-[72px] flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={!input.trim() || busy}
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
