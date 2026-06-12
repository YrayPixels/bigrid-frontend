"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { BuilderChatPanel } from "@/components/admin/builder/builder-chat-panel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api/client";
import {
  STOREFRONT_TEMPLATE_OPTIONS,
  type BuilderSession,
  type StorefrontTemplateId,
  type StorefrontTemplateOption,
} from "@/lib/api/types";

type ConcreteTemplateOption = StorefrontTemplateOption & { value: StorefrontTemplateId };

function getConcreteTemplateOptions(options: StorefrontTemplateOption[]): ConcreteTemplateOption[] {
  return options.filter((option): option is ConcreteTemplateOption => option.value !== "ai_pick");
}

export function DashboardAiBuilderFab({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { user, refresh } = useAuth();

  const templatesQuery = useQuery({
    queryKey: ["storefront-templates"],
    queryFn: api.getStorefrontTemplates,
    enabled: open,
  });

  const sessionQuery = useQuery({
    queryKey: ["builder-session"],
    queryFn: async () => {
      const current = await api.getCurrentBuilderSession();
      if (current.session) return current;
      return api.startBuilderSession();
    },
    enabled: open && !!user,
  });

  const session = sessionQuery.data?.session ?? null;

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      if (!session) {
        return api.startBuilderSession(message);
      }

      if (session.storefront_snapshot) {
        return api.applyBuilderChatEdit(session.id, message);
      }

      return api.sendBuilderMessage(session.id, message);
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(["builder-session"], data);
      if (data.session?.store) {
        await refresh();
        queryClient.invalidateQueries({ queryKey: ["store", "me"] });
      }
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not send message"),
  });

  const selectTemplate = useMutation({
    mutationFn: (templateId: StorefrontTemplateId) => {
      if (!session) throw new Error("No active builder session");
      return api.selectBuilderTemplate(session.id, templateId);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["builder-session"], data);
      toast.success("Template selected");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not select template"),
  });

  const generateDraft = useMutation({
    mutationFn: () => {
      if (!session) throw new Error("No active builder session");
      return api.generateBuilderDraft(session.id);
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(["builder-session"], data);
      await refresh();
      queryClient.invalidateQueries({ queryKey: ["store", "me"] });
      queryClient.invalidateQueries({ queryKey: ["merchant-dashboard-overview"] });
      toast.success("Storefront draft generated");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Generation failed"),
  });

  const templateOptions = useMemo(
    () => getConcreteTemplateOptions(templatesQuery.data ?? STOREFRONT_TEMPLATE_OPTIONS),
    [templatesQuery.data],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevated transition hover:scale-105 hover:opacity-95"
        aria-label="Open AI builder chat"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[calc(100vh-3rem)] max-w-2xl overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>AI storefront builder</DialogTitle>
            <DialogDescription>Chat with the AI builder without leaving the dashboard.</DialogDescription>
          </DialogHeader>

          {sessionQuery.isLoading || !session ? (
            <div className="grid min-h-[560px] place-items-center rounded-2xl bg-card">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="h-[min(720px,calc(100vh-3rem))]">
              <BuilderChatPanel
                session={session as BuilderSession}
                templateOptions={templateOptions}
                sending={sendMessage.isPending}
                generating={generateDraft.isPending}
                onSendMessage={(message) => sendMessage.mutate(message)}
                onSelectTemplate={(templateId) => selectTemplate.mutate(templateId)}
                onGenerateDraft={() => generateDraft.mutate()}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
