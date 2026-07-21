"use client";

import { useEffect, useRef, useState } from "react";
import { FileSpreadsheet, ImagePlus, ListTree, Loader2, Send, Sparkles, Trash2 } from "lucide-react";
import { formatProductsForAi, parseProductFile } from "@/lib/product-parser";
import type {
  BuilderMediaTarget,
  BuilderMessage,
  BuilderSession,
  StorefrontTemplateId,
  StorefrontTemplateOption,
} from "@/lib/api/types";
import { BuilderMessageWidgets } from "@/components/admin/builder/builder-message-widgets";
import { BuilderLogoManager } from "@/components/admin/builder/builder-logo-manager";
import { BuilderSuggestedActions } from "@/components/admin/builder/builder-suggested-actions";
import { BuilderTemplateRecommendations } from "@/components/admin/builder/builder-template-recommendations";
import { BuilderThinkingLogCompact } from "@/components/admin/builder/builder-thinking-log-compact";
import {
  WorkbenchLiveActions,
  type LiveBoltAction,
} from "@/components/admin/builder/workbench-live-actions";
import { WorkbenchChangesPanel } from "@/components/admin/builder/workbench-changes-panel";
import { WorkbenchChatInput } from "@/components/admin/builder/workbench-chat-input";
import { WorkbenchErrorAlert } from "@/components/admin/builder/workbench-error-alert";
import type { WorkbenchEditStep } from "@/lib/bolt/workbench-edit-agent";
import type { FileDiffSummary, WorkbenchEditCheckpoint } from "@/lib/bolt/workbench-diff";
import { BUILDER_CHAT_HEADER } from "@/lib/storefront-builder/copy";
import { getLatestSuggestedActions } from "@/lib/storefront-builder/suggested-actions";
import { cn } from "@/lib/utils";
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
  variant = "template",
  embedded = false,
  onOpenThinkingLog,
  onSendMessage,
  onApplyColor,
  onUploadMedia,
  onUploadLogo,
  onRemoveLogo,
  managingLogo = false,
  onApplyImage,
  onSelectTemplate,
  onClearChat,
  liveActions = [],
  agentSteps = [],
  aiStreaming = false,
  lastCheckpoint = null,
  lastDiffs = [],
  onRevertEdit,
  onSelectDiffFile,
  onGoToPreviewError,
  projectFilePaths = [],
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
  variant?: "template" | "code";
  embedded?: boolean;
  onOpenThinkingLog?: () => void;
  onSendMessage: (message: string) => void;
  onApplyColor: (color: string, label: string) => void;
  onUploadMedia: (target: BuilderMediaTarget, file: File) => void;
  onUploadLogo?: (file: File) => void;
  onRemoveLogo?: () => void;
  managingLogo?: boolean;
  onApplyImage?: (target: BuilderMediaTarget, url: string, label: string) => void;
  onSelectTemplate?: (templateId: StorefrontTemplateId) => void;
  onClearChat?: () => void;
  liveActions?: LiveBoltAction[];
  agentSteps?: WorkbenchEditStep[];
  aiStreaming?: boolean;
  lastCheckpoint?: WorkbenchEditCheckpoint | null;
  lastDiffs?: FileDiffSummary[];
  onRevertEdit?: () => void;
  onSelectDiffFile?: (path: string) => void;
  onGoToPreviewError?: (filePath: string, line: number) => void;
  projectFilePaths?: string[];
}) {
  const [input, setInput] = useState("");
  const [designPickerOpen, setDesignPickerOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const productFileRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<BuilderMediaTarget>("media.hero_image_url");
  const [parsingFile, setParsingFile] = useState(false);
  const brandColor = session.store?.brand_color ?? session.business_profile.brand_color ?? "#0E7C66";
  const logoUrl = session.store?.logo_url ?? null;
  const businessName = session.store?.business_name ?? session.business_profile.business_name ?? "Your store";
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
  const isCodeVariant = variant === "code";
  const showInitialTemplatePicker =
    !isCodeVariant &&
    !session.storefront_snapshot &&
    concreteTemplateOptions.length > 0 &&
    !!onSelectTemplate &&
    (session.recommendations.length > 0 || Boolean(session.store));
  const showDesignSwitcher =
    !isCodeVariant && !!session.storefront_snapshot && concreteTemplateOptions.length > 0 && onSelectTemplate;
  const showTemplatePicker = showInitialTemplatePicker || (showDesignSwitcher && designPickerOpen);

  const showLiveWorkbench =
    isCodeVariant &&
    (aiStreaming || liveActions.length > 0 || agentSteps.length > 0 || lastDiffs.length > 0);

  useEffect(() => {
    const instant = aiStreaming || sending || generating || thinkingStreaming;
    endRef.current?.scrollIntoView({ behavior: instant ? "instant" : "smooth", block: "end" });
  }, [
    session.messages,
    sending,
    generating,
    thinkingEntries,
    thinkingStreaming,
    liveActions,
    agentSteps,
    aiStreaming,
    lastDiffs.length,
  ]);

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

  async function handleProductFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || busy) return;

    setParsingFile(true);
    try {
      // Image files: upload to backend as a product image, then
      // let the vision agent analyze it and create a product.
      if (file.type.startsWith("image/")) {
        if (!session.store?.id) {
          setInput("Please create your store first before uploading product images.");
          setParsingFile(false);
          return;
        }

        try {
          const { api } = await import("@/lib/api/client");
          const { url } = await api.uploadStorefrontImage(session.store.id, file);
          // Insert image reference — user adds context about what to do with it.
          // The cursor is placed before the marker so they can type their intent.
          const imageRef = ` [Image: ${url}]`;
          setInput((prev) => {
            const existing = prev.trim();
            return existing ? `${existing}${imageRef}` : `Add this as a product ${imageRef}`;
          });
        } catch {
          setInput("Failed to upload the product image. Please try again.");
        }
        setParsingFile(false);
        return;
      }

      // CSV/XLSX files
      const products = await parseProductFile(file);
      if (!products.length) {
        setInput("Couldn't parse any products from the file. Please check the format and try again.");
        return;
      }
      const text = formatProductsForAi(products);
      setInput((prev) => (prev.trim() ? `${prev}\n\n${text}` : text));
    } catch {
      setInput("Failed to read the product file. Please try a .csv, .xlsx, or image file.");
    } finally {
      setParsingFile(false);
    }
  }

  const canClear = session.messages.length > 0 && onClearChat && !busy;
  const inputPlaceholder = isCodeVariant
    ? 'Use @ to tag a file or folder — e.g. "@src/routes/ fix the hero"'
    : session.storefront_snapshot
      ? 'Try "Switch to a cozy candle shop with warm earthy colors" or pick a design below'
      : "Tell me about your business — what you sell, who it's for, and the vibe you want...";
  const headerSubtitle = isCodeVariant
    ? "Prompt the AI to edit your site code. Changes show in the editor and preview."
    : BUILDER_CHAT_HEADER.subtitle;

  return (
    <div
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-col overflow-hidden",
        embedded ? "bg-background" : "rounded-2xl border border-border bg-card shadow-soft",
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={productFileRef}
        type="file"
        accept=".csv,.xlsx,.xls,image/*"
        className="hidden"
        onChange={handleProductFile}
      />

      {!embedded ? (
        <div className="shrink-0 border-b border-border px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-ink-soft">
                <Sparkles className="h-4 w-4 text-primary" />
                {BUILDER_CHAT_HEADER.title}
              </div>
              <p className="mt-1 text-sm text-ink-soft">{headerSubtitle}</p>
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
      ) : canClear ? (
        <div className="flex shrink-0 justify-end border-b border-border px-3 py-1.5">
          <button
            type="button"
            onClick={onClearChat}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] text-ink-soft transition hover:border-primary/40 hover:text-ink"
            aria-label="Clear chat"
          >
            <Trash2 className="h-3 w-3" />
            Clear
          </button>
        </div>
      ) : null}

      {session.store && onUploadLogo && onRemoveLogo ? (
        <BuilderLogoManager
          businessName={businessName}
          logoUrl={logoUrl}
          brandColor={brandColor}
          disabled={busy || managingLogo}
          onUpload={onUploadLogo}
          onRemove={onRemoveLogo}
        />
      ) : null}

      <div
        ref={scrollRef}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain py-4",
          embedded ? "px-3" : "px-5",
        )}
      >
        <div className="flex flex-col gap-4">
          {session.messages.map((message) => (
            <ChatBubble key={message.id} message={message} brandColor={brandColor} />
          ))}

          {showLiveWorkbench ? (
            <div className="flex justify-start">
              <div className="w-full max-w-[92%] space-y-2 rounded-2xl bg-secondary px-3 py-3 text-sm">
                <WorkbenchLiveActions
                  actions={liveActions}
                  agentSteps={agentSteps}
                  streaming={aiStreaming}
                />
                <WorkbenchChangesPanel
                  checkpoint={lastCheckpoint}
                  diffs={lastDiffs}
                  onRevert={onRevertEdit}
                  onSelectFile={onSelectDiffFile}
                />
              </div>
            </div>
          ) : null}

          {showLiveThinking ? (
            <BuilderThinkingLogCompact entries={thinkingEntries} streaming={thinkingStreaming} />
          ) : busy && !showLiveWorkbench ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs text-ink-soft">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {generating ? "Building your website..." : "Thinking..."}
            </div>
          ) : null}

          {!busy && !isCodeVariant ? (
            <BuilderSuggestedActions
              actions={suggestedActions}
              disabled={busy}
              onPrompt={onSendMessage}
              onColor={onApplyColor}
              onUpload={openUploadPicker}
              onApplyImage={onApplyImage}
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
            <div data-builder-templates>
              <BuilderTemplateRecommendations
                brandColor={brandColor}
                recommendations={session.recommendations}
                templateOptions={concreteTemplateOptions}
                selectedTemplateId={selectedTemplateId}
                title={session.storefront_snapshot ? "Switch website design" : "Pick a website design"}
                subtitle={
                  session.storefront_snapshot
                    ? "Choose a look below. Your business details and brand color stay the same."
                    : session.store
                      ? "Recommended looks for your store. Pick one to generate a draft."
                      : undefined
                }
                disabled={busy}
                onSelect={(templateId) => {
                  onSelectTemplate?.(templateId);
                  if (session.storefront_snapshot) setDesignPickerOpen(false);
                }}
              />
            </div>
          ) : null}

          <div ref={endRef} className="h-px shrink-0" aria-hidden />
        </div>
      </div>

      {isCodeVariant ? (
        <div className="shrink-0 border-t border-border px-4 pt-3">
          <WorkbenchErrorAlert onFixWithAi={onSendMessage} onGoToError={onGoToPreviewError} />
        </div>
      ) : null}

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
          <button
            type="button"
            disabled={!session.store || busy || parsingFile}
            onClick={() => productFileRef.current?.click()}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-background text-ink-soft hover:border-primary/40 hover:text-ink disabled:opacity-50"
            aria-label="Upload product list"
            title="Upload a CSV or Excel file with products"
          >
            {parsingFile ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4" />
            )}
          </button>
          {isCodeVariant && projectFilePaths.length > 0 ? (
            <WorkbenchChatInput
              value={input}
              onChange={setInput}
              onSubmit={sendMessage}
              filePaths={projectFilePaths}
              busy={busy}
              placeholder={inputPlaceholder}
            />
          ) : (
            <textarea
              data-builder-chat-input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder={inputPlaceholder}
              className="min-h-[72px] flex-1 resize-none rounded-md border border-border bg-background px-3 py-2 text-sm shadow-soft outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          )}
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
