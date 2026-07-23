import { applyStockImagesFromMessage } from "@/lib/storefront-builder/local-ai";
import {
  imageSourceSuggestedActions,
  replaceScopedStorefrontImages,
  replaceSingleProductImage,
  replaceTemplateImagesForStorefront,
  sourceAndApplyWebsiteImages,
} from "@/lib/storefront-builder/image-sourcing";
import { hydrateStorefrontCategoryShowcases } from "@/lib/storefront/blocks/category-showcase-utils";
import { api } from "@/lib/api/client";
import {
  describeImageScope,
  isImageReplaceScope,
  type ImageReplaceScope,
} from "@/lib/storefront-builder/section-scope";
import type { WebsiteBuilderContext, WebsiteBuilderToolDef } from "../types";
import { asString, resolveLiveProduct, resolveStorefrontProduct, syncStorefrontProduct } from "./toolHelpers";
import { sanitizePendingAction, withPendingAction } from "@/lib/storefront-builder/pending-action";

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
          "Replace photos on the website. YOU must choose scope from the merchant's intent — do not omit it. full_site = refresh photos across the site / vague 'update the images' with NO product or section named. hero = landing page / homepage header / banner / background banner. about = about section. category_showcase = Essentials, curated collections, rooms, choose your style. products = entire best sellers / product grid (only when they want ALL product photos refreshed) — each product gets a photo matched to its name and description. When the merchant names a specific product (e.g. iPhone 12), ALWAYS pass product_name — that updates ONLY that product's photo. If which product or section is unclear, ask_clarifying_question instead of guessing.",
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
                "Required. Decide from the merchant message: full_site, hero (banner/header), about, category_showcase, or products. Use products with product_name when a specific product is named.",
            },
            product_name: {
              type: "string",
              description:
                "When the merchant names a specific product to update (e.g. iPhone 12), pass that name. Updates ONLY that product's image — never the whole grid.",
            },
            product_id: {
              type: "string",
              description: "Optional product id from list_products when the name is ambiguous.",
            },
          },
          required: ["scope"],
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

          const productName = asString(args.product_name) || undefined;
          const productId = asString(args.product_id) || undefined;

          // Named product → replace only that product's photo.
          if (productName || productId) {
            let resolved = resolveStorefrontProduct(ctx.storefront.products, productId, productName);
            if (!resolved.product) {
              const live = await resolveLiveProduct(productId, productName).catch(() => null);
              if (live?.product) {
                const ensured = {
                  ...ctx.storefront,
                  products: [...(ctx.storefront.products ?? [])],
                };
                const existingIndex = ensured.products.findIndex((item) => item.id === live.product!.id);
                if (existingIndex < 0) {
                  ensured.products.push(live.product);
                  resolved = {
                    product: live.product,
                    index: ensured.products.length - 1,
                  };
                } else {
                  resolved = { product: live.product, index: existingIndex };
                }
                ctx.storefront = ensured;
              } else if (live?.error) {
                resolved = { product: null, index: -1, error: live.error };
              }
            }

            if (!resolved.product || resolved.index < 0) {
              const question =
                resolved.error ??
                "Which product photo should I update? Tell me the product name.";
              const pending = sanitizePendingAction({
                type: "resume_tool",
                tool: "replace_template_images",
                arguments: {
                  intent,
                  scope: "products",
                  find_images: true,
                },
                await_field: "product_name",
                await_kind: "product_name",
                question,
                original_message: ctx.message,
              });
              ctx.profile = withPendingAction(ctx.profile, pending);
              ctx.assistantMessage = question;
              ctx.status = "collecting_requirements";
              ctx.payload = {
                type: "requirements_request",
                profile: ctx.profile,
                pending_action: pending,
              };
              return { ok: false, error: "product_ambiguous", message: question };
            }

            const replaced = await replaceSingleProductImage({
              storefront: ctx.storefront,
              productIndex: resolved.index,
              productName: resolved.product.name,
              intent,
              context: {
                business_name: ctx.session.store.business_name,
                industry: ctx.session.store.industry,
                description: ctx.session.store.description,
                tone: ctx.profile.tone,
              },
            });

            ctx.storefront = replaced.storefront;

            if (!replaced.image_url) {
              ctx.assistantMessage =
                replaced.result.summary +
                " Try again in a moment, or upload your own photo.";
              ctx.status = "collecting_requirements";
              ctx.payload = {
                type: "images_sourced",
                search_terms: replaced.result.search_terms,
                source_links: replaced.result.source_links,
                changed_paths: [],
                suggested_actions: imageSourceSuggestedActions(replaced.result),
              };
              return {
                ok: false,
                error: "unsplash_no_results",
                product_name: resolved.product.name,
                message: ctx.assistantMessage,
              };
            }

            const live = await resolveLiveProduct(resolved.product.id, undefined).catch(() => null);
            if (live?.product) {
              try {
                const updated = await api.updateProduct(live.product.id, {
                  image_url: replaced.image_url,
                });
                ctx.storefront = {
                  ...ctx.storefront,
                  products:
                    syncStorefrontProduct(ctx.storefront.products, updated) ??
                    ctx.storefront.products,
                };
              } catch {
                // Preview update still succeeds even if catalog sync fails.
              }
            }

            ctx.status = "review_ready";
            ctx.assistantMessage = `${replaced.result.summary} Check the preview on the right.`;
            ctx.profile = withPendingAction(ctx.profile, null);
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
              scope: "products",
              product_id: resolved.product.id,
              product_name: resolved.product.name,
              changed_paths: replaced.changed_paths,
              recommendations: replaced.result.recommendations,
            };
          }

          const rawScope = typeof args.scope === "string" ? args.scope.trim() : "";
          if (!isImageReplaceScope(rawScope)) {
            return {
              ok: false,
              error: "scope_required",
              message:
                "Pass scope as one of: full_site, hero, about, category_showcase, products — based on what the merchant asked to change. If they named a product, pass product_name too.",
            };
          }
          const scope: ImageReplaceScope = rawScope;

          let storefront = ctx.storefront;
          if (scope === "category_showcase" || scope === "full_site") {
            const categories = await api.getCategories().catch(() => []);
            if (categories.length) {
              storefront = hydrateStorefrontCategoryShowcases(storefront, categories).storefront;
            }
          }

          const replaced = await replaceScopedStorefrontImages({
            intent,
            scope,
            storefront,
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
