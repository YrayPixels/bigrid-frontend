import { api } from "@/lib/api/client";
import type {
  BuilderSession,
  BuilderSessionResponse,
  StorefrontContent,
  StorefrontTemplateId,
  StorefrontTemplateOption,
} from "@/lib/api/types";
import {
  fallbackBuilderTurn,
  hasMinimumBusinessProfile,
  isBuildIntent,
  isEditIntent,
  mergeSessionProfile,
  resolveSelectedTemplateId,
} from "@/lib/storefront-builder/local-ai";

async function loadRecommendations(session: BuilderSession) {
  const profile = mergeSessionProfile(session);
  if (session.recommendations.length > 0) {
    return session.recommendations;
  }

  return api.recommendStorefrontTemplates({
    prompt: `${profile.business_name ?? ""} ${profile.description ?? ""}`.trim(),
    industry: profile.industry ?? undefined,
    tone: profile.tone,
    limit: 4,
  });
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
  const enrichedSession: BuilderSession = {
    ...session,
    business_profile: mergeSessionProfile(session),
  };
  const availableTemplateIds = templateOptions
    .filter((option) => option.value !== "ai_pick")
    .map((option) => option.value as StorefrontTemplateId);
  const recommendations = await loadRecommendations(enrichedSession);

  if (session.storefront_snapshot) {
    if (isBuildIntent(message)) {
      return generateBuilderDraftForSession({
        session: enrichedSession,
        store: enrichedSession.store,
        templateOptions,
        recommendations,
      });
    }

    if (isEditIntent(message)) {
      return applyBuilderChatEditForSession({ session: enrichedSession, instruction: message });
    }

    return api.sendBuilderMessage(session.id, message);
  }

  if (isBuildIntent(message) && !session.storefront_snapshot) {
    if (!hasMinimumBusinessProfile(enrichedSession.business_profile)) {
      const fallback = fallbackBuilderTurn({
        message,
        session: enrichedSession,
        recommendations,
        availableTemplateIds,
      });

      return api.sendBuilderMessage(session.id, message, {
        business_profile: fallback.business_profile,
        status: fallback.status,
        assistant_message: fallback.assistant_message,
        assistant_payload: fallback.assistant_payload,
        selected_template_id: fallback.selected_template_id ?? session.selected_template_id,
      });
    }

    return generateBuilderDraftForSession({
      session: enrichedSession,
      store: enrichedSession.store,
      templateOptions,
      recommendations,
    });
  }

  try {
    return await api.sendBuilderMessage(session.id, message);
  } catch (error) {
    const fallback = fallbackBuilderTurn({
      message,
      session: enrichedSession,
      recommendations,
      availableTemplateIds,
    });

    const response = await api.sendBuilderMessage(session.id, message, {
      business_profile: fallback.business_profile,
      status: fallback.status,
      assistant_message: fallback.assistant_message,
      assistant_payload: fallback.assistant_payload,
      selected_template_id: fallback.selected_template_id ?? session.selected_template_id,
      storefront_snapshot: fallback.storefront ?? session.storefront_snapshot,
    });

    if (!fallback.storefront) return response;

    return {
      ...response,
      storefront: fallback.storefront,
      session: response.session
        ? {
            ...response.session,
            status: fallback.status,
            storefront_snapshot: fallback.storefront,
            business_profile: fallback.business_profile,
            selected_template_id: fallback.selected_template_id ?? response.session.selected_template_id,
          }
        : response.session,
    };
  }
}

export async function generateBuilderDraftForSession({
  session,
  store,
  templateOptions = [],
  recommendations: initialRecommendations,
}: {
  session: BuilderSession;
  store?: BuilderSession["store"];
  templateOptions?: StorefrontTemplateOption[];
  recommendations?: BuilderSession["recommendations"];
}): Promise<BuilderSessionResponse> {
  const enrichedSession: BuilderSession = {
    ...session,
    business_profile: mergeSessionProfile(session),
    store: store ?? session.store,
  };
  const recommendations = initialRecommendations ?? (await loadRecommendations(enrichedSession));
  const availableTemplateIds = templateOptions
    .filter((option) => option.value !== "ai_pick")
    .map((option) => option.value as StorefrontTemplateId);
  const selectedTemplateId = resolveSelectedTemplateId(
    enrichedSession,
    recommendations,
    availableTemplateIds,
  );

  return api.generateBuilderDraft(session.id, {
    selected_template_id: selectedTemplateId ?? undefined,
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

  return api.applyBuilderChatEdit(session.id, instruction);
}

export async function generateStorefrontForStore({
  storeId,
  templateId,
}: {
  storeId: string;
  templateId?: StorefrontTemplateId;
}): Promise<StorefrontContent> {
  const response = await api.generateStorefront(storeId, templateId);
  return response;
}
