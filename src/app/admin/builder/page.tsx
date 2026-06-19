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
  applyBuilderChatEditForSession,
  processBuilderMessage,
} from "@/lib/storefront-builder/client";
import {
  STOREFRONT_TEMPLATE_OPTIONS,
  type BuilderSession,
  type StorefrontContent,
} from "@/lib/api/types";

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
  const templateOptions = useMemo(
    () => templatesQuery.data ?? STOREFRONT_TEMPLATE_OPTIONS,
    [templatesQuery.data],
  );

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
      if (data.storefront) setLocalStorefront(data.storefront);
      if (data.session?.store) {
        await refresh();
        queryClient.invalidateQueries({ queryKey: ["store", "me"] });
      }
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not send message"),
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

  return (
    <div className="w-full px-6 py-8">
      <div className="mb-6 space-y-4">
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">AI Website Builder</span>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
            Build your website by chat
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Describe your business and the AI will design, write, and generate your website. Refine it
            with follow-up messages.
          </p>
        </div>
        <BuilderProgress status={session.status} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_1fr]">
        <BuilderChatPanel
          session={session as BuilderSession}
          sending={sendMessage.isPending}
          generating={sendMessage.isPending && !!session.storefront_snapshot}
          onSendMessage={(message) => sendMessage.mutate(message)}
        />
        <BuilderPreviewPanel
          store={session.store}
          storefront={localStorefront}
          generating={sendMessage.isPending}
        />
      </div>
    </div>
  );
}
