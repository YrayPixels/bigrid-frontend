import type {
  GuestChatSession,
  GuestPreviewPayload,
} from "@/lib/storefront-builder/guest-preview-types";
import {
  GUEST_PREVIEW_STORAGE_KEY,
  sessionToPreviewPayload,
} from "@/lib/storefront-builder/guest-preview-types";

export function saveGuestChatSession(session: GuestChatSession) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(GUEST_PREVIEW_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    console.warn("[guest-preview] failed to persist chat session", error);
  }
}

export function loadGuestChatSession(): GuestChatSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(GUEST_PREVIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestChatSession;
    if (!parsed?.id || !Array.isArray(parsed.messages)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Onboarding / signup helpers — only when a storefront draft exists. */
export function loadGuestPreview(): GuestPreviewPayload | null {
  const session = loadGuestChatSession();
  if (!session) return null;
  return sessionToPreviewPayload(session);
}

export function clearGuestPreview() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(GUEST_PREVIEW_STORAGE_KEY);
  // Clear legacy key from the one-shot preview experiment.
  window.sessionStorage.removeItem("bizgrid_guest_preview_v1");
}

/** @deprecated use saveGuestChatSession */
export function saveGuestPreview(preview: GuestPreviewPayload) {
  if (typeof window === "undefined") return;
  const session: GuestChatSession = {
    id: `guest_legacy_${Date.now().toString(36)}`,
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
