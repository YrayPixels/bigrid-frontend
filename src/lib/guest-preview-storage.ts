import type {
  GuestChatSession,
  GuestPreviewPayload,
} from "@/lib/storefront-builder/guest-preview-types";
import {
  GUEST_PREVIEW_STORAGE_KEY,
  GUEST_PREVIEW_TTL_MS,
  GUEST_PREVIEW_VISIT_KEY,
  sessionToPreviewPayload,
} from "@/lib/storefront-builder/guest-preview-types";

const LEGACY_STORAGE_KEYS = ["bizgrid_guest_preview_v1"] as const;

function canUseWindow(): boolean {
  return typeof window !== "undefined";
}

function parseSession(raw: string | null): GuestChatSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GuestChatSession;
    if (!parsed?.id || !Array.isArray(parsed.messages)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isExpired(session: GuestChatSession): boolean {
  const stamp = Date.parse(session.updated_at || session.created_at);
  if (!Number.isFinite(stamp)) return false;
  return Date.now() - stamp > GUEST_PREVIEW_TTL_MS;
}

function hasUserTurn(session: GuestChatSession): boolean {
  return session.messages.some((message) => message.role === "user");
}

function readRaw(): string | null {
  if (!canUseWindow()) return null;
  const local = window.localStorage.getItem(GUEST_PREVIEW_STORAGE_KEY);
  if (local) return local;
  const session = window.sessionStorage.getItem(GUEST_PREVIEW_STORAGE_KEY);
  if (session) {
    try {
      window.localStorage.setItem(GUEST_PREVIEW_STORAGE_KEY, session);
    } catch {
      // Quota or private mode — keep the sessionStorage copy.
    }
    return session;
  }
  return null;
}

function writeRaw(value: string) {
  if (!canUseWindow()) return;
  try {
    window.localStorage.setItem(GUEST_PREVIEW_STORAGE_KEY, value);
    window.sessionStorage.removeItem(GUEST_PREVIEW_STORAGE_KEY);
    return;
  } catch (error) {
    console.warn("[guest-preview] localStorage write failed, using sessionStorage", error);
  }
  try {
    window.sessionStorage.setItem(GUEST_PREVIEW_STORAGE_KEY, value);
  } catch (error) {
    console.warn("[guest-preview] failed to persist chat session", error);
  }
}

export function isGuestPreviewVisitActive(): boolean {
  if (!canUseWindow()) return false;
  return window.sessionStorage.getItem(GUEST_PREVIEW_VISIT_KEY) === "1";
}

export function markGuestPreviewVisitActive() {
  if (!canUseWindow()) return;
  window.sessionStorage.setItem(GUEST_PREVIEW_VISIT_KEY, "1");
}

export function isReadyGuestPreview(session: GuestChatSession | null): session is GuestChatSession {
  return Boolean(session && session.status === "ready" && session.store && session.storefront);
}

/** Ready store from a previous browser visit (sessionStorage visit flag is empty). */
export function isReturningReadyGuestPreview(session: GuestChatSession | null): boolean {
  return isReadyGuestPreview(session) && !isGuestPreviewVisitActive();
}

export function saveGuestChatSession(session: GuestChatSession) {
  if (!canUseWindow()) return;
  if (session.status === "collecting" && !hasUserTurn(session)) return;
  writeRaw(JSON.stringify(session));
  markGuestPreviewVisitActive();
}

export function loadGuestChatSession(): GuestChatSession | null {
  if (!canUseWindow()) return null;
  const parsed = parseSession(readRaw());
  if (!parsed) return null;
  if (isExpired(parsed)) {
    clearGuestPreview();
    return null;
  }
  return parsed;
}

/** Onboarding / signup helpers — only when a storefront draft exists. */
export function loadGuestPreview(): GuestPreviewPayload | null {
  const session = loadGuestChatSession();
  if (!session) return null;
  return sessionToPreviewPayload(session);
}

export function clearGuestPreview() {
  if (!canUseWindow()) return;
  window.localStorage.removeItem(GUEST_PREVIEW_STORAGE_KEY);
  window.sessionStorage.removeItem(GUEST_PREVIEW_STORAGE_KEY);
  window.sessionStorage.removeItem(GUEST_PREVIEW_VISIT_KEY);
  for (const key of LEGACY_STORAGE_KEYS) {
    window.sessionStorage.removeItem(key);
    window.localStorage.removeItem(key);
  }
}

/** @deprecated use saveGuestChatSession */
export function saveGuestPreview(preview: GuestPreviewPayload) {
  if (!canUseWindow()) return;
  const session: GuestChatSession = {
    id: preview.store.id || `guest_legacy_${Date.now().toString(36)}`,
    status: "ready",
    messages: [],
    profile: preview.profile,
    store: preview.store,
    storefront: preview.storefront,
    created_at: preview.created_at,
    updated_at: preview.created_at,
  };
  saveGuestChatSession(session);
}
