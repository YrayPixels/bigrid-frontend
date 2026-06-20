import type { BuilderSession, BuilderSessionStatus } from "@/lib/api/types";

export const BUILDER_WELCOME_MESSAGE =
  "Hi! Tell me about your business — what you sell, who it's for, and the vibe you want. I'll design and build your website.";

export const BUILDER_PAGE = {
  eyebrow: "AI Website Builder",
  title: "Build your website by chat",
  subtitle:
    "Describe your business in plain language. Preview your site on the right, then ask for changes — no design skills needed.",
} as const;

export const BUILDER_CHAT_HEADER = {
  title: "AI Website Builder",
  subtitle: "Chat here. Your website preview updates on the right.",
} as const;

const COLLECTING_PROMPTS = [
  "I sell handmade soy candles in Lagos. Warm, cozy, gift-friendly.",
  "Men's streetwear brand for people who like bold colors.",
  "Skincare for busy professionals — clean, premium, not flashy.",
] as const;

const BUILD_PROMPTS = [
  "build my website",
  "Go ahead and create my site",
  "I'm ready — build it",
] as const;

const REFINE_PROMPTS = [
  "Make the homepage more premium",
  "Change the button to Shop Gifts",
  "Rewrite the about section — we're a family business",
] as const;

const ONBOARDING_STEPS = {
  collecting: [
    "Describe your shop — what you sell and who it's for",
    "Share your business name if you have one",
    'Say "build my website" when you want your first draft',
  ],
  ready: [
    "Your business details are saved",
    'Say "build my website" to create your first draft',
    "Check the preview on the right when it's ready",
  ],
  refine: [
    "Your draft is in the preview panel",
    "Ask for one change at a time in plain language",
    "Try changing the headline, button text, or about section",
  ],
} as const;

function hasOnlyWelcomeMessage(session: BuilderSession): boolean {
  return (
    session.messages.length <= 1 &&
    session.messages.every(
      (message) =>
        message.role === "assistant" &&
        (message.payload?.type === "welcome" || message.content.includes("Tell me about your business")),
    )
  );
}

function builderPhase(session: BuilderSession): "collecting" | "ready" | "refine" {
  if (session.storefront_snapshot) return "refine";
  if (
    session.status === "template_recommendation" ||
    session.status === "products_pending" ||
    session.store
  ) {
    return "ready";
  }
  return "collecting";
}

export type BuilderChatCopy = {
  phase: "collecting" | "ready" | "refine";
  showOnboarding: boolean;
  onboardingTitle: string;
  onboardingSteps: readonly string[];
  suggestedPrompts: readonly string[];
  suggestedPromptsLabel: string;
  inputPlaceholder: string;
  loadingLabel: string;
};

export function getBuilderChatCopy(session: BuilderSession): BuilderChatCopy {
  const phase = builderPhase(session);
  const showOnboarding =
    phase !== "refine" && (hasOnlyWelcomeMessage(session) || session.messages.length <= 2);

  if (phase === "refine") {
    return {
      phase,
      showOnboarding,
      onboardingTitle: "Refine your website",
      onboardingSteps: ONBOARDING_STEPS.refine,
      suggestedPrompts: REFINE_PROMPTS,
      suggestedPromptsLabel: "Try asking for a change",
      inputPlaceholder:
        'Try "Make the homepage more premium" or "Change the button to Shop Gifts"',
      loadingLabel: "Updating your website...",
    };
  }

  if (phase === "ready") {
    return {
      phase,
      showOnboarding,
      onboardingTitle: "Ready to build",
      onboardingSteps: ONBOARDING_STEPS.ready,
      suggestedPrompts: BUILD_PROMPTS,
      suggestedPromptsLabel: "Ready? Try one of these",
      inputPlaceholder: 'Say "build my website" when you want your first draft...',
      loadingLabel: "Building your website...",
    };
  }

  return {
    phase,
    showOnboarding,
    onboardingTitle: "How it works",
    onboardingSteps: ONBOARDING_STEPS.collecting,
    suggestedPrompts: COLLECTING_PROMPTS,
    suggestedPromptsLabel: "Try one of these",
    inputPlaceholder:
      "Tell me about your business — what you sell, who it's for, and the vibe you want...",
    loadingLabel: "Thinking...",
  };
}

export function statusLoadingLabel(status: BuilderSessionStatus, generating: boolean): string {
  if (generating) return "Building your website...";
  if (status === "review_ready" || status === "content_generated") return "Updating your website...";
  return "Thinking...";
}
