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
  sanitizeBusinessProfile,
  synthesizeStorefront,
} from "@/lib/storefront-builder/local-ai";
import { streamBuilderThinkingTurn } from "@/lib/storefront-builder/thinking-stream";
import { buildBuilderChatHistory, type BuilderChatHistoryEntry } from "@/lib/storefront-builder/chat-history";
import { alignStorefrontTemplateToSelection } from "@/lib/storefront/template";
import { websiteBuilderToolsForSession } from "@/lib/storefront-builder/agents/tools";
import { seedBuildItUpIfNeeded } from "@/lib/bolt/seed-template";
import { asBoltTemplateId } from "@/lib/bolt/templates";
import { needsBoltTemplateSeed } from "@/lib/bolt/project-utils";
import type { BoltStreamCallbacks } from "@/lib/bolt/bolt-stream";
import type { WorkbenchContextHints } from "@/lib/bolt/select-context";
import { mergeLiveCodeFsIntoSession, mergeLiveCodeFsIntoStorefront } from "@/lib/bolt/workbench-context";
import { attachBoltTemplateToStorefront } from "@/lib/storefront/bolt-template-storefront";
import { resolveStorefrontTemplateType } from "@/lib/storefront/template-registry";
import { codeFs, type CodeFile } from "@/lib/code-fs";

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
    logoUrl?: string | null;
  },
): boolean {
  return !extras?.brandColor && !extras?.mediaUpdates && extras?.logoUrl === undefined;
}

function isBoltCustomRequest(session: BuilderSession, message: string): boolean {
  const snapshot = session.storefront_snapshot as Record<string, unknown> | null;
  const hasCustom =
    Array.isArray(snapshot?.custom_files) ||
    (typeof snapshot?.custom_code === "string" && (snapshot.custom_code as string).trim().length > 0);
  if (hasCustom) return true;
  return /\bcustom\b|\bfrom scratch\b|\bcode\b|\bhtml\b|\bcss\b|\bjs\b/i.test(message);
}

async function runBoltCustomTurn(args: {
  session: BuilderSession;
  message: string;
  templateOptions: StorefrontTemplateOption[];
  recommendations: BuilderSession["recommendations"];
  lockedPaths?: string[];
  boltStream?: BoltStreamCallbacks;
  chatHistory?: BuilderChatHistoryEntry[];
  contextHints?: WorkbenchContextHints;
}): Promise<BuilderAiTurn> {
  const { session, message, templateOptions, recommendations, lockedPaths, boltStream, chatHistory, contextHints } =
    args;
  const toolDefs = websiteBuilderToolsForSession(session);
  const generateTool = toolDefs.find((t) => t.name === "generate_custom_site");
  const editTool = toolDefs.find((t) => t.name === "edit_custom_site_code");
  if (!generateTool) {
    return {
      business_profile: session.business_profile,
      status: session.status,
      assistant_message: "Custom code tools are not enabled for this session.",
      assistant_payload: { type: "conversation" },
      storefront: session.storefront_snapshot ?? undefined,
    };
  }

  const enrichedProfile = sanitizeBusinessProfile(session.business_profile ?? {});
  const storefrontWithLive = mergeLiveCodeFsIntoStorefront(session.storefront_snapshot) as
    | StorefrontContent
    | null
    | undefined;
  const ctx = {
    message,
    planIntent: "bolt_custom",
    session: { ...session, storefront_snapshot: storefrontWithLive ?? session.storefront_snapshot },
    profile: enrichedProfile,
    recommendations: recommendations as never,
    templateOptions,
    selectedTemplateId:
      session.selected_template_id && session.selected_template_id !== "ai_pick"
        ? (session.selected_template_id as StorefrontTemplateId)
        : null,
    storefront: storefrontWithLive ?? session.storefront_snapshot,
    assistantMessage: "",
    status: session.status,
    payload: { type: "agent_turn", plan: [], tool_calls: [], tool_results: [] },
    lockedPaths,
    boltStream,
    chatHistory,
    contextHints,
  };

  const snapshot = (storefrontWithLive ?? session.storefront_snapshot) as Record<string, unknown> | null;
  const liveFiles = codeFs.exportFiles();

  let hasCustom =
    liveFiles.length > 0 ||
    Array.isArray(snapshot?.custom_files) ||
    (typeof snapshot?.custom_code === "string" && (snapshot.custom_code as string).trim().length > 0);

  // Only seed when the live editor is empty — never clobber in-memory edits.
  const filesForSeedCheck =
    liveFiles.length > 0
      ? liveFiles
      : Array.isArray(snapshot?.custom_files)
        ? (snapshot.custom_files as CodeFile[])
        : [];

  if (liveFiles.length === 0 && (!hasCustom || needsBoltTemplateSeed(filesForSeedCheck))) {
    const boltTemplateId =
      asBoltTemplateId(ctx.selectedTemplateId ?? undefined) ??
      asBoltTemplateId(session.selected_template_id ?? undefined);
    const didSeed = await seedBuildItUpIfNeeded(filesForSeedCheck, boltTemplateId);

    if (didSeed) {
      const seededFiles = codeFs.exportFiles();
      // Ensure a storefront snapshot exists so we can persist the starter template.
      if (!ctx.storefront) {
        const available = templateOptions
          .filter((option) => option.value !== "ai_pick")
          .map((option) => option.value as StorefrontTemplateId);
        const selectedTemplateId =
          ctx.selectedTemplateId ?? (available[0] ?? null);
        ctx.selectedTemplateId = selectedTemplateId;
        const store = session.store ?? profileToStore(ctx.profile, selectedTemplateId ?? undefined);
        ctx.storefront = synthesizeStorefront(store, recommendations as never);
      }

      // Ensure the session snapshot persists the starter template immediately.
      const storefrontRecord = ctx.storefront as Record<string, unknown>;
      storefrontRecord.custom_files = seededFiles;
      storefrontRecord.custom_code = codeFs.getMainHtml();
      hasCustom = true;
    }
  }

  const tool = hasCustom && editTool ? editTool : generateTool;
  const toolName = tool.name;
  const toolArgs =
    toolName === "generate_custom_site"
      ? { style_note: message }
      : { instruction: message };

  // Keep the session snapshot aligned with live editor state before the edit tool runs.
  if (ctx.storefront && toolName === "edit_custom_site_code") {
    const storefrontRecord = ctx.storefront as Record<string, unknown>;
    const liveFiles = codeFs.exportFiles();
    if (liveFiles.length > 0) {
      storefrontRecord.custom_files = liveFiles;
      storefrontRecord.custom_code = codeFs.getMainHtml();
    }
  }

  const result = await tool.handler(toolArgs as never, ctx as never);

  // Tool handlers mutate ctx.storefront / ctx.profile / ctx.payload / ctx.assistantMessage.
  const next: BuilderAiTurn = {
    business_profile: ctx.profile,
    status: ctx.status,
    selected_template_id: ctx.selectedTemplateId,
    storefront: mergeLiveCodeFsIntoStorefront(ctx.storefront) as StorefrontContent | undefined,
    assistant_message:
      ctx.assistantMessage ||
      (result.ok === false
        ? "I couldn’t update the custom site. Try again with a more specific request."
        : "Done — your custom site is updated. Check the preview."),
    assistant_payload: {
      ...(ctx.payload ?? {}),
      tool_calls: [{ name: toolName, arguments: toolArgs }],
      tool_results: [{ name: toolName, ...result }],
    },
  };

  return next;
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
  const snapshot = mergeLiveCodeFsIntoStorefront(
    turn.storefront ?? session.storefront_snapshot,
  ) as StorefrontContent | undefined;
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
  boltStream,
  lockedPaths,
  contextHints,
}: {
  session: BuilderSession;
  message: string;
  templateOptions: StorefrontTemplateOption[];
  onLog?: (entry: AgentThinkingLogEntry) => void;
  boltStream?: BoltStreamCallbacks;
  lockedPaths?: string[];
  contextHints?: WorkbenchContextHints;
  signal?: AbortSignal;
}): Promise<BuilderSessionResponse> {
  const enrichedSession = mergeLiveCodeFsIntoSession({
    ...session,
    business_profile: mergeSessionProfile(session),
  });

  const recommendations = await loadRecommendations(enrichedSession);
  const chatHistory = buildBuilderChatHistory(enrichedSession.messages);

  const turn = await runBoltCustomTurn({
    session: enrichedSession,
    message,
    templateOptions,
    recommendations: recommendations as never,
    lockedPaths,
    boltStream,
    chatHistory,
    contextHints,
  });

  return persistAgentTurn({
    session,
    message,
    turn,
    thinkingLog: [],
  });
}

export async function processBuilderMessage({
  session,
  message,
  templateOptions,
  brandColor,
  mediaUpdates,
  logoUrl,
}: {
  session: BuilderSession;
  message: string;
  templateOptions: StorefrontTemplateOption[];
  brandColor?: string;
  mediaUpdates?: Partial<Record<BuilderMediaTarget, string>>;
  logoUrl?: string | null;
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
    ...(logoUrl !== undefined ? { logo_url: logoUrl } : {}),
  };

  if (brandColor || mediaUpdates || logoUrl !== undefined) {
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
  let storefront = synthesizeStorefront(draftStore, recommendations);
  const concreteTemplateId = asConcreteTemplateId(selectedTemplateId ?? undefined);

  if (concreteTemplateId && resolveStorefrontTemplateType(concreteTemplateId, templateOptions) === "bolt") {
    storefront = await attachBoltTemplateToStorefront(storefront, concreteTemplateId);
  }

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

export async function applyBuilderLogo({
  session,
  url,
}: {
  session: BuilderSession;
  url: string;
}): Promise<BuilderSessionResponse> {
  return processBuilderMessage({
    session,
    message: "Use this as my website logo",
    templateOptions: STOREFRONT_TEMPLATE_OPTIONS,
    logoUrl: url,
  });
}

export async function removeBuilderLogo({
  session,
}: {
  session: BuilderSession;
}): Promise<BuilderSessionResponse> {
  return processBuilderMessage({
    session,
    message: "Remove my logo",
    templateOptions: STOREFRONT_TEMPLATE_OPTIONS,
    logoUrl: null,
  });
}

export { fallbackSuggestedActions, getLatestSuggestedActions } from "@/lib/storefront-builder/suggested-actions";
export type { BoltStreamCallbacks } from "@/lib/bolt/bolt-stream";
export type { WorkbenchContextHints } from "@/lib/bolt/select-context";

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
