"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Code2, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { BuilderChatPanel } from "@/components/admin/builder/builder-chat-panel";
import { BuilderPreviewPanel } from "@/components/admin/builder/builder-preview-panel";
import { BuilderProgress } from "@/components/admin/builder/builder-progress";
import { BuilderThinkingLogSheet } from "@/components/admin/builder/builder-thinking-log-sheet";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api/client";
import {
  applyBuilderBrandColor,
  applyBuilderMedia,
  asConcreteTemplateId,
  processBuilderMessage,
} from "@/lib/storefront-builder/client";
import {
  STOREFRONT_TEMPLATE_OPTIONS,
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

export default function AdminBuilderPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading, refresh } = useAuth();
  const [localStorefront, setLocalStorefront] = useState<StorefrontContent | null>(null);
  const [thinkingEntries, setThinkingEntries] = useState<AgentThinkingLogEntry[]>([]);
  const [thinkingStreaming, setThinkingStreaming] = useState(false);
  const [thinkingLogOpen, setThinkingLogOpen] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState("");
  const thinkingRunRef = useRef<AgentThinkingLogEntry[]>([]);

  const templatesQuery = useQuery({
    queryKey: ["storefront-templates"],
    queryFn: api.getStorefrontTemplates,
  });

  const sessionQuery = useQuery({
    queryKey: ["builder-session"],
    queryFn: async () => {
      const current = await api.getCurrentBuilderSession();
      if (current.session) return current;
      return api.startBuilderSession();
    },
    enabled: !!user,
  });

  const session = sessionQuery.data?.session ?? null;
  const templateOptions = useMemo(
    () => templatesQuery.data ?? STOREFRONT_TEMPLATE_OPTIONS,
    [templatesQuery.data],
  );
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
    if (session?.storefront_snapshot) {
      setLocalStorefront(session.storefront_snapshot);
    }
  }, [session?.storefront_snapshot]);

  const handleSessionResponse = async (
    data: Awaited<ReturnType<typeof processBuilderMessage>>,
  ) => {
    queryClient.setQueryData(["builder-session"], data);
    const nextStorefront = data.storefront ?? data.session?.storefront_snapshot ?? null;
    if (nextStorefront) {
      const templateId =
        asConcreteTemplateId(nextStorefront.template?.id) ??
        asConcreteTemplateId(data.session?.selected_template_id) ??
        asConcreteTemplateId(data.session?.store?.storefront_template_id) ??
        null;
      setLocalStorefront(
        templateId
          ? (alignStorefrontTemplateToSelection(nextStorefront, templateId) ?? nextStorefront)
          : nextStorefront,
      );
    }
    if (data.session?.store) {
      await refresh();
      queryClient.invalidateQueries({ queryKey: ["store", "me"] });
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
        });
      } finally {
        setThinkingEntries([]);
        setThinkingStreaming(false);
        setPendingUserMessage("");
        thinkingRunRef.current = [];
      }
    },
    onSuccess: handleSessionResponse,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not send message"),
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
      queryClient.setQueryData(["builder-session"], data);
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
      return api.publishStorefront(storeId);
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(["store", "me"], data.store);
      await refresh();
      queryClient.invalidateQueries({ queryKey: ["builder-session"] });
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

  const chatBusy = sendMessage.isPending || applyColor.isPending || uploadMedia.isPending || applyImage.isPending || selectTemplate.isPending;
  const hasThinkingHistory = allThinkingTurns.length > 0;
  const previewThinkingEntries = thinkingStreaming ? thinkingEntries : latestLiveEntries;
  const publishState = session.store
    ? {
        status: session.store.status ?? "draft",
        published_at: session.store.published_at ?? null,
        is_published: session.store.is_published ?? false,
        has_unpublished_changes:
          session.store.has_unpublished_changes ?? !!localStorefront,
      }
    : null;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden px-6 py-8">
        <div className="mb-6 shrink-0 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{BUILDER_PAGE.eyebrow}</p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">{BUILDER_PAGE.title}</h1>
            <p className="mt-1 text-sm text-ink-soft">
              Pick a template design and refine your storefront layout. Use the code workbench for custom
              site code and AI edits.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/builder/workbench"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-medium text-ink-soft hover:text-ink"
            >
              <Code2 className="h-3.5 w-3.5" />
              Code workbench
            </Link>
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
          onApplyImage={(target, url, label) => applyImage.mutate({ target, url, label })}
          onSelectTemplate={(templateId) => selectTemplate.mutate(templateId)}
          onClearChat={() => clearChat.mutate()}
        />
        <BuilderPreviewPanel
          store={session.store}
          storefront={localStorefront}
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
