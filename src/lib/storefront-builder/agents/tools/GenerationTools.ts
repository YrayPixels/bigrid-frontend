import { rebuildStorefrontFromDesignRequest } from "@/lib/storefront-builder/design-resolver";
import {
  concreteTemplateIds,
  hasMinimumBusinessProfile,
  profileToStore,
  resolveSelectedTemplateId,
  synthesizeStorefront,
  applyFashionCategoryShowcaseCopy,
} from "@/lib/storefront-builder/local-ai";
import { attachBoltTemplateToStorefront } from "@/lib/storefront/bolt-template-storefront";
import { hydrateStorefrontCategoryShowcases } from "@/lib/storefront/blocks/category-showcase-utils";
import { ensureMerchantHomepageProducts } from "@/lib/storefront/product-plugs";
import { resolveStorefrontTemplateType } from "@/lib/storefront/template-registry";
import { applyCategoryShowcaseImagesOnly } from "@/lib/storefront-builder/image-sourcing";
import { isCodeWorkbenchEnabled } from "@/lib/features";
import { api } from "@/lib/api/client";
import type { WebsiteBuilderToolDef } from "../types";
import { ImageTools } from "./ImageTools";
import { NO_ARG_TOOL_PARAMETERS } from "./toolHelpers";

/** First-pass and full redesign generation (template storefronts). */
export class GenerationTools {
  static definitions(): WebsiteBuilderToolDef[] {
    return [
      {
        name: "generate_website",
        description:
          "Generate the merchant's first website with homepage hero, about section, FAQs, SEO, and starter products.",
        parameters: NO_ARG_TOOL_PARAMETERS,
        handler: async (_args, ctx) => {
          if (!hasMinimumBusinessProfile(ctx.profile)) {
            return { ok: false, error: "missing_business_details" };
          }

          const available = concreteTemplateIds(ctx.templateOptions);
          const selected = resolveSelectedTemplateId(
            {
              ...ctx.session,
              selected_template_id: ctx.selectedTemplateId ?? ctx.session.selected_template_id,
            },
            ctx.recommendations,
            available,
          );

          if (!selected) {
            return { ok: false, error: "missing_design_direction" };
          }

          ctx.selectedTemplateId = selected;
          const store = profileToStore(ctx.profile, selected);
          let storefront = synthesizeStorefront(store, ctx.recommendations);
          const templateType = resolveStorefrontTemplateType(selected, ctx.templateOptions);

          if (templateType === "bolt" && isCodeWorkbenchEnabled()) {
            storefront = await attachBoltTemplateToStorefront(storefront, selected);
            ctx.storefront = storefront;
            ctx.status = "content_generated";
            ctx.payload = {
              type: "website_generated",
              template_type: "bolt",
              next_steps: [
                { label: "Open code workbench", action: "link", href: "/admin/builder/workbench" },
                { label: "Add your products", action: "add_products_prompt", message: "Help me add my products" },
                { label: "Refine the design", action: "prompt", message: "Refine the homepage layout and styling" },
              ],
            };
            if (!ctx.assistantMessage) {
              ctx.assistantMessage =
                "Your website starter is ready in the code workbench. Open the workbench to preview and refine the design, then add your products when you're happy with the look.";
            }
            return { ok: true, template_id: selected, template_type: "bolt" };
          }

          ctx.storefront = storefront;

          const ensured = ensureMerchantHomepageProducts(ctx.storefront, selected);
          ctx.storefront = ensured.storefront;
          ctx.storefront = applyFashionCategoryShowcaseCopy(ctx.storefront, store);

          const categories = await api.getCategories().catch(() => []);
          if (categories.length) {
            ctx.storefront = hydrateStorefrontCategoryShowcases(ctx.storefront, categories, {
              products: ctx.storefront.products,
              replaceStockImages: true,
            }).storefront;
          }

          const imageIntent =
            `${ctx.profile.business_name ?? ""} ${ctx.profile.description ?? ""} ${ctx.message}`.trim();
          const images = await ImageTools.applyBrandedTemplateImages(ctx, imageIntent);

          const showcaseImages = await applyCategoryShowcaseImagesOnly(
            ctx.storefront!,
            imageIntent || "collection photos",
            {
              business_name: store.business_name,
              industry: store.industry,
              description: store.description,
              tone: ctx.profile.tone,
            },
          );
          ctx.storefront = showcaseImages.storefront;

          ctx.status = "content_generated";
          ctx.payload = {
            type: "website_generated",
            changed_paths: [...(images.changed_paths ?? []), ...showcaseImages.changed_paths],
            image_summary: images.summary,
            next_steps: [
              { label: "Add your products", action: "add_products_prompt", message: "Help me add my products" },
              { label: "Upload a header photo", action: "upload", target: "media.hero_image_url" },
              {
                label: "Write product descriptions",
                action: "prompt",
                message: "Write compelling descriptions for my products",
              },
              { label: "Improve SEO", action: "prompt", message: "Update my website SEO for better search visibility" },
              { label: "Review & publish", action: "prompt", message: "I'm ready to publish my website" },
            ],
          };
          if (!ctx.assistantMessage) {
            ctx.assistantMessage =
              "Your website is ready! Here's what to do next to get your store live:\n\n1. Add your products\n2. Upload a header photo\n3. Polish your product descriptions\n4. Improve your SEO\n5. Review and publish\n\nPick any step and I'll help you through it, or tell me what you want to refine.";
          }
          return { ok: true, template_id: selected };
        },
      },
      {
        name: "switch_design",
        description:
          "Switch to a COMPLETELY DIFFERENT website layout and design. Changes the entire template, layout, color palette, and images. Use when the merchant says 'new design', 'different look', 'another style', 'something else', or names a specific shop type (cosmetics, fashion, minimal). This is NOT for color-only changes — use apply_brand_color for palette-only requests.",
        parameters: {
          type: "object",
          properties: {
            direction: {
              type: "string",
              description: "What kind of shop/design they want — e.g. cosmetic shop with soft botanical colors",
            },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          if (!ctx.session.store) {
            return { ok: false, error: "missing_store" };
          }

          const direction =
            typeof args.direction === "string" && args.direction.trim()
              ? args.direction.trim()
              : ctx.message.trim();

          const rebuilt = await rebuildStorefrontFromDesignRequest({
            message: direction,
            session: ctx.session,
            templateOptions: ctx.templateOptions,
            recommendations: ctx.recommendations,
          });

          if (!rebuilt) {
            return { ok: false, error: "design_resolution_failed" };
          }

          ctx.profile = rebuilt.business_profile;
          ctx.storefront = rebuilt.storefront;
          if (ctx.session.store) {
            ctx.storefront = applyFashionCategoryShowcaseCopy(ctx.storefront, {
              business_name: ctx.session.store.business_name,
              industry: ctx.session.store.industry,
            });
          }
          ctx.selectedTemplateId = rebuilt.selected_template_id;
          ctx.status = rebuilt.status;

          const imageIntent =
            typeof args.direction === "string" && args.direction.trim()
              ? args.direction.trim()
              : ctx.message.trim();
          const images = await ImageTools.applyBrandedTemplateImages(ctx, imageIntent);

          ctx.assistantMessage = rebuilt.assistant_message;
          ctx.payload = {
            ...rebuilt.assistant_payload,
            changed_paths: [
              ...(Array.isArray(rebuilt.assistant_payload.changed_paths)
                ? (rebuilt.assistant_payload.changed_paths as string[])
                : []),
              ...images.changed_paths,
            ],
            image_summary: images.summary,
          };
          return {
            ok: true,
            template_id: rebuilt.selected_template_id,
            brand_color: rebuilt.business_profile.brand_color,
          };
        },
      },
    ];
  }
}
