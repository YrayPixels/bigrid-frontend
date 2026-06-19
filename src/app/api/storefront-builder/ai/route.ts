import { NextResponse } from "next/server";
import type {
  BuilderSession,
  Store,
  StorefrontContent,
  StorefrontTemplateId,
  StorefrontTemplateOption,
  StorefrontTemplateRecommendation,
} from "@/lib/api/types";
import { StorefrontBuilderManager } from "@/lib/storefront-builder/agents/StorefrontBuilderManager";
import { applyStorefrontEdit, profileToStore, synthesizeStorefront } from "@/lib/storefront-builder/local-ai";

type MessageRequest = {
  mode: "message";
  message: string;
  session: BuilderSession;
  recommendations: StorefrontTemplateRecommendation[];
  template_options: StorefrontTemplateOption[];
  history?: Array<{ role: "user" | "assistant"; content: string }>;
};

type DraftRequest = {
  mode: "draft";
  session?: BuilderSession;
  store?: Store;
  selected_template_id?: StorefrontTemplateId | null;
  recommendations?: StorefrontTemplateRecommendation[];
};

type EditRequest = {
  mode: "edit";
  instruction: string;
  storefront: StorefrontContent;
};

type AiRequest = MessageRequest | DraftRequest | EditRequest;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as AiRequest | null;

  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid request." }, { status: 422 });
  }

  if (body.mode === "message") {
    const manager = new StorefrontBuilderManager();
    const turn = await manager.runTurn({
      message: body.message,
      session: body.session,
      recommendations: body.recommendations,
      templateOptions: body.template_options,
      history: body.history,
    });
    return NextResponse.json(turn);
  }

  if (body.mode === "draft") {
    const store =
      body.store ??
      profileToStore(
        body.session?.business_profile ?? {},
        body.selected_template_id ?? body.session?.selected_template_id,
      );
    const draftStore: Store = {
      ...store,
      storefront_template_id: body.selected_template_id ?? body.session?.selected_template_id ?? store.storefront_template_id,
    };
    return NextResponse.json({
      storefront: synthesizeStorefront(
        draftStore,
        body.recommendations ?? body.session?.recommendations ?? [],
      ),
    });
  }

  if (body.mode === "edit") {
    return NextResponse.json(applyStorefrontEdit(body.storefront, body.instruction));
  }

  return NextResponse.json({ message: "Unsupported AI builder mode." }, { status: 422 });
}
