"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { BuilderChatPanel } from "@/components/admin/builder/builder-chat-panel";
import { BuilderPreviewPanel } from "@/components/admin/builder/builder-preview-panel";
import { BuilderProgress } from "@/components/admin/builder/builder-progress";
import { BuilderThinkingLogSheet } from "@/components/admin/builder/builder-thinking-log-sheet";
import { BuilderOnboardingHandoff } from "@/components/admin/builder/builder-onboarding-handoff";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api/client";
import {
  merchantCache,
  merchantInvalidators,
  useBuilderSessionOrStart,
  useStorefrontTemplates,
} from "@/hooks/use-merchant-queries";
import {
  applyBuilderBrandColor,
  applyBuilderLogo,
  applyBuilderMedia,
  asConcreteTemplateId,
  processBuilderMessage,
  removeBuilderLogo,
} from "@/lib/storefront-builder/client";
import {
  STOREFRONT_TEMPLATE_OPTIONS,
  isEmailVerified,
  type BuilderMediaTarget,
  type BuilderSession,
  type StorefrontContent,
  type StorefrontTemplateId,
} from "@/lib/api/types";
import { BUILDER_PAGE } from "@/lib/storefront-builder/copy";
import { alignStorefrontTemplateToSelection } from "@/lib/storefront/template";
import type { AgentThinkingLogEntry } from "@/lib/storefront-builder/agents/types";
import {
  extractThinkingLogTurns,
  getLatestThinkingTurn,
  type ThinkingLogTurn,
} from "@/lib/storefront-builder/session-thinking-log";
import { isCodeWorkbenchEnabled } from "@/lib/features";
import { getJsonTemplateOptions } from "@/lib/storefront/template-registry";

type WebsiteCreateViewProps = {
  /** Called when the shared storefront draft changes so the hub can switch to refine. */
  onDraftChanged?: () => void;
};

export function WebsiteCreateView({ onDraftChanged }: WebsiteCreateViewProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading, refresh } = useAuth();
  const [localStorefront, setLocalStorefront] = useState<StorefrontContent | null>(null);
  const [thinkingEntries, setThinkingEntries] = useState<AgentThinkingLogEntry[]>([]);
  const [thinkingStreaming, setThinkingStreaming] = useState(false);
  const [thinkingLogOpen, setThinkingLogOpen] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState("");
  const thinkingRunRef = useRef<AgentThinkingLogEntry[]>([]);

  const templatesQuery = useStorefrontTemplates();
  const sessionQuery = useBuilderSessionOrStart({ enabled: !!user });

  const session = sessionQuery.data?.session ?? null;
  const templateOptions = useMemo(() => {
    const options = templatesQuery.data ?? STOREFRONT_TEMPLATE_OPTIONS;
    if (isCodeWorkbenchEnabled()) return options;
    const jsonOnly = getJsonTemplateOptions(options);
    const aiPick = options.find((option) => option.value === "ai_pick");
    return aiPick ? [aiPick, ...jsonOnly] : jsonOnly;
  }, [templatesQuery.data]);
  const sessionThinkingTurns = useMemo(
    () => (session ? extractThinkingLogTurns(session as BuilderSession) : []),
    [session],
  );
  const liveThinkingTurn = useMemo<ThinkingLogTurn | null>(() => {
    if (!thinkingStreaming && thinkingEntries.length === 0) return null;
    return {
      id: "live",
      userMessage: pendingUserMessage,
      entries: thinkingEntries,
    };
  }, [thinkingStreaming, thinkingEntries, pendingUserMessage]);
  const allThinkingTurns = useMemo(
    () => (liveThinkingTurn ? [...sessionThinkingTurns, liveThinkingTurn] : sessionThinkingTurns),
    [sessionThinkingTurns, liveThinkingTurn],
  );
  const latestLiveEntries = liveThinkingTurn?.entries ?? getLatestThinkingTurn(sessionThinkingTurns)?.entries ?? [];

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!session?.storefront_snapshot) return;
    const templateId =
      asConcreteTemplateId(session.store?.storefront_template_id) ??
      asConcreteTemplateId(session.selected_template_id) ??
      asConcreteTemplateId(session.storefront_snapshot.template?.id) ??
      null;
    setLocalStorefront(
      templateId
        ? (alignStorefrontTemplateToSelection(
            session.storefront_snapshot,
            templateId,
            session.store?.brand_color,
          ) ?? session.storefront_snapshot)
        : session.storefront_snapshot,
    );
  }, [
    session?.storefront_snapshot,
    session?.selected_template_id,
    session?.store?.storefront_template_id,
  ]);

  const handleSessionResponse = async (
    data: Awaited<ReturnType<typeof processBuilderMessage>>,
  ) => {
    merchantCache.setBuilderSession(queryClient, data);
    const nextStorefront = data.storefront ?? data.session?.storefront_snapshot ?? null;
    if (nextStorefront) {
      const templateId =
        asConcreteTemplateId(data.session?.store?.storefront_template_id) ??
        asConcreteTemplateId(data.session?.selected_template_id) ??
        asConcreteTemplateId(nextStorefront.template?.id) ??
        null;
      setLocalStorefront(
        templateId
          ? (alignStorefrontTemplateToSelection(
              nextStorefront,
              templateId,
              data.session?.store?.brand_color,
            ) ?? nextStorefront)
          : nextStorefront,
      );
      merchantInvalidators.storefront(queryClient);
      merchantInvalidators.products(queryClient);
      onDraftChanged?.();
    }
    if (data.session?.store) {
      await refresh();
      merchantInvalidators.store(queryClient);
    }
  };

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const activeSession = session ?? (await api.startBuilderSession()).session;
      if (!activeSession) throw new Error("Could not start builder session");

      thinkingRunRef.current = [];
      setPendingUserMessage(message);
      setThinkingEntries([]);
      setThinkingStreaming(true);

      try {
        return await processBuilderMessage({
          session: activeSession as BuilderSession,
          message,
          templateOptions,
          onLog: (entry) => {
            thinkingRunRef.current = [...thinkingRunRef.current, entry];
            setThinkingEntries(thinkingRunRef.current);
          },
        });
      } finally {
        setThinkingStreaming(false);
      }
    },
    onSuccess: async (data) => {
      await handleSessionResponse(data);
      setThinkingEntries([]);
      setPendingUserMessage("");
      thinkingRunRef.current = [];
    },
    onError: (error) => {
      setThinkingEntries([]);
      setPendingUserMessage("");
      thinkingRunRef.current = [];
      toast.error(error instanceof Error ? error.message : "Could not send message");
    },
  });

  const applyColor = useMutation({
    mutationFn: async ({ color, label }: { color: string; label: string }) => {
      if (!session) throw new Error("No active builder session");
      return applyBuilderBrandColor({ session, color, label });
    },
    onSuccess: handleSessionResponse,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not apply color"),
  });

  const uploadMedia = useMutation({
    mutationFn: async ({ target, file }: { target: BuilderMediaTarget; file: File }) => {
      if (!session?.store) throw new Error("Create your store before uploading images");
      const { url } = await api.uploadStorefrontImage(session.store.id, file);
      return applyBuilderMedia({ session, target, url });
    },
    onSuccess: handleSessionResponse,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not upload image"),
  });

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      if (!session?.store) throw new Error("Create your store before uploading a logo");
      const { url } = await api.uploadStorefrontImage(session.store.id, file);
      return applyBuilderLogo({ session, url });
    },
    onSuccess: handleSessionResponse,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not upload logo"),
  });

  const removeLogo = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("No active builder session");
      return removeBuilderLogo({ session });
    },
    onSuccess: handleSessionResponse,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not remove logo"),
  });

  const applyImage = useMutation({
    mutationFn: async ({
      target,
      url,
    }: {
      target: BuilderMediaTarget;
      url: string;
      label: string;
    }) => {
      if (!session) throw new Error("No active builder session");
      return applyBuilderMedia({ session, target, url });
    },
    onSuccess: handleSessionResponse,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not apply image"),
  });

  const clearChat = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("No active builder session");
      return api.clearBuilderChat(session.id);
    },
    onSuccess: (data) => {
      merchantCache.setBuilderSession(queryClient, data);
      toast.success("Chat cleared");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not clear chat"),
  });

  const selectTemplate = useMutation({
    mutationFn: async (templateId: StorefrontTemplateId) => {
      if (!session) throw new Error("No active builder session");
      return api.selectBuilderTemplate(session.id, templateId, "merchant_selected");
    },
    onSuccess: (data) => {
      handleSessionResponse(data);
      if (session?.storefront_snapshot) {
        toast.success("Design updated — check the preview");
      }
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not select template"),
  });

  const publishStorefront = useMutation({
    mutationFn: () => {
      const storeId = session?.store?.id;
      if (!storeId) throw new Error("No store to publish");
      if (!isEmailVerified(user)) {
        throw new Error("Verify your email before publishing your storefront.");
      }
      return api.publishStorefront(storeId);
    },
    onSuccess: async (data) => {
      merchantCache.setStoreMe(queryClient, data.store);
      await refresh();
      merchantInvalidators.builderSession(queryClient);
      merchantInvalidators.storefront(queryClient);
      toast.success(data.message);
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not publish storefront"),
  });

  if (loading || !user || sessionQuery.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const chatBusy =
    sendMessage.isPending ||
    applyColor.isPending ||
    uploadMedia.isPending ||
    applyImage.isPending ||
    selectTemplate.isPending ||
    uploadLogo.isPending ||
    removeLogo.isPending;
  const hasThinkingHistory = allThinkingTurns.length > 0;
  const previewThinkingEntries = thinkingStreaming ? thinkingEntries : latestLiveEntries;
  const publishState = session.store
    ? {
        status: session.store.status ?? "draft",
        published_at: session.store.published_at ?? null,
        is_published: session.store.is_published ?? false,
        has_unpublished_changes: session.store.has_unpublished_changes ?? !!localStorefront,
      }
    : null;

  const previewTemplateId =
    asConcreteTemplateId(session.store?.storefront_template_id) ??
    asConcreteTemplateId(session.selected_template_id) ??
    asConcreteTemplateId(localStorefront?.template?.id) ??
    null;

  const previewStore = session.store
    ? {
        ...session.store,
        ...(previewTemplateId ? { storefront_template_id: previewTemplateId } : {}),
      }
    : null;

  const previewStorefront =
    localStorefront && previewTemplateId
      ? (alignStorefrontTemplateToSelection(
          localStorefront,
          previewTemplateId,
          session.store?.brand_color,
        ) ?? localStorefront)
      : localStorefront;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden px-6 py-8">
      <div className="mb-6 shrink-0 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{BUILDER_PAGE.eyebrow}</p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">{BUILDER_PAGE.title}</h1>
            <p className="mt-1 text-sm text-ink-soft">{BUILDER_PAGE.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {localStorefront ? (
              <Link
                href="/admin/website"
                className="inline-flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-medium text-ink hover:border-primary"
              >
                Open editor
              </Link>
            ) : null}
            {isCodeWorkbenchEnabled() ? (
              <Link
                href="/admin/builder/workbench"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-ink-soft hover:text-ink"
              >
                Code workbench
              </Link>
            ) : null}
            <Link
              href="/admin/builder/thinking"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-ink-soft hover:text-ink"
            >
              <Sparkles className="h-3.5 w-3.5" />
              AI thinking log
            </Link>
          </div>
        </div>
        <BuilderProgress status={session.status} />
        <Suspense fallback={null}>
          <BuilderOnboardingHandoff
            storeName={session.store?.business_name ?? session.business_profile?.business_name}
            onBrowseLooks={() => {
              document.querySelector<HTMLElement>("[data-builder-templates]")?.scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
            }}
            onBuildWebsite={() => sendMessage.mutate("build my website")}
          />
        </Suspense>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        <BuilderChatPanel
          session={session as BuilderSession}
          sending={chatBusy}
          generating={sendMessage.isPending && !localStorefront}
          clearing={clearChat.isPending}
          thinkingEntries={thinkingEntries}
          thinkingStreaming={thinkingStreaming}
          hasThinkingHistory={hasThinkingHistory}
          templateOptions={templateOptions}
          selectingTemplate={selectTemplate.isPending}
          onOpenThinkingLog={() => setThinkingLogOpen(true)}
          onSendMessage={(message) => sendMessage.mutate(message)}
          onApplyColor={(color, label) => applyColor.mutate({ color, label })}
          onUploadMedia={(target, file) => uploadMedia.mutate({ target, file })}
          onUploadLogo={(file) => uploadLogo.mutate(file)}
          onRemoveLogo={() => removeLogo.mutate()}
          managingLogo={uploadLogo.isPending || removeLogo.isPending}
          onApplyImage={(target, url, label) => applyImage.mutate({ target, url, label })}
          onSelectTemplate={(templateId) => selectTemplate.mutate(templateId)}
          onClearChat={() => clearChat.mutate()}
        />
        <BuilderPreviewPanel
          store={previewStore}
          storefront={previewStorefront}
          publish={publishState}
          publishing={publishStorefront.isPending}
          onPublish={() => publishStorefront.mutate()}
          generating={sendMessage.isPending || selectTemplate.isPending}
          thinkingEntries={previewThinkingEntries}
          thinkingStreaming={thinkingStreaming}
          hasThinkingHistory={hasThinkingHistory}
          onOpenThinkingLog={() => setThinkingLogOpen(true)}
        />
      </div>

      <BuilderThinkingLogSheet
        open={thinkingLogOpen}
        onOpenChange={setThinkingLogOpen}
        turns={allThinkingTurns}
        streaming={thinkingStreaming}
      />
    </div>
  );
}
