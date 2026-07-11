import { applyStockImagesFromMessage } from "@/lib/storefront-builder/local-ai";
import {
  imageSourceSuggestedActions,
  replaceScopedStorefrontImages,
  replaceTemplateImagesForStorefront,
  sourceAndApplyWebsiteImages,
} from "@/lib/storefront-builder/image-sourcing";
import {
  describeImageScope,
  isImageReplaceScope,
  resolveCategoryShowcaseImageScope,
} from "@/lib/storefront-builder/section-scope";
import type { WebsiteBuilderContext, WebsiteBuilderToolDef } from "../types";

/** Stock photos, on-brand sourcing, and scoped template image replacement. */
export class ImageTools {
  static async applyBrandedTemplateImages(
    ctx: WebsiteBuilderContext,
    intent: string,
  ): Promise<{ changed_paths: string[]; summary?: string }> {
    if (!ctx.storefront || !ctx.session.store) {
      return { changed_paths: [] };
    }

    const replaced = await replaceTemplateImagesForStorefront({
      intent,
      storefront: ctx.storefront,
      context: {
        business_name: ctx.session.store.business_name,
        industry: ctx.session.store.industry,
        description: ctx.session.store.description,
        tone: ctx.profile.tone,
      },
    });

    ctx.storefront = replaced.storefront;
    return { changed_paths: replaced.changed_paths, summary: replaced.result.summary };
  }

  static definitions(): WebsiteBuilderToolDef[] {
    return [
      {
        name: "apply_stock_images",
        description:
          "Quickly add default template stock photos to the header and about section. Use when the merchant wants generic stock photos applied fast.",
        parameters: { type: "object", properties: {}, additionalProperties: false },
        handler: async (_args, ctx) => {
          if (!ctx.storefront || !ctx.session.store) {
            return { ok: false, error: "website_not_generated" };
          }

          const result = applyStockImagesFromMessage(ctx.storefront, ctx.session.store);
          ctx.storefront = result.storefront;
          ctx.status = "review_ready";
          ctx.assistantMessage = "Done — I added suitable stock photos. Check the preview on the right.";
          ctx.payload = {
            type: "stock_images_applied",
            changed_paths: result.changed_paths,
          };
          return { ok: true, changed_paths: result.changed_paths };
        },
      },
      {
        name: "source_website_images",
        description:
          "Help the merchant source on-brand photos for their website. Picks hero and about images matched to their business, suggests search terms, and links to free stock sites (Unsplash, Pexels). Use when they ask for photo ideas, image recommendations, what photos to use, or want images that fit their brand — not just generic template stock.",
        parameters: {
          type: "object",
          properties: {
            intent: {
              type: "string",
              description: "What kind of photos they want — mood, subject, or section",
            },
            apply_to_preview: {
              type: "boolean",
              description: "When true, apply the recommended photos to the preview immediately",
            },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          if (!ctx.storefront || !ctx.session.store) {
            return { ok: false, error: "website_not_generated" };
          }

          const intent =
            typeof args.intent === "string" && args.intent.trim()
              ? args.intent.trim()
              : ctx.message.trim();
          const applyToPreview = args.apply_to_preview !== false;

          const { result, storefront, changed_paths } = await sourceAndApplyWebsiteImages({
            intent,
            storefront: ctx.storefront,
            store: ctx.session.store,
            applyToPreview,
          });

          ctx.storefront = storefront;
          ctx.status = "review_ready";

          const applied = changed_paths.length > 0;
          ctx.assistantMessage = applied
            ? `${result.summary} I updated photos across your homepage, about section, and products — check the preview on the right.`
            : `${result.summary} Tap a suggestion below to apply a photo, upload your own, or browse more on free stock sites.`;

          ctx.payload = {
            type: applied ? "stock_images_applied" : "images_sourced",
            image_recommendations: result.recommendations,
            search_terms: result.search_terms,
            source_links: result.source_links,
            changed_paths,
            suggested_actions: imageSourceSuggestedActions(result),
          };

          return {
            ok: true,
            applied,
            recommendations: result.recommendations,
            search_terms: result.search_terms,
            changed_paths,
          };
        },
      },
      {
        name: "replace_template_images",
        description:
          "Replace placeholder photos on the website. Use scope full_site ONLY when the merchant wants every photo refreshed. For Essentials/category showcase, homepage/landing page hero, about section, or product grid only, pass the matching scope — never refresh the whole site for a section request.",
        parameters: {
          type: "object",
          properties: {
            intent: {
              type: "string",
              description: "What the business sells and the photo mood they want",
            },
            scope: {
              type: "string",
              enum: ["full_site", "category_showcase", "hero", "about", "products"],
              description:
                "Where to apply images. Landing page / homepage header = hero. Essentials / Shop the Essentials = category_showcase. Omit only when the merchant clearly asked to refresh all website photos.",
            },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          if (!ctx.storefront || !ctx.session.store) {
            return { ok: false, error: "website_not_generated" };
          }

          const intent =
            typeof args.intent === "string" && args.intent.trim()
              ? args.intent.trim()
              : `${ctx.profile.business_name ?? ""} ${ctx.profile.description ?? ""} ${ctx.message}`.trim();

          const rawScope = typeof args.scope === "string" ? args.scope.trim() : "";
          const explicitScope = isImageReplaceScope(rawScope) ? rawScope : null;
          const scope = resolveCategoryShowcaseImageScope(
            intent,
            ctx.planIntent,
            ctx.message,
            explicitScope,
          );

          if (!scope) {
            return { ok: false, error: "scope_not_recognized" };
          }

          const replaced = await replaceScopedStorefrontImages({
            intent,
            scope,
            storefront: ctx.storefront,
            context: {
              business_name: ctx.session.store.business_name,
              industry: ctx.session.store.industry,
              description: ctx.session.store.description,
              tone: ctx.profile.tone,
            },
          });

          ctx.storefront = replaced.storefront;
          ctx.status = "review_ready";
          ctx.assistantMessage = `${replaced.result.summary} I updated photos in your ${describeImageScope(scope)} — check the preview on the right.`;
          ctx.payload = {
            type: "stock_images_applied",
            image_recommendations: replaced.result.recommendations,
            search_terms: replaced.result.search_terms,
            source_links: replaced.result.source_links,
            changed_paths: replaced.changed_paths,
            suggested_actions: imageSourceSuggestedActions(replaced.result),
          };

          return {
            ok: true,
            scope,
            changed_paths: replaced.changed_paths,
            recommendations: replaced.result.recommendations,
          };
        },
      },
    ];
  }
}
