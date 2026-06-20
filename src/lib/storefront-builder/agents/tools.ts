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
  "guide_add_products",
  "ask_clarifying_question",
]);

export function websiteBuilderToolsForSession(session: BuilderSession): WebsiteBuilderToolDef[] {
  const tools = websiteBuilderTools();
  const allowed = session.storefront_snapshot ? DRAFT_TOOL_NAMES : PRE_DRAFT_TOOL_NAMES;
  return tools.filter((tool) => allowed.has(tool.name));
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
        ctx.status = "content_generated";
        ctx.payload = { type: "website_generated", changed_paths: [] };
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
        ctx.assistantMessage = rebuilt.assistant_message;
        ctx.payload = rebuilt.assistant_payload;
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
        "Update brand colors only — never change layout or copy. Use for color names, palettes, hex codes, or mood colors like soft lavender or earthy brown.",
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
          result = { ...result, color_label: "Brand color" };
        } else {
          const resolved = await applyColorChangeFromMessageAsync(
            ctx.storefront,
            ctx.session.store,
            instruction,
          );
          if (!resolved) {
            const fallback = await resolveBrandColorForMessage(instruction, ctx.session.store);
            if (!fallback) {
              return { ok: false, error: "color_not_recognized" };
            }
            result = {
              ...applyBrandColorToStorefront(ctx.storefront, ctx.session.store, fallback.brand_color),
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
        const colorLabel = result.color_label ?? "your chosen shade";
        ctx.assistantMessage = `Done — I updated your brand color to ${colorLabel}. Check the preview on the right.`;
        ctx.payload = {
          type: "brand_color_applied",
          changed_paths: result.changed_paths,
          brand_color: result.store.brand_color,
        };
        return { ok: true, brand_color: result.store.brand_color, color_label: colorLabel };
      },
    },
    {
      name: "refine_website_copy",
      description:
        "Refine existing website copy such as the hero headline, about section, FAQ answers, CTA label, or SEO text. Do not use for design switches or color-only requests.",
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
        const instruction =
          typeof args.instruction === "string" && args.instruction.trim()
            ? args.instruction.trim()
            : ctx.message;
        const result = await applyStorefrontEditAsync(ctx.storefront, instruction, {
          store: ctx.session.store,
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
      description: "Add suitable stock photos to the website header and about section.",
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
            { type: "prompt", label: "Suggest stock photos", message: "Add suitable stock photos to my website" },
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
