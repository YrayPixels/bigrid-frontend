import {
  applyStorefrontEditAsync,
  concreteTemplateIds,
  extractBusinessProfile,
  hasMinimumBusinessProfile,
  profileToStore,
  sanitizeBusinessProfile,
  synthesizeStorefront,
} from "@/lib/storefront-builder/local-ai";
import type { WebsiteBuilderContext, WebsiteBuilderToolDef } from "./types";

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
        "Choose the best website design direction for the merchant based on their business and brand tone. Internal only.",
      parameters: {
        type: "object",
        properties: {
          design_direction: { type: "string" },
        },
        additionalProperties: false,
      },
      handler: async (_args, ctx) => {
        const available = concreteTemplateIds(ctx.templateOptions);
        const top = ctx.recommendations[0]?.template_id;
        const selected =
          top && available.includes(top)
            ? top
            : available[0] ?? null;
        ctx.selectedTemplateId = selected;
        ctx.status = "template_recommendation";
        return { ok: true, design_direction: _args.design_direction ?? "best_fit" };
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
        if (!ctx.selectedTemplateId) {
          const available = concreteTemplateIds(ctx.templateOptions);
          ctx.selectedTemplateId =
            ctx.recommendations[0]?.template_id && available.includes(ctx.recommendations[0].template_id)
              ? ctx.recommendations[0].template_id
              : available[0] ?? null;
        }
        if (!ctx.selectedTemplateId) {
          return { ok: false, error: "missing_design_direction" };
        }

        const store = profileToStore(ctx.profile, ctx.selectedTemplateId);
        ctx.storefront = synthesizeStorefront(store, ctx.recommendations);
        ctx.status = "content_generated";
        ctx.payload = {
          type: "website_generated",
          changed_paths: [],
        };
        return { ok: true };
      },
    },
    {
      name: "refine_website_copy",
      description:
        "Refine existing website copy such as the hero headline, about section, FAQ answers, CTA label, or SEO text.",
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
