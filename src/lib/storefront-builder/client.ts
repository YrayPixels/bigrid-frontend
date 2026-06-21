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
import { StorefrontBuilderManager } from "@/lib/storefront-builder/agents/StorefrontBuilderManager";
import type { BuilderAiTurn } from "@/lib/storefront-builder/local-ai";
import {
  fallbackBuilderTurn,
  hasMinimumBusinessProfile,
  mergeSessionProfile,
  profileToStore,
  resolveSelectedTemplateId,
  synthesizeStorefront,
} from "@/lib/storefront-builder/local-ai";
import { streamBuilderThinkingTurn } from "@/lib/storefront-builder/thinking-stream";
import { buildBuilderChatHistory } from "@/lib/storefront-builder/chat-history";
import { alignStorefrontTemplateToSelection } from "@/lib/storefront/template";

export function asConcreteTemplateId(value: string | null | undefined): StorefrontTemplateId | undefined {
  if (!value || value === "ai_pick") return undefined;
  return value as StorefrontTemplateId;
}

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
  extras?: {
    brandColor?: string;
    mediaUpdates?: Partial<Record<BuilderMediaTarget, string>>;
  },
): boolean {
  return !extras?.brandColor && !extras?.mediaUpdates;
}

async function persistAgentTurn({
  session,
  message,
  turn,
  thinkingLog = [],
}: {
  session: BuilderSession;
  message: string;
  turn: BuilderAiTurn;
  thinkingLog?: AgentThinkingLogEntry[];
}): Promise<BuilderSessionResponse> {
  const rawTemplateId = turn.selected_template_id ?? session.selected_template_id;
  const selectedTemplateId = asConcreteTemplateId(rawTemplateId ?? undefined);
  const snapshot = turn.storefront ?? session.storefront_snapshot ?? undefined;
  const templateId =
    asConcreteTemplateId(snapshot?.template?.id) ?? selectedTemplateId ?? null;

  return api.sendBuilderMessage(session.id, message, {
    business_profile: turn.business_profile,
    status: turn.status,
    assistant_message: turn.assistant_message,
    assistant_payload: {
      ...turn.assistant_payload,
      thinking_log: thinkingLog,
      user_message: message,
    },
    ...(selectedTemplateId ? { selected_template_id: selectedTemplateId } : {}),
    storefront_snapshot: templateId
      ? alignStorefrontTemplateToSelection(snapshot ?? null, templateId) ?? snapshot
      : snapshot,
  });
}

export async function runBuilderAgentTurn({
  session,
  message,
  templateOptions,
  history,
  onLog,
}: {
  session: BuilderSession;
  message: string;
  templateOptions: StorefrontTemplateOption[];
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  onLog?: (entry: AgentThinkingLogEntry) => void;
}): Promise<BuilderAiTurn> {
  const recommendations = await loadRecommendations(session);
  const manager = new StorefrontBuilderManager(undefined, onLog);
  return manager.runTurn({
    message,
    session,
    recommendations,
    templateOptions,
    history,
  });
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
  const history = buildBuilderChatHistory(session.messages);

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

  return persistAgentTurn({
    session,
    message,
    turn,
    thinkingLog,
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

  if (brandColor || mediaUpdates) {
    return api.sendBuilderMessage(session.id, message, extras);
  }

  if (!session.storefront_snapshot && !hasMinimumBusinessProfile(enrichedSession.business_profile)) {
    const fallback = fallbackBuilderTurn({
      message,
      session: enrichedSession,
      recommendations,
      availableTemplateIds,
    });

    const fallbackTemplateId = asConcreteTemplateId(fallback.selected_template_id ?? undefined);
    const sessionTemplateId = asConcreteTemplateId(session.selected_template_id ?? undefined);

    return api.sendBuilderMessage(session.id, message, {
      business_profile: fallback.business_profile,
      status: fallback.status,
      assistant_message: fallback.assistant_message,
      assistant_payload: fallback.assistant_payload,
      ...(fallbackTemplateId ?? sessionTemplateId
        ? { selected_template_id: fallbackTemplateId ?? sessionTemplateId }
        : {}),
    });
  }

  const history = buildBuilderChatHistory(session.messages);

  try {
    const turn = await runBuilderAgentTurn({
      session: enrichedSession,
      message,
      templateOptions,
      history,
    });
    return persistAgentTurn({ session, message, turn });
  } catch {
    if (!session.storefront_snapshot) {
      return generateBuilderDraftForSession({
        session: enrichedSession,
        store: enrichedSession.store,
        templateOptions,
        recommendations,
      });
    }

    return api.sendBuilderMessage(session.id, message, {
      assistant_message:
        "I hit a snag running that update — try again, or tell me more specifically what you'd like to change.",
      assistant_payload: { type: "conversation" },
      status: session.status,
    });
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
  const draftStore =
    enrichedSession.store ??
    profileToStore(enrichedSession.business_profile, selectedTemplateId ?? undefined);
  const storefront = synthesizeStorefront(draftStore, recommendations);
  const concreteTemplateId = asConcreteTemplateId(selectedTemplateId ?? undefined);

  return api.generateBuilderDraft(session.id, {
    storefront,
    selected_template_id: concreteTemplateId,
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

export { fallbackSuggestedActions, getLatestSuggestedActions } from "@/lib/storefront-builder/suggested-actions";

export async function generateStorefrontForStore({
  storeId,
  templateId,
}: {
  storeId: string;
  templateId?: StorefrontTemplateId;
}): Promise<StorefrontContent> {
  const response = await api.generateStorefront(storeId, templateId);
  return response.storefront!;
}
