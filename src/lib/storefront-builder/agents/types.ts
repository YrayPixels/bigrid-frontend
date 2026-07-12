import type {
  BuilderBusinessProfile,
  BuilderSession,
  StorefrontContent,
  StorefrontTemplateId,
  StorefrontTemplateOption,
  StorefrontTemplateRecommendation,
} from "@/lib/api/types";
import type { BoltStreamCallbacks } from "@/lib/bolt/bolt-stream";
import type { WorkbenchContextHints } from "@/lib/bolt/select-context";
import type { BuilderChatHistoryEntry } from "@/lib/storefront-builder/chat-history";

export type WebsiteBuilderToolName =
  // Business
  | "capture_business_details"
  | "design_website"
  | "ask_clarifying_question"
  // Generation
  | "generate_website"
  | "switch_design"
  // Branding
  | "apply_brand_color"
  | "change_font"
  | "update_theme_style"
  // Content
  | "refine_website_copy"
  // Images
  | "apply_stock_images"
  | "source_website_images"
  | "replace_template_images"
  // Products (create / describe / vision)
  | "add_products"
  | "generate_product_descriptions"
  | "process_product_image"
  // Catalog
  | "list_products"
  | "update_product"
  | "archive_product"
  | "delete_product"
  | "set_product_variants"
  | "manage_categories"
  | "link_category_showcase"
  | "duplicate_product"
  // Structure
  | "update_page_section"
  | "regenerate_section"
  | "reorder_page_blocks"
  | "add_page_block"
  | "remove_page_block"
  // Launch
  | "get_storefront_readiness"
  | "publish_website"
  | "update_store_profile"
  // Insights
  | "get_store_metrics"
  | "list_orders"
  | "get_order"
  | "update_order_status"
  | "suggest_site_improvements"
  // Custom site
  | "generate_custom_site"
  | "edit_custom_site_code";

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
  lockedPaths?: string[];
  boltStream?: BoltStreamCallbacks;
  chatHistory?: BuilderChatHistoryEntry[];
  contextHints?: WorkbenchContextHints;
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
