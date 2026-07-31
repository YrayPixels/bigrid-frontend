import { NextResponse } from "next/server";
import {
  createGuestChatSession,
  processGuestChatTurn,
  type GuestChatSession,
  validateGuestPreviewPrompt,
} from "@/lib/storefront-builder/guest-preview";

export const runtime = "nodejs";
export const maxDuration = 60;

type GuestPreviewRequest = {
  mode?: "chat" | "start";
  message?: string;
  session?: GuestChatSession | null;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as GuestPreviewRequest | null;

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid request." }, { status: 422 });
  }

  const mode = body.mode ?? "chat";

  try {
    if (mode === "start") {
      const session = createGuestChatSession();
      const message = typeof body.message === "string" ? body.message.trim() : "";
      if (!message) {
        return NextResponse.json({ session });
      }
      const validationError = validateGuestPreviewPrompt(message);
      if (validationError) {
        return NextResponse.json({ message: validationError }, { status: 422 });
      }
      const next = await processGuestChatTurn(session, message);
      return NextResponse.json({ session: next });
    }

    const message = typeof body.message === "string" ? body.message.trim() : "";
    const validationError = validateGuestPreviewPrompt(message);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 422 });
    }

    const session =
      body.session && typeof body.session === "object" && Array.isArray(body.session.messages)
        ? body.session
        : createGuestChatSession();

    const next = await processGuestChatTurn(session, message);
    return NextResponse.json({ session: next });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not continue the preview chat.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
