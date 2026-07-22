"use client";

import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api/client";
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
import { isCodeWorkbenchEnabled } from "@/lib/features";
import { getJsonTemplateOptions } from "@/lib/storefront/template-registry";

type WebsiteAskAiSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId?: string;
};

export function WebsiteAskAiSheet({ open, onOpenChange, storeId }: WebsiteAskAiSheetProps) {
  const queryClient = useQueryClient();
  const { user, refresh } = useAuth();

  const templatesQuery = useStorefrontTemplates({ enabled: open });
  const sessionQuery = useBuilderSessionOrStart({ enabled: open && !!user });

  const session = sessionQuery.data?.session ?? null;
  const templateOptions = useMemo(() => {
    const options = templatesQuery.data ?? STOREFRONT_TEMPLATE_OPTIONS;
    if (isCodeWorkbenchEnabled()) return options;
    const jsonOnly = getJsonTemplateOptions(options);
    const aiPick = options.find((option) => option.value === "ai_pick");
    return aiPick ? [aiPick, ...jsonOnly] : jsonOnly;
  }, [templatesQuery.data]);

  const syncDraftFromSession = (
    data: Awaited<ReturnType<typeof processBuilderMessage>>,
  ) => {
    merchantCache.setBuilderSession(queryClient, data);
    const nextStorefront = data.storefront ?? data.session?.storefront_snapshot ?? null;
    if (nextStorefront && storeId) {
      merchantCache.setStorefront(queryClient, storeId, {
        storefront: nextStorefront,
        publish: {
          status: data.session?.store?.status ?? "draft",
          published_at: data.session?.store?.published_at ?? null,
          is_published: data.session?.store?.is_published ?? false,
          has_unpublished_changes: data.session?.store?.has_unpublished_changes ?? true,
        },
      });
      merchantInvalidators.storefront(queryClient);
    }
  };

  const handleSessionResponse = async (
    data: Awaited<ReturnType<typeof processBuilderMessage>>,
  ) => {
    syncDraftFromSession(data);
    if (data.session?.store) {
      await refresh();
      merchantInvalidators.store(queryClient);
    }
  };

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      if (!session) {
        const started = await api.startBuilderSession();
        return processBuilderMessage({
          session: started.session as BuilderSession,
          message,
          templateOptions,
        });
      }

      return processBuilderMessage({ session, message, templateOptions });
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

  const selectTemplate = useMutation({
    mutationFn: async (templateId: StorefrontTemplateId) => {
      if (!session) throw new Error("No active builder session");
      return api.selectBuilderTemplate(session.id, templateId, "merchant_selected");
    },
    onSuccess: handleSessionResponse,
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not select template"),
  });

  const chatBusy =
    sendMessage.isPending ||
    applyColor.isPending ||
    uploadMedia.isPending ||
    applyImage.isPending ||
    selectTemplate.isPending ||
    uploadLogo.isPending ||
    removeLogo.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
      >
        <SheetHeader className="shrink-0 border-b border-border px-5 py-4 pr-12 text-left">
          <SheetTitle>Ask AI</SheetTitle>
          <SheetDescription>
            Describe a change in plain language. Your draft updates on this page.
          </SheetDescription>
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
              generating={sendMessage.isPending}
              templateOptions={templateOptions}
              selectingTemplate={selectTemplate.isPending}
              embedded
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
  );
}
