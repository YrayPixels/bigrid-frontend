import { api } from "@/lib/api/client";
import type { UpdateStoreInput } from "@/lib/api/types";
import {
  extractBusinessProfile,
  hasMinimumBusinessProfile,
  sanitizeBusinessProfile,
  concreteTemplateIds,
} from "@/lib/storefront-builder/local-ai";
import { asString } from "./toolHelpers";
import { sanitizePendingAction, withPendingAction } from "@/lib/storefront-builder/pending-action";
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

          // Persist identity fields so Settings edits are not fighting a session-only profile.
          if (ctx.session.store) {
            const body: UpdateStoreInput = {};
            if (ctx.profile.business_name) body.business_name = ctx.profile.business_name;
            if (typeof ctx.profile.description === "string") body.description = ctx.profile.description;
            if (ctx.profile.industry) body.industry = ctx.profile.industry;
            if (ctx.profile.brand_color) body.brand_color = ctx.profile.brand_color;
            if (Object.keys(body).length) {
              try {
                const store = await api.updateMyStore(body);
                ctx.session = { ...ctx.session, store };
              } catch {
                // Session profile still updated; retry via update_store_profile if needed.
              }
            }
          }

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
        description:
          "Ask the merchant one short clarifying question when something important is ambiguous — e.g. which product, which section/photo, business name, price, or what they sell. When continuing a specific tool after the answer, pass resume_tool + resume_arguments + await_field so the next reply resumes that action.",
        parameters: {
          type: "object",
          properties: {
            question: { type: "string" },
            resume_tool: {
              type: "string",
              description: "Tool to run after the merchant answers (e.g. add_products, replace_template_images).",
            },
            resume_arguments: {
              type: "object",
              description: "Partial arguments for resume_tool; the awaited field will be filled from their reply.",
            },
            await_field: {
              type: "string",
              description: "Argument name to fill from the reply (e.g. price, product_name, instruction).",
            },
            await_kind: {
              type: "string",
              enum: ["price", "product_name", "text"],
              description: "How to interpret the merchant's reply.",
            },
          },
          required: ["question"],
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          const question = typeof args.question === "string" ? args.question.trim() : "";
          if (!question) return { ok: false, error: "missing_question" };

          const resumeTool = asString(args.resume_tool);
          const awaitField = asString(args.await_field);
          const awaitKind =
            args.await_kind === "price" ||
            args.await_kind === "product_name" ||
            args.await_kind === "text"
              ? args.await_kind
              : awaitField === "price"
                ? "price"
                : awaitField === "product_name"
                  ? "product_name"
                  : "text";

          const pending = resumeTool
            ? sanitizePendingAction({
                type: "resume_tool",
                tool: resumeTool,
                arguments:
                  args.resume_arguments && typeof args.resume_arguments === "object"
                    ? (args.resume_arguments as Record<string, unknown>)
                    : {},
                await_field: awaitField || undefined,
                await_kind: awaitKind,
                question,
                original_message: ctx.message,
              })
            : sanitizePendingAction({
                type: "clarification",
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
          return { ok: true, question, pending_action: pending };
        },
      },
    ];
  }
}
