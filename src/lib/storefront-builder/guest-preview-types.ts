import type {
  BuilderBusinessProfile,
  Store,
  StorefrontContent,
} from "@/lib/api/types";

export const GUEST_PREVIEW_STORAGE_KEY = "bizgrid_guest_preview_v2";
export const GUEST_PREVIEW_PRODUCT_COUNT = 10;

export type GuestChatStatus =
  | "collecting"
  | "awaiting_name"
  | "generating"
  | "ready";

export type GuestChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type GuestChatProfile = BuilderBusinessProfile & {
  /** What they sell, kept separate from marketing description. */
  product_focus?: string | null;
};

export type GuestChatSession = {
  id: string;
  status: GuestChatStatus;
  messages: GuestChatMessage[];
  profile: GuestChatProfile;
  store: Store | null;
  storefront: StorefrontContent | null;
  created_at: string;
  updated_at: string;
};

export type GuestPreviewPayload = {
  prompt: string;
  profile: GuestChatProfile;
  store: Store;
  storefront: StorefrontContent;
  created_at: string;
};

function uid(): string {
  return `guest_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function makeGuestMessage(
  role: "user" | "assistant",
  content: string,
): GuestChatMessage {
  return { id: uid(), role, content, created_at: nowIso() };
}

export function createGuestChatSession(): GuestChatSession {
  const created = nowIso();
  return {
    id: uid(),
    status: "collecting",
    messages: [
      makeGuestMessage(
        "assistant",
        "Hi! Tell me what you sell and who it's for — for example: handmade clothes, soy candles, or skincare for busy professionals. I'll ask for your brand name next, then build a live storefront preview.",
      ),
    ],
    profile: {},
    store: null,
    storefront: null,
    created_at: created,
    updated_at: created,
  };
}

export function sessionToPreviewPayload(session: GuestChatSession): GuestPreviewPayload | null {
  if (!session.store || !session.storefront) return null;
  return {
    prompt: session.profile.product_focus ?? session.profile.description ?? "",
    profile: session.profile,
    store: session.store,
    storefront: session.storefront,
    created_at: session.created_at,
  };
}
