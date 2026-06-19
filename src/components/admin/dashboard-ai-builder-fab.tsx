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
  applyBuilderChatEditForSession,
  processBuilderMessage,
} from "@/lib/storefront-builder/client";
import {
  STOREFRONT_TEMPLATE_OPTIONS,
  type BuilderSession,
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
  const templateOptions = useMemo(
    () => templatesQuery.data ?? STOREFRONT_TEMPLATE_OPTIONS,
    [templatesQuery.data],
  );

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

      if (session.storefront_snapshot) {
        return applyBuilderChatEditForSession({ session, instruction: message });
      }

      return processBuilderMessage({ session, message, templateOptions });
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

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevated transition hover:scale-105 hover:opacity-95"
        aria-label="Open AI website builder"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[calc(100vh-3rem)] max-w-2xl overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>AI website builder</DialogTitle>
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
                sending={sendMessage.isPending}
                generating={sendMessage.isPending && !!session.storefront_snapshot}
                onSendMessage={(message) => sendMessage.mutate(message)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
