"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { BuilderChatPanel } from "@/components/admin/builder/builder-chat-panel";
import { BuilderPreviewPanel } from "@/components/admin/builder/builder-preview-panel";
import { BuilderProgress } from "@/components/admin/builder/builder-progress";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api/client";
import {
  STOREFRONT_TEMPLATE_OPTIONS,
  type BuilderSession,
  type StorefrontContent,
  type StorefrontTemplateId,
  type StorefrontTemplateOption,
} from "@/lib/api/types";

type ConcreteTemplateOption = StorefrontTemplateOption & { value: StorefrontTemplateId };

function getConcreteTemplateOptions(options: StorefrontTemplateOption[]): ConcreteTemplateOption[] {
  return options.filter((option): option is ConcreteTemplateOption => option.value !== "ai_pick");
}

export default function AdminBuilderPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, loading, refresh } = useAuth();
  const [localStorefront, setLocalStorefront] = useState<StorefrontContent | null>(null);

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

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (session?.storefront_snapshot) {
      setLocalStorefront(session.storefront_snapshot);
    }
  }, [session?.storefront_snapshot]);

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      if (!session) {
        const started = await api.startBuilderSession(message);
        return started;
      }

      const hasDraft = !!session.storefront_snapshot;
      if (hasDraft) {
        return api.applyBuilderChatEdit(session.id, message);
      }

      return api.sendBuilderMessage(session.id, message);
    },
    onSuccess: async (data) => {
      queryClient.setQueryData(["builder-session"], data);
      if (data.storefront) setLocalStorefront(data.storefront);
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
      if (data.storefront) setLocalStorefront(data.storefront);
      await refresh();
      queryClient.invalidateQueries({ queryKey: ["store", "me"] });
      if (data.session?.store?.id) {
        queryClient.setQueryData(["storefront", data.session.store.id], data.storefront ?? null);
      }
      toast.success("Storefront draft generated");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Generation failed"),
  });

  const templateOptions = useMemo(
    () => getConcreteTemplateOptions(templatesQuery.data ?? STOREFRONT_TEMPLATE_OPTIONS),
    [templatesQuery.data],
  );

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

  return (
    <div className="w-full px-6 py-8">
      <div className="mb-6 space-y-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">AI Builder</span>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
            Build your storefront by chat
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Describe your business, choose a template, generate structured content, and refine it with
            chat edits.
          </p>
        </div>
        <BuilderProgress status={session.status} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        <BuilderChatPanel
          session={session as BuilderSession}
          templateOptions={templateOptions}
          sending={sendMessage.isPending}
          generating={generateDraft.isPending}
          onSendMessage={(message) => sendMessage.mutate(message)}
          onSelectTemplate={(templateId) => selectTemplate.mutate(templateId)}
          onGenerateDraft={() => generateDraft.mutate()}
        />
        <BuilderPreviewPanel
          store={session.store}
          storefront={localStorefront}
          generating={generateDraft.isPending}
        />
      </div>
    </div>
  );
}
