import { api } from "@/lib/api/client";
import type {
  BuilderSession,
  BuilderSessionResponse,
  StorefrontContent,
  StorefrontTemplateId,
  StorefrontTemplateOption,
} from "@/lib/api/types";
import type { BuilderAiTurn } from "@/lib/storefront-builder/local-ai";

async function requestBuilderAi<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/storefront-builder/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message ?? "Storefront AI request failed");
  }

  return payload as T;
}

export async function processBuilderMessage({
  session,
  message,
  templateOptions,
}: {
  session: BuilderSession;
  message: string;
  templateOptions: StorefrontTemplateOption[];
}): Promise<BuilderSessionResponse> {
  const recommendations =
    session.recommendations.length > 0
      ? session.recommendations
      : await api.recommendStorefrontTemplates({
          prompt: `${session.business_profile.business_name ?? ""} ${session.business_profile.description ?? ""}`.trim(),
          industry: session.business_profile.industry ?? undefined,
          tone: session.business_profile.tone,
          limit: 4,
        });

  const history = session.messages.slice(-8).map((entry) => ({
    role: entry.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: entry.content,
  }));

  const turn = await requestBuilderAi<BuilderAiTurn>({
    mode: "message",
    message,
    session,
    recommendations,
    template_options: templateOptions,
    history,
  });

  const response = await api.sendBuilderMessage(session.id, message, {
    business_profile: turn.business_profile,
    status: turn.status,
    assistant_message: turn.assistant_message,
    assistant_payload: turn.assistant_payload,
    selected_template_id: turn.selected_template_id ?? session.selected_template_id,
    storefront_snapshot: turn.storefront ?? session.storefront_snapshot,
  });

  if (!turn.storefront) return response;

  return {
    ...response,
    storefront: turn.storefront,
    session: response.session
      ? {
          ...response.session,
          status: turn.status,
          storefront_snapshot: turn.storefront,
          business_profile: turn.business_profile,
          selected_template_id: turn.selected_template_id ?? response.session.selected_template_id,
        }
      : response.session,
  };
}

export async function generateBuilderDraftForSession({
  session,
  store,
}: {
  session: BuilderSession;
  store?: BuilderSession["store"];
}): Promise<BuilderSessionResponse> {
  const recommendations =
    session.recommendations.length > 0
      ? session.recommendations
      : await api.recommendStorefrontTemplates({
          prompt: `${session.business_profile.business_name ?? ""} ${session.business_profile.description ?? ""}`.trim(),
          industry: session.business_profile.industry ?? undefined,
          tone: session.business_profile.tone,
          limit: 4,
        });

  const draft = await requestBuilderAi<{ storefront: StorefrontContent }>({
    mode: "draft",
    session,
    store,
    selected_template_id: session.selected_template_id,
    recommendations,
  });

  return api.generateBuilderDraft(session.id, {
    storefront: draft.storefront,
    selected_template_id: session.selected_template_id ?? undefined,
  });
}

export async function applyBuilderChatEditForSession({
  session,
  instruction,
}: {
  session: BuilderSession;
  instruction: string;
}): Promise<BuilderSessionResponse> {
  if (!session.storefront_snapshot) {
    throw new Error("Generate a draft before applying chat edits.");
  }

  const edit = await requestBuilderAi<{
    storefront: StorefrontContent;
    changed_paths: string[];
    assistant_message: string;
  }>({
    mode: "edit",
    instruction,
    storefront: session.storefront_snapshot,
  });

  return api.applyBuilderChatEdit(session.id, instruction, edit);
}

export async function generateStorefrontForStore({
  storeId,
  templateId,
  store,
  profile,
}: {
  storeId: string;
  templateId?: StorefrontTemplateId;
  store?: BuilderSession["store"];
  profile?: BuilderSession["business_profile"];
}): Promise<StorefrontContent> {
  const draft = await requestBuilderAi<{ storefront: StorefrontContent }>({
    mode: "draft",
    store,
    profile,
    selected_template_id: templateId ?? null,
  });

  return api.generateStorefront(storeId, templateId, draft.storefront);
}
