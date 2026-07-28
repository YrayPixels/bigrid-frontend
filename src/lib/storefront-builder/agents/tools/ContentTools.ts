import { applyStorefrontEditAsync } from "@/lib/storefront-builder/local-ai";
import type { WebsiteBuilderToolDef } from "../types";

/** Scoped copy and content edits (hero, about, FAQ, SEO, etc.). */
export class ContentTools {
  static definitions(): WebsiteBuilderToolDef[] {
    return [
      {
        name: "refine_website_copy",
        description:
          "Refine website copy or a specific page/section across any template (Essentials/category showcase, hero, about, FAQ, CTA/promo panels, home-stats trust row, collections, rooms, difference features, product grid titles, SEO). For FAQ invent/update/come-up-with/fit-my-brand asks, instruct a full FAQ rewrite for the business (not one new question). For SEO invent/update/improve asks without exact text, instruct a rewrite of seo.title and seo.description for the business. Use home_stats.N.value/label or pages.home.blocks.{id}.props.* for section text. Do not use for whole-site photo replacement or design switches.",
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
            typeof args.instruction === "string" && args.instruction.trim()
              ? args.instruction.trim()
              : "";
          const instruction = [stepInstruction, ctx.planIntent, ctx.message].filter(Boolean).join(" — ");
          const result = await applyStorefrontEditAsync(ctx.storefront, instruction, {
            store: ctx.session.store,
            planIntent: ctx.planIntent,
            message: ctx.message,
          });
          ctx.storefront = result.storefront;
          ctx.status = "review_ready";
          ctx.assistantMessage =
            result.assistant_message || "Done — I've updated the copy. Check the preview on the right!";
          ctx.payload = {
            type: "website_refined",
            changed_paths: result.changed_paths,
          };
          return { ok: true, changed_paths: result.changed_paths };
        },
      },
    ];
  }
}
