import type { BuilderSession } from "@/lib/api/types";
import { isCodeWorkbenchEnabled } from "@/lib/features";
import type { WebsiteBuilderToolDef } from "../types";
import { BrandingTools } from "./BrandingTools";
import { BusinessTools } from "./BusinessTools";
import { CatalogTools } from "./CatalogTools";
import { CommerceTools } from "./CommerceTools";
import { ContentTools } from "./ContentTools";
import { CustomSiteTools } from "./CustomSiteTools";
import { GenerationTools } from "./GenerationTools";
import { ImageTools } from "./ImageTools";
import { InsightsTools } from "./InsightsTools";
import { LaunchTools } from "./LaunchTools";
import { ProductTools } from "./ProductTools";
import { StructureTools } from "./StructureTools";

const COMMERCE_OPS_TOOL_NAMES = [
  "list_customers",
  "get_customer",
  "list_discounts",
  "create_discount",
  "update_discount",
  "get_payment_settings",
  "update_payment_settings",
  "list_domains",
  "add_domain",
  "verify_domain",
  "list_abandoned_carts",
  "get_traffic_sources",
] as const;

const PRE_DRAFT_TOOL_NAMES = new Set([
  "capture_business_details",
  "design_website",
  "generate_website",
  "generate_custom_site",
  // Bolt-mode seeding uses this even before a draft exists.
  "edit_custom_site_code",
  "change_font",
  "ask_clarifying_question",
  // Catalog / ops can start before a visual draft exists.
  "list_products",
  "add_products",
  "manage_categories",
  "update_store_profile",
  "get_store_metrics",
  "get_top_selling_products",
  "list_orders",
  "get_order",
  "update_order_status",
  "suggest_site_improvements",
  ...COMMERCE_OPS_TOOL_NAMES,
]);

const DRAFT_TOOL_NAMES = new Set([
  "switch_design",
  "apply_brand_color",
  "refine_website_copy",
  "apply_stock_images",
  "source_website_images",
  "replace_template_images",
  "add_products",
  "generate_product_descriptions",
  "process_product_image",
  "list_products",
  "update_product",
  "archive_product",
  "delete_product",
  "set_product_variants",
  "manage_categories",
  "link_category_showcase",
  "duplicate_product",
  "update_page_section",
  "regenerate_section",
  "reorder_page_blocks",
  "add_page_block",
  "remove_page_block",
  "get_storefront_readiness",
  "publish_website",
  "update_store_profile",
  "get_store_metrics",
  "get_top_selling_products",
  "list_orders",
  "get_order",
  "update_order_status",
  "suggest_site_improvements",
  "generate_custom_site",
  "edit_custom_site_code",
  "change_font",
  "update_theme_style",
  "ask_clarifying_question",
  ...COMMERCE_OPS_TOOL_NAMES,
]);

export function websiteBuilderTools(): WebsiteBuilderToolDef[] {
  return [
    ...BusinessTools.definitions(),
    ...GenerationTools.definitions(),
    ...BrandingTools.definitions(),
    ...ContentTools.definitions(),
    ...ImageTools.definitions(),
    ...ProductTools.definitions(),
    ...CatalogTools.definitions(),
    ...StructureTools.definitions(),
    ...LaunchTools.definitions(),
    ...InsightsTools.definitions(),
    ...CommerceTools.definitions(),
    ...CustomSiteTools.definitions(),
  ];
}

export function websiteBuilderToolsForSession(session: BuilderSession): WebsiteBuilderToolDef[] {
  const tools = websiteBuilderTools();
  const allowed = session.storefront_snapshot ? DRAFT_TOOL_NAMES : PRE_DRAFT_TOOL_NAMES;
  const workbenchEnabled = isCodeWorkbenchEnabled();
  return tools.filter((tool) => {
    if (!allowed.has(tool.name)) return false;
    if (
      !workbenchEnabled &&
      (tool.name === "generate_custom_site" || tool.name === "edit_custom_site_code")
    ) {
      return false;
    }
    return true;
  });
}

export {
  BrandingTools,
  BusinessTools,
  CatalogTools,
  CommerceTools,
  ContentTools,
  CustomSiteTools,
  GenerationTools,
  ImageTools,
  InsightsTools,
  LaunchTools,
  ProductTools,
  StructureTools,
};
