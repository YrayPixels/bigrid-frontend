import { api } from "@/lib/api/client";
import type {
  BuilderMediaTarget,
  BuilderSession,
  BuilderSessionResponse,
  StorefrontContent,
  StorefrontTemplateId,
  StorefrontTemplateOption,
} from "@/lib/api/types";
import { STOREFRONT_TEMPLATE_OPTIONS } from "@/lib/api/types";
import type { AgentThinkingLogEntry } from "@/lib/storefront-builder/agents/types";
import {
  extractColorFromMessage,
  fallbackBuilderTurn,
  hasMinimumBusinessProfile,
  isBuildIntent,
  isColorIntent,
  isEditIntent,
  isImageIntent,
  isProductIntent,
  isStockImageIntent,
  mergeSessionProfile,
  resolveSelectedTemplateId,
} from "@/lib/storefront-builder/local-ai";
import { streamBuilderThinkingTurn } from "@/lib/storefront-builder/thinking-stream";

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

export function shouldStreamBuilderThinking(
  message: string,
  extras?: {
    brandColor?: string;
    mediaUpdates?: Partial<Record<BuilderMediaTarget, string>>;
  },
): boolean {
  if (extras?.brandColor || extras?.mediaUpdates) return false;
  if (isColorIntent(message) && extractColorFromMessage(message)) return false;
  if (isStockImageIntent(message)) return false;
  if (isProductIntent(message)) return false;
  return true;
}

export async function streamAndPersistBuilderMessage({
  session,
  message,
  templateOptions,
  onLog,
  signal,
}: {
  session: BuilderSession;
  message: string;
  templateOptions: StorefrontTemplateOption[];
  onLog?: (entry: AgentThinkingLogEntry) => void;
  signal?: AbortSignal;
}): Promise<BuilderSessionResponse> {
  const enrichedSession: BuilderSession = {
    ...session,
    business_profile: mergeSessionProfile(session),
  };
  const recommendations = await loadRecommendations(enrichedSession);
  const history = session.messages
    .slice(-8)
    .map((entry) => ({
      role: entry.role,
      content: entry.content,
    }))
    .filter((entry): entry is { role: "user" | "assistant"; content: string } =>
      entry.role === "user" || entry.role === "assistant",
    );

  const thinkingLog: AgentThinkingLogEntry[] = [];

  const turn = await streamBuilderThinkingTurn({
    message,
    session: enrichedSession,
    recommendations,
    templateOptions,
    history,
    signal,
    onLog: (entry) => {
      thinkingLog.push(entry);
      onLog?.(entry);
    },
  });

  return api.sendBuilderMessage(session.id, message, {
    business_profile: turn.business_profile,
    status: turn.status,
    assistant_message: turn.assistant_message,
    assistant_payload: {
      ...turn.assistant_payload,
      thinking_log: thinkingLog,
      user_message: message,
    },
    selected_template_id: turn.selected_template_id ?? session.selected_template_id,
    storefront_snapshot: turn.storefront ?? session.storefront_snapshot,
  });
}

export async function processBuilderMessage({
  session,
  message,
  templateOptions,
  brandColor,
  mediaUpdates,
}: {
  session: BuilderSession;
  message: string;
  templateOptions: StorefrontTemplateOption[];
  brandColor?: string;
  mediaUpdates?: Partial<Record<BuilderMediaTarget, string>>;
}): Promise<BuilderSessionResponse> {
  const enrichedSession: BuilderSession = {
    ...session,
    business_profile: mergeSessionProfile(session),
  };
  const availableTemplateIds = templateOptions
    .filter((option) => option.value !== "ai_pick")
    .map((option) => option.value as StorefrontTemplateId);
  const recommendations = await loadRecommendations(enrichedSession);
  const extras = {
    ...(brandColor ? { brand_color: brandColor } : {}),
    ...(mediaUpdates ? { media_updates: mediaUpdates } : {}),
  };

  if (session.storefront_snapshot && session.store) {
    if (isBuildIntent(message)) {
      return api.sendBuilderMessage(session.id, message);
    }

    if (brandColor || mediaUpdates) {
      return api.sendBuilderMessage(session.id, message, extras);
    }

    if (isStockImageIntent(message)) {
      return api.sendBuilderMessage(session.id, message, { apply_stock_images: true });
    }

    if (isProductIntent(message)) {
      return api.sendBuilderMessage(session.id, message);
    }

    if (isColorIntent(message)) {
      const color = extractColorFromMessage(message) ?? brandColor;
      if (color) {
        return api.sendBuilderMessage(session.id, message, { brand_color: color });
      }
    }

    if (isEditIntent(message)) {
      return applyBuilderChatEditForSession({ session: enrichedSession, instruction: message });
    }

    return api.sendBuilderMessage(session.id, message, extras);
  }

  if (brandColor || mediaUpdates) {
    return api.sendBuilderMessage(session.id, message, extras);
  }

  if (isColorIntent(message)) {
    const color = extractColorFromMessage(message);
    if (color) {
      return api.sendBuilderMessage(session.id, message, { brand_color: color });
    }
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

export async function applyBuilderBrandColor({
  session,
  color,
  label,
}: {
  session: BuilderSession;
  color: string;
  label?: string;
}): Promise<BuilderSessionResponse> {
  const message = label
    ? `Use ${label} (${color}) as my brand color`
    : `Use ${color} as my brand color`;
  return processBuilderMessage({
    session,
    message,
    templateOptions: STOREFRONT_TEMPLATE_OPTIONS,
    brandColor: color,
  });
}

export async function applyBuilderMedia({
  session,
  target,
  url,
}: {
  session: BuilderSession;
  target: BuilderMediaTarget;
  url: string;
}): Promise<BuilderSessionResponse> {
  const label = target === "media.hero_image_url" ? "homepage header" : "about section";
  return processBuilderMessage({
    session,
    message: `Use this photo for my ${label}`,
    templateOptions: STOREFRONT_TEMPLATE_OPTIONS,
    mediaUpdates: { [target]: url },
  });
}

// re-export for page usage without circular imports from types-only paths
export { fallbackSuggestedActions, getLatestSuggestedActions } from "@/lib/storefront-builder/suggested-actions";

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
