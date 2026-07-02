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
  | "switch_design"
  | "apply_brand_color"
  | "refine_website_copy"
  | "apply_stock_images"
  | "source_website_images"
  | "replace_template_images"
  | "add_products"
  | "generate_product_descriptions"
  | "process_product_image"
  | "generate_custom_site"
  | "edit_custom_site_code"
  | "change_font"
  | "ask_clarifying_question";

export type WebsiteBuilderToolDef = {
  name: WebsiteBuilderToolName;
  description: string;
  parameters: Record<string, unknown>;
  handler: (args: Record<string, unknown>, ctx: WebsiteBuilderContext) => Promise<Record<string, unknown>>;
};

export type WebsiteBuilderContext = {
  message: string;
  planIntent?: string;
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

export type AgentThinkingLogEntry = {
  id: string;
  ts: string;
  agent: "System" | "Interpreter" | "Planner" | "Executor" | "Critic";
  phase: "start" | "complete" | "error" | "info";
  title: string;
  detail?: string;
  data?: Record<string, unknown>;
};
