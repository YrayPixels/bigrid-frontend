import type {
  BuilderBusinessProfile,
  BuilderSession,
  StorefrontContent,
  StorefrontTemplateId,
  StorefrontTemplateOption,
  StorefrontTemplateRecommendation,
} from "@/lib/api/types";

export type WebsiteBuilderToolName =
  | "capture_business_details"
  | "design_website"
  | "generate_website"
  | "refine_website_copy"
  | "ask_clarifying_question";

export type WebsiteBuilderToolDef = {
  name: WebsiteBuilderToolName;
  description: string;
  parameters: Record<string, unknown>;
  handler: (args: Record<string, unknown>, ctx: WebsiteBuilderContext) => Promise<Record<string, unknown>>;
};

export type WebsiteBuilderContext = {
  message: string;
  session: BuilderSession;
  profile: BuilderBusinessProfile;
  recommendations: StorefrontTemplateRecommendation[];
  templateOptions: StorefrontTemplateOption[];
  selectedTemplateId: StorefrontTemplateId | null;
  storefront: StorefrontContent | null;
  assistantMessage: string;
  status: BuilderSession["status"];
  payload: Record<string, unknown>;
};

export type AgentActivityPayload = {
  agent: "Interpreter" | "Planner" | "Executor" | "Critic";
  phase: string;
  title: string;
  detail?: string;
};
