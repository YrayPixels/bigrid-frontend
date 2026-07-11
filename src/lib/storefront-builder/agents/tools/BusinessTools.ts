import {
  extractBusinessProfile,
  hasMinimumBusinessProfile,
  sanitizeBusinessProfile,
  concreteTemplateIds,
} from "@/lib/storefront-builder/local-ai";
import type { WebsiteBuilderToolDef } from "../types";

/** Discovery & intake: capture merchant details, pick design direction, ask questions. */
export class BusinessTools {
  static definitions(): WebsiteBuilderToolDef[] {
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
          ctx.payload = {
            type: "business_details_captured",
            profile: ctx.profile,
          };
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
                : (available[0] ?? null);
          ctx.selectedTemplateId = selected;
          ctx.status = "template_recommendation";
          ctx.payload = {
            type: "design_selected",
            template_id: selected,
            design_direction:
              typeof args.design_direction === "string" ? args.design_direction : "best_fit",
          };
          return {
            ok: true,
            design_direction: args.design_direction ?? "best_fit",
            template_id: selected,
          };
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
}
