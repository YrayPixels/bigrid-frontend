import { applyStockImagesFromMessage } from "@/lib/storefront-builder/local-ai";
import {
  imageSourceSuggestedActions,
  replaceScopedStorefrontImages,
  replaceSingleProductImage,
  replaceTemplateImagesForStorefront,
  sourceAndApplyWebsiteImages,
} from "@/lib/storefront-builder/image-sourcing";
import { hydrateStorefrontCategoryShowcases } from "@/lib/storefront/blocks/category-showcase-utils";
import type { CategoryShowcaseItem } from "@/lib/storefront/blocks/types";
import { api } from "@/lib/api/client";
import type { UpdateStoreInput } from "@/lib/api/types";
import { setEditableStorefrontPath } from "@/lib/storefront-builder/editable-paths";
import { extractFirstMerchantImageUrl } from "@/lib/storefront-builder/merchant-image";
import {
  describeImageScope,
  isImageReplaceScope,
} from "@/lib/storefront-builder/section-scope";
import type { WebsiteBuilderContext, WebsiteBuilderToolDef } from "../types";
import {
  asString,
  resolveLiveProduct,
  resolveStorefrontProduct,
  syncStorefrontProduct,
  NO_ARG_TOOL_PARAMETERS,
} from "./toolHelpers";
import { sanitizePendingAction, withPendingAction } from "@/lib/storefront-builder/pending-action";
import {
  getProductFocus,
  resolveProductNameFromContext,
  withProductFocus,
} from "@/lib/storefront-builder/product-focus";

const MERCHANT_IMAGE_TARGETS = [
  "hero",
  "about",
  "logo",
  "product",
  "product_gallery",
  "category_showcase",
  "block_path",
] as const;

type MerchantImageTarget = (typeof MERCHANT_IMAGE_TARGETS)[number];

function isMerchantImageTarget(value: string): value is MerchantImageTarget {
  return (MERCHANT_IMAGE_TARGETS as readonly string[]).includes(value);
}

function resolveImageUrlFromArgs(
  args: Record<string, unknown>,
  message: string,
): string {
  const explicit = asString(args.image_url);
  if (explicit) return explicit;
  return extractFirstMerchantImageUrl(message) ?? "";
}

async function askWhichTarget(
  ctx: WebsiteBuilderContext,
  imageUrl: string,
  question: string,
  awaitKind: "product_name" | "text" = "text",
) {
  const pending = sanitizePendingAction({
    type: "resume_tool",
    tool: "apply_merchant_image",
    arguments: { image_url: imageUrl },
    await_field: awaitKind === "product_name" ? "product_name" : "target",
    await_kind: awaitKind,
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
  return { ok: false, error: "needs_clarification", message: question };
}

function applyCategoryShowcaseImage(
  ctx: WebsiteBuilderContext,
  imageUrl: string,
  opts: {
    blockId?: string;
    categoryId?: string;
    categoryLabel?: string;
    itemIndex?: number | null;
  },
): { ok: true; changed_paths: string[]; label: string } | { ok: false; error: string; message: string } {
  if (!ctx.storefront) {
    return { ok: false, error: "website_not_generated", message: "Generate a website first." };
  }

  const blocks = ctx.storefront.pages?.home?.blocks ?? [];
  const showcaseBlocks = blocks.filter(
    (block) =>
      block.type === "category_showcase" ||
      block.id === "category-showcase" ||
      block.id === "collections" ||
      block.id === "rooms" ||
      block.id === "choose-style",
  );

  if (!showcaseBlocks.length) {
    return {
      ok: false,
      error: "no_category_showcase",
      message: "I couldn't find a collections / Essentials section to update.",
    };
  }

  const block =
    (opts.blockId
      ? showcaseBlocks.find((item) => item.id === opts.blockId)
      : null) ?? showcaseBlocks[0];

  const items = Array.isArray(block.props.items)
    ? ([...block.props.items] as CategoryShowcaseItem[])
    : [];

  if (!items.length) {
    return {
      ok: false,
      error: "no_showcase_items",
      message: "That collections section doesn't have any tiles yet.",
    };
  }

  let index = typeof opts.itemIndex === "number" && Number.isFinite(opts.itemIndex) ? opts.itemIndex : -1;
  if (index < 0 && opts.categoryId) {
    index = items.findIndex((item) => item.category_id === opts.categoryId);
  }
  if (index < 0 && opts.categoryLabel) {
    const needle = opts.categoryLabel.toLowerCase();
    index = items.findIndex((item) => item.label.toLowerCase() === needle);
    if (index < 0) {
      index = items.findIndex((item) => item.label.toLowerCase().includes(needle));
    }
  }
  if (index < 0 && items.length === 1) index = 0;

  if (index < 0 || index >= items.length) {
    const labels = items
      .slice(0, 6)
      .map((item) => item.label)
      .join(", ");
    return {
      ok: false,
      error: "showcase_item_ambiguous",
      message: `Which collection tile should get this photo? (${labels})`,
    };
  }

  const path = `pages.home.blocks.${block.id}.props.items.${index}.image_url`;
  if (!setEditableStorefrontPath(ctx.storefront, path, imageUrl)) {
    items[index] = { ...items[index], image_url: imageUrl };
    block.props = { ...block.props, items };
  }

  return {
    ok: true,
    changed_paths: [path],
    label: items[index]?.label || `tile ${index + 1}`,
  };
}

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
        parameters: NO_ARG_TOOL_PARAMETERS,
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

          const scopeRaw = asString(args.scope);
          const scope = isImageReplaceScope(scopeRaw) ? scopeRaw : null;
          const explicitProductName = asString(args.product_name) || undefined;
          const productId = asString(args.product_id) || undefined;

          // Section scopes must win over recent product focus. Otherwise short asks like
          // "update the hero image…" incorrectly rewrite the last focused product.
          const sectionOnlyScope =
            scope === "hero" ||
            scope === "about" ||
            scope === "category_showcase" ||
            scope === "full_site";

          const productName = sectionOnlyScope
            ? explicitProductName
            : resolveProductNameFromContext({
                message: ctx.message,
                proposedName: explicitProductName,
                focus: getProductFocus(ctx.profile),
              }) || undefined;

          // Named product → replace only that product's photo (never when scope is a page section).
          if ((productName || productId) && !sectionOnlyScope) {
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
            ctx.profile = withProductFocus(ctx.profile, {
              product_id: resolved.product.id,
              product_name: resolved.product.name,
            });
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

          if (!scope) {
            return {
              ok: false,
              error: "scope_required",
              message:
                "Pass scope as one of: full_site, hero, about, category_showcase, products — based on what the merchant asked to change. If they named a product, pass product_name too.",
            };
          }

          let storefront = ctx.storefront;
          if (scope === "category_showcase" || scope === "full_site") {
            const categories = await api.getCategories().catch(() => []);
            if (categories.length) {
              storefront = hydrateStorefrontCategoryShowcases(storefront, categories, {
                products: storefront.products,
                replaceStockImages: true,
              }).storefront;
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
      {
        name: "apply_merchant_image",
        description:
          "Apply a merchant-uploaded photo from an [Image: url] marker (or image_url arg) to a specific place on the store. ALWAYS prefer this over replace_template_images / source_website_images when the message contains [Image: url]. Targets: hero (header/banner), about, logo, product (cover photo), product_gallery (append extra photos), category_showcase (Essentials/collections tile), block_path (any editable image prop path). For adding a NEW product from the photo, use process_product_image instead. If the destination is unclear, ask one clarifying question — do not invent Unsplash stock.",
        parameters: {
          type: "object",
          properties: {
            image_url: {
              type: "string",
              description: "Uploaded image URL. If omitted, extracted from [Image: url] in the merchant message.",
            },
            target: {
              type: "string",
              enum: [...MERCHANT_IMAGE_TARGETS],
              description:
                "Where to place the image: hero, about, logo, product, product_gallery, category_showcase, or block_path.",
            },
            product_id: { type: "string" },
            product_name: {
              type: "string",
              description: "Required for product / product_gallery when product_id is unknown.",
            },
            category_id: { type: "string" },
            category_label: {
              type: "string",
              description: "Label of the Essentials / collections tile to update.",
            },
            item_index: {
              type: "number",
              description: "0-based tile index in the category showcase.",
            },
            block_id: {
              type: "string",
              description: "Optional category showcase block id (category-showcase, collections, rooms, choose-style).",
            },
            path: {
              type: "string",
              description:
                "For target=block_path: editable image path e.g. pages.home.blocks.serum-promo.props.image_url",
            },
          },
          required: ["target"],
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          const imageUrl = resolveImageUrlFromArgs(args, ctx.message);
          if (!imageUrl) {
            return {
              ok: false,
              error: "missing_image_url",
              message: "I need the uploaded photo URL. Ask the merchant to attach an image again.",
            };
          }

          const targetRaw = asString(args.target);
          if (!targetRaw || !isMerchantImageTarget(targetRaw)) {
            return askWhichTarget(
              ctx,
              imageUrl,
              "Where should I use this photo — homepage header, about section, logo, a product, or a collections tile?",
            );
          }

          if (targetRaw === "logo") {
            try {
              const body: UpdateStoreInput = { logo_url: imageUrl };
              const store = await api.updateMyStore(body);
              ctx.session = { ...ctx.session, store };
              ctx.assistantMessage = "Done — I set that photo as your logo. Check the preview.";
              ctx.status = "review_ready";
              ctx.payload = { type: "logo_updated", logo_url: imageUrl };
              ctx.profile = withPendingAction(ctx.profile, null);
              return { ok: true, target: "logo", logo_url: imageUrl };
            } catch (err) {
              return {
                ok: false,
                error: err instanceof Error ? err.message : "logo_update_failed",
              };
            }
          }

          if (targetRaw === "hero" || targetRaw === "about") {
            if (!ctx.storefront) {
              return { ok: false, error: "website_not_generated" };
            }
            const path =
              targetRaw === "hero" ? "media.hero_image_url" : "media.about_image_url";
            if (!setEditableStorefrontPath(ctx.storefront, path, imageUrl)) {
              return { ok: false, error: "path_update_failed", path };
            }
            ctx.status = "review_ready";
            ctx.assistantMessage =
              targetRaw === "hero"
                ? "Done — I updated your homepage header photo. Check the preview on the right."
                : "Done — I updated your about section photo. Check the preview on the right.";
            ctx.payload = {
              type: "merchant_image_applied",
              target: targetRaw,
              changed_paths: [path],
              image_url: imageUrl,
            };
            ctx.profile = withPendingAction(ctx.profile, null);
            return { ok: true, target: targetRaw, changed_paths: [path], image_url: imageUrl };
          }

          if (targetRaw === "block_path") {
            if (!ctx.storefront) {
              return { ok: false, error: "website_not_generated" };
            }
            const path = asString(args.path);
            if (!path) {
              return askWhichTarget(
                ctx,
                imageUrl,
                "Which section image should I update? Tell me the section name (e.g. promo banner, about photo, Essentials tile).",
              );
            }
            if (!/image_url|hero_image|about_image|\.src$/i.test(path) && !path.includes("media.")) {
              return {
                ok: false,
                error: "path_not_image",
                message: "That path doesn't look like an image field. Use an image_url path.",
              };
            }
            if (!setEditableStorefrontPath(ctx.storefront, path, imageUrl)) {
              return {
                ok: false,
                error: "path_not_editable",
                message: `I couldn't update ${path}. Try naming the section (header, about, a product, or a collections tile).`,
              };
            }
            ctx.status = "review_ready";
            ctx.assistantMessage = "Done — I placed your photo on that section. Check the preview.";
            ctx.payload = {
              type: "merchant_image_applied",
              target: "block_path",
              changed_paths: [path],
              image_url: imageUrl,
            };
            ctx.profile = withPendingAction(ctx.profile, null);
            return { ok: true, target: "block_path", changed_paths: [path], image_url: imageUrl };
          }

          if (targetRaw === "category_showcase") {
            if (!ctx.storefront) {
              return { ok: false, error: "website_not_generated" };
            }
            const itemIndexRaw = args.item_index;
            const itemIndex =
              typeof itemIndexRaw === "number" && Number.isFinite(itemIndexRaw)
                ? itemIndexRaw
                : null;
            const applied = applyCategoryShowcaseImage(ctx, imageUrl, {
              blockId: asString(args.block_id) || undefined,
              categoryId: asString(args.category_id) || undefined,
              categoryLabel: asString(args.category_label) || undefined,
              itemIndex,
            });
            if (!applied.ok) {
              if (applied.error === "showcase_item_ambiguous") {
                return askWhichTarget(ctx, imageUrl, applied.message);
              }
              ctx.assistantMessage = applied.message;
              return { ok: false, error: applied.error, message: applied.message };
            }
            ctx.status = "review_ready";
            ctx.assistantMessage = `Done — I updated the **${applied.label}** tile photo. Check the preview.`;
            ctx.payload = {
              type: "merchant_image_applied",
              target: "category_showcase",
              changed_paths: applied.changed_paths,
              image_url: imageUrl,
            };
            ctx.profile = withPendingAction(ctx.profile, null);
            return {
              ok: true,
              target: "category_showcase",
              changed_paths: applied.changed_paths,
              image_url: imageUrl,
            };
          }

          if (targetRaw === "product" || targetRaw === "product_gallery") {
            const productName = resolveProductNameFromContext({
              message: ctx.message,
              proposedName: asString(args.product_name) || undefined,
              focus: getProductFocus(ctx.profile),
            });
            const resolved = await resolveLiveProduct(
              asString(args.product_id) || undefined,
              productName || undefined,
            );
            if (!resolved.product) {
              return askWhichTarget(
                ctx,
                imageUrl,
                resolved.error ?? "Which product should get this photo? Tell me the product name.",
                "product_name",
              );
            }

            const existingImages = (
              resolved.product.images?.filter((url): url is string => Boolean(url?.trim())) ??
              (resolved.product.image_url ? [resolved.product.image_url] : [])
            ).filter(Boolean);

            const patch =
              targetRaw === "product_gallery"
                ? {
                    images: [...new Set([...existingImages, imageUrl])].slice(0, 12),
                    ...(resolved.product.image_url ? {} : { image_url: imageUrl }),
                  }
                : {
                    image_url: imageUrl,
                    images: [imageUrl, ...existingImages.filter((url) => url !== imageUrl)].slice(
                      0,
                      12,
                    ),
                  };

            try {
              const updated = await api.updateProduct(resolved.product.id, patch);
              if (ctx.storefront?.products) {
                ctx.storefront = {
                  ...ctx.storefront,
                  products:
                    syncStorefrontProduct(ctx.storefront.products, updated) ??
                    ctx.storefront.products,
                };
              }
              ctx.profile = withProductFocus(ctx.profile, {
                product_id: updated.id,
                product_name: updated.name,
              });
              ctx.profile = withPendingAction(ctx.profile, null);
              ctx.status = "review_ready";
              ctx.assistantMessage =
                targetRaw === "product_gallery"
                  ? `Done — I added that photo to **${updated.name}**'s gallery.`
                  : `Done — I updated the photo for **${updated.name}**. Check Products or the preview.`;
              ctx.payload = { type: "product_updated", product: updated };
              return {
                ok: true,
                target: targetRaw,
                product_id: updated.id,
                product_name: updated.name,
                image_url: imageUrl,
              };
            } catch (err) {
              return {
                ok: false,
                error: err instanceof Error ? err.message : "update_product_failed",
              };
            }
          }

          return { ok: false, error: "unknown_target" };
        },
      },
    ];
  }
}
