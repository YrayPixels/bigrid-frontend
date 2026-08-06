"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { BuilderChatPanel } from "@/components/admin/builder/builder-chat-panel";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  merchantCache,
  merchantInvalidators,
  useBuilderSessionOrStart,
  useStorefrontTemplates,
} from "@/hooks/use-merchant-queries";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import {
  applyBuilderBrandColor,
  applyBuilderLogo,
  applyBuilderMedia,
  processBuilderMessage,
  removeBuilderLogo,
} from "@/lib/storefront-builder/client";
import {
  STOREFRONT_TEMPLATE_OPTIONS,
  type BuilderMediaTarget,
  type BuilderSession,
  type StorefrontTemplateId,
} from "@/lib/api/types";

export function DashboardAiBuilderFab({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { user, refresh } = useAuth();
  const isMobile = useIsMobile();

  const templatesQuery = useStorefrontTemplates({ enabled: open });
  const sessionQuery = useBuilderSessionOrStart({ enabled: open && !!user });

  const session = sessionQuery.data?.session ?? null;
  const templateOptions = useMemo(
    () => templatesQuery.data ?? STOREFRONT_TEMPLATE_OPTIONS,
    [templatesQuery.data],
  );

  const handleSessionResponse = async (data: Awaited<ReturnType<typeof processBuilderMessage>>) => {
    merchantCache.setBuilderSession(queryClient, data);
    if (data.storefront ?? data.session?.storefront_snapshot) {
      merchantInvalidators.storefront(queryClient);
    }
    // Catalog tool calls (add/update/delete/archive product, categories) don't always
    // touch the storefront snapshot, so invalidate the live catalog unconditionally.
    merchantInvalidators.products(queryClient);
    merchantInvalidators.categories(queryClient);
    if (data.session?.store) {
      await refresh();
      merchantInvalidators.store(queryClient);
    }
  };

  const [pendingUserMessage, setPendingUserMessage] = useState("");
  const [streamingAssistantMessage, setStreamingAssistantMessage] = useState("");

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      setPendingUserMessage(message);
      setStreamingAssistantMessage("");
      const onAssistantDelta = (text: string) => setStreamingAssistantMessage(text);

      if (!session) {
        const started = await api.startBuilderSession();
        return processBuilderMessage({
          session: started.session as BuilderSession,
          message,
          templateOptions,
          onAssistantDelta,
        });
      }

      return processBuilderMessage({ session, message, templateOptions, onAssistantDelta });
    },
    onSuccess: async (data) => {
      await handleSessionResponse(data);
      setPendingUserMessage("");
      setStreamingAssistantMessage("");
    },
    onError: (error) => {
      setPendingUserMessage("");
      setStreamingAssistantMessage("");
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
    mutationFn: async ({ target, url }: { target: BuilderMediaTarget; url: string; label: string }) => {
      if (!session) throw new Error("No active builder session");
      return applyBuilderMedia({ session, target, url });
    },
    onSuccess: handleSessionResponse,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not apply image"),
  });

  const selectTemplate = useMutation({
    mutationFn: async (templateId: StorefrontTemplateId) => {
      if (!session) throw new Error("No active builder session");
      return api.selectBuilderTemplate(session.id, templateId, "merchant_selected");
    },
    onSuccess: handleSessionResponse,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not select template"),
  });

  const chatBusy = sendMessage.isPending || applyColor.isPending || uploadMedia.isPending || applyImage.isPending || selectTemplate.isPending || uploadLogo.isPending || removeLogo.isPending;

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevated transition hover:scale-105 hover:opacity-95"
        aria-label="Ask AI about your website"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn(
            "flex flex-col gap-0 overflow-hidden p-0",
            isMobile ? "h-[85vh] max-h-[85vh] rounded-t-2xl" : "w-full sm:max-w-md",
          )}
        >
          <SheetHeader className="shrink-0 border-b border-border px-5 py-4 pr-12 text-left">
            <SheetTitle>Ask AI</SheetTitle>
            <SheetDescription>Chat with AI about your website without leaving the dashboard.</SheetDescription>
          </SheetHeader>

          {sessionQuery.isLoading || !session ? (
            <div className="grid min-h-[480px] flex-1 place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="min-h-0 flex-1">
              <BuilderChatPanel
                session={session as BuilderSession}
                sending={chatBusy}
                generating={sendMessage.isPending && !!session.storefront_snapshot}
                templateOptions={templateOptions}
                selectingTemplate={selectTemplate.isPending}
                embedded
                pendingUserMessage={pendingUserMessage}
                streamingAssistantMessage={streamingAssistantMessage}
                onSendMessage={(message) => sendMessage.mutate(message)}
                onApplyColor={(color, label) => applyColor.mutate({ color, label })}
                onUploadMedia={(target, file) => uploadMedia.mutate({ target, file })}
                onUploadLogo={(file) => uploadLogo.mutate(file)}
                onRemoveLogo={() => removeLogo.mutate()}
                managingLogo={uploadLogo.isPending || removeLogo.isPending}
                onApplyImage={(target, url, label) => applyImage.mutate({ target, url, label })}
                onSelectTemplate={(templateId) => selectTemplate.mutate(templateId)}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
