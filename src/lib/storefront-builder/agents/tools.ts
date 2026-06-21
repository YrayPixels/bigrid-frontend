import { rebuildStorefrontFromDesignRequest } from "@/lib/storefront-builder/design-resolver";
import {
  applyBrandColorToStorefront,
  applyColorChangeFromMessageAsync,
  applyStockImagesFromMessage,
  applyStorefrontEditAsync,
  concreteTemplateIds,
  extractBusinessProfile,
  hasMinimumBusinessProfile,
  profileToStore,
  resolveBrandColorForMessage,
  resolveSelectedTemplateId,
  sanitizeBusinessProfile,
  synthesizeStorefront,
} from "@/lib/storefront-builder/local-ai";
import {
  imageSourceSuggestedActions,
  replaceScopedStorefrontImages,
  replaceTemplateImagesForStorefront,
  sourceAndApplyWebsiteImages,
} from "@/lib/storefront-builder/image-sourcing";
import {
  describeImageScope,
  resolveCategoryShowcaseImageScope,
  type ImageReplaceScope,
} from "@/lib/storefront-builder/section-scope";
import type { BuilderSession } from "@/lib/api/types";
import type { WebsiteBuilderContext, WebsiteBuilderToolDef } from "./types";

const PRE_DRAFT_TOOL_NAMES = new Set([
  "capture_business_details",
  "design_website",
  "generate_website",
  "ask_clarifying_question",
]);

const DRAFT_TOOL_NAMES = new Set([
  "switch_design",
  "apply_brand_color",
  "refine_website_copy",
  "apply_stock_images",
  "source_website_images",
  "replace_template_images",
  "guide_add_products",
  "ask_clarifying_question",
]);

export function websiteBuilderToolsForSession(session: BuilderSession): WebsiteBuilderToolDef[] {
  const tools = websiteBuilderTools();
  const allowed = session.storefront_snapshot ? DRAFT_TOOL_NAMES : PRE_DRAFT_TOOL_NAMES;
  return tools.filter((tool) => allowed.has(tool.name));
}

async function applyBrandedTemplateImages(
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

export function websiteBuilderTools(): WebsiteBuilderToolDef[] {
  return [
    {
      name: "capture_business_details",
      description:
        "Capture or update the merchant business name, what they sell, industry, brand color, and tone from the conversation.",
      parameters: {
        type: "object",
        properties: {
          business_name: { type: "string" },
          description: { type: "string" },
          industry: { type: "string" },
          brand_color: { type: "string" },
          tone: { type: "array", items: { type: "string" } },
        },
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const extracted = extractBusinessProfile(ctx.message, ctx.profile);
        ctx.profile = sanitizeBusinessProfile({
          ...extracted,
          ...(typeof args.business_name === "string" ? { business_name: args.business_name } : {}),
          ...(typeof args.description === "string" ? { description: args.description } : {}),
          ...(typeof args.industry === "string" ? { industry: args.industry as never } : {}),
          ...(typeof args.brand_color === "string" ? { brand_color: args.brand_color } : {}),
          ...(Array.isArray(args.tone) ? { tone: args.tone.map(String) } : {}),
        });
        ctx.status = hasMinimumBusinessProfile(ctx.profile)
          ? "template_recommendation"
          : "collecting_requirements";
        return { ok: true, profile: ctx.profile };
      },
    },
    {
      name: "design_website",
      description:
        "Choose the best website design direction for the merchant based on their business and brand tone. Use before the first generate_website.",
      parameters: {
        type: "object",
        properties: {
          design_direction: { type: "string" },
        },
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const available = concreteTemplateIds(ctx.templateOptions);
        const top = ctx.recommendations[0]?.template_id;
        const selected =
          ctx.selectedTemplateId && available.includes(ctx.selectedTemplateId)
            ? ctx.selectedTemplateId
            : top && available.includes(top)
              ? top
              : available[0] ?? null;
        ctx.selectedTemplateId = selected;
        ctx.status = "template_recommendation";
        return { ok: true, design_direction: args.design_direction ?? "best_fit", template_id: selected };
      },
    },
    {
      name: "generate_website",
      description:
        "Generate the merchant's first website with homepage hero, about section, FAQs, SEO, and starter products.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
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
        ctx.storefront = synthesizeStorefront(store, ctx.recommendations);

        const imageIntent =
          `${ctx.profile.business_name ?? ""} ${ctx.profile.description ?? ""} ${ctx.message}`.trim();
        const images = await applyBrandedTemplateImages(ctx, imageIntent);

        ctx.status = "content_generated";
        ctx.payload = {
          type: "website_generated",
          changed_paths: images.changed_paths,
          image_summary: images.summary,
        };
        if (!ctx.assistantMessage) {
          ctx.assistantMessage =
            "Your website is ready. Preview it on the right, then tell me what to refine — headline, about section, colors, or design.";
        }
        return { ok: true, template_id: selected };
      },
    },
    {
      name: "switch_design",
      description:
        "Switch the website to a new design that fits the merchant's description. Picks the best layout and a matching color palette using AI. Use when they want a different look, new style, cosmetic shop, fashion brand, minimal vibe, or say they need something else.",
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
        ctx.selectedTemplateId = rebuilt.selected_template_id;
        ctx.status = rebuilt.status;

        const imageIntent =
          typeof args.direction === "string" && args.direction.trim()
            ? args.direction.trim()
            : ctx.message.trim();
        const images = await applyBrandedTemplateImages(ctx, imageIntent);

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
    {
      name: "apply_brand_color",
      description:
        "Update the full brand color palette — primary, accent, background, surface, text, muted, and border. Never change layout or copy. Use for color names, palettes, hex codes, or mood colors like soft lavender or earthy brown.",
      parameters: {
        type: "object",
        properties: {
          instruction: {
            type: "string",
            description: "What color or palette the merchant wants",
          },
          brand_color: {
            type: "string",
            description: "Optional exact hex such as #D4577A when known",
          },
        },
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        if (!ctx.storefront || !ctx.session.store) {
          return { ok: false, error: "website_not_generated" };
        }

        const instruction =
          typeof args.instruction === "string" && args.instruction.trim()
            ? args.instruction.trim()
            : ctx.message;
        const explicitHex =
          typeof args.brand_color === "string" && /^#[0-9A-Fa-f]{6}$/.test(args.brand_color)
            ? args.brand_color.toUpperCase()
            : null;

        let result;
        if (explicitHex) {
          result = applyBrandColorToStorefront(ctx.storefront, ctx.session.store, explicitHex);
          result = { ...result, color_label: "Custom palette" };
        } else {
          const resolved = await applyColorChangeFromMessageAsync(
            ctx.storefront,
            ctx.session.store,
            instruction,
          );
          if (!resolved) {
            const fallback = await resolveBrandColorForMessage(
              instruction,
              ctx.session.store,
              ctx.storefront,
            );
            if (!fallback) {
              return { ok: false, error: "color_not_recognized" };
            }
            result = {
              ...applyBrandColorToStorefront(
                ctx.storefront,
                ctx.session.store,
                fallback.brand_color,
                fallback.palette,
              ),
              color_label: fallback.label,
            };
          } else {
            result = resolved;
          }
        }

        ctx.storefront = result.storefront;
        ctx.profile = sanitizeBusinessProfile({
          ...ctx.profile,
          brand_color: result.store.brand_color,
        });
        ctx.status = "review_ready";
        const colorLabel = result.color_label ?? "your chosen palette";
        ctx.assistantMessage = `Done — I updated your color palette (${colorLabel}). Check the preview on the right.`;
        ctx.payload = {
          type: "brand_color_applied",
          changed_paths: result.changed_paths,
          brand_color: result.store.brand_color,
          palette: result.storefront.palette,
        };
        return { ok: true, brand_color: result.store.brand_color, color_label: colorLabel };
      },
    },
    {
      name: "refine_website_copy",
      description:
        "Refine website copy or a specific page/section (Essentials/category showcase, hero, about, FAQ, CTA, SEO). Use for scoped copy and content updates — including section titles, category labels, and on-brand rewrites. Do not use for whole-site photo replacement or design switches.",
      parameters: {
        type: "object",
        properties: {
          instruction: { type: "string" },
        },
        required: ["instruction"],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        if (!ctx.storefront) return { ok: false, error: "website_not_generated" };
        const stepInstruction =
          typeof args.instruction === "string" && args.instruction.trim() ? args.instruction.trim() : "";
        const instruction = [stepInstruction, ctx.planIntent, ctx.message].filter(Boolean).join(" — ");
        const result = await applyStorefrontEditAsync(ctx.storefront, instruction, {
          store: ctx.session.store,
          planIntent: ctx.planIntent,
          message: ctx.message,
        });
        ctx.storefront = result.storefront;
        ctx.status = "review_ready";
        ctx.assistantMessage = result.assistant_message;
        ctx.payload = {
          type: "website_refined",
          changed_paths: result.changed_paths,
        };
        return { ok: true, changed_paths: result.changed_paths };
      },
    },
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
        "Replace placeholder photos on the website. Use scope full_site ONLY when the merchant wants every photo refreshed. For Essentials/category showcase, homepage hero, about section, or product grid only, pass the matching scope — never refresh the whole site for a section request.",
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
              "Where to apply images. Essentials / Shop the Essentials = category_showcase. Omit only when the merchant clearly asked to refresh all website photos.",
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

        const explicitScope =
          typeof args.scope === "string" && args.scope.trim()
            ? (args.scope.trim() as ImageReplaceScope)
            : null;
        const scope = resolveCategoryShowcaseImageScope(intent, ctx.planIntent, ctx.message, explicitScope);

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
    {
      name: "guide_add_products",
      description:
        "Guide the merchant to the Products page when they want to add or manage products. Do not try to add products in chat.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
      handler: async (_args, ctx) => {
        ctx.assistantMessage =
          "Products live on your Products page — add names, prices, photos, and inventory there. They appear on your storefront automatically.";
        ctx.payload = {
          type: "product_guidance",
          suggested_actions: [
            { type: "link", label: "Go to Products", href: "/admin/products" },
            { type: "prompt", label: "Suggest stock photos", message: "Help me find photos that fit my brand for the homepage and about section" },
          ],
        };
        return { ok: true };
      },
    },
    {
      name: "ask_clarifying_question",
      description: "Ask the merchant one short clarifying question before building their website.",
      parameters: {
        type: "object",
        properties: {
          question: { type: "string" },
        },
        required: ["question"],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const question = typeof args.question === "string" ? args.question.trim() : "";
        if (!question) return { ok: false, error: "missing_question" };
        ctx.assistantMessage = question;
        ctx.status = "collecting_requirements";
        ctx.payload = { type: "requirements_request", profile: ctx.profile };
        return { ok: true, question };
      },
    },
  ];
}
