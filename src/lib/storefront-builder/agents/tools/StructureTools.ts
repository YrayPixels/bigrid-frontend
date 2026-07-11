import {
  applyPageBlockOperations,
  canRemovePageBlock,
  describePageBlockChanges,
  resolveBlockIdFromInstruction,
  resolvePageFromInstruction,
} from "@/lib/storefront/blocks/page-block-operations";
import { resolvePageBlocks } from "@/lib/storefront/blocks/migrate-page-blocks";
import { isAddableHomeBlockType } from "@/lib/storefront/blocks/catalog";
import type {
  StorefrontBlockOperation,
  StorefrontBlockType,
  StorefrontContentPageSlug,
} from "@/lib/storefront/blocks/types";
import type { WebsiteBuilderToolDef } from "../types";
import { asString, requireConfirm } from "./toolHelpers";

const PAGE_ENUM = ["home", "about", "contact", "faq"] as const;
const BLOCK_TYPE_ENUM = [
  "stats_row",
  "rich_text",
  "feature_grid",
  "cta_banner",
  "product_grid",
  "category_showcase",
  "faq",
] as const;

function resolvePage(args: Record<string, unknown>, fallbackInstruction = ""): StorefrontContentPageSlug {
  const page = asString(args.page);
  if ((PAGE_ENUM as readonly string[]).includes(page)) {
    return page as StorefrontContentPageSlug;
  }
  return resolvePageFromInstruction(fallbackInstruction || page);
}

function resolveBlockId(
  args: Record<string, unknown>,
  page: StorefrontContentPageSlug,
  storefrontBlocks: ReturnType<typeof resolvePageBlocks>,
): string | null {
  const explicit = asString(args.block_id);
  if (explicit) return explicit;
  const hint = asString(args.section) || asString(args.instruction);
  return resolveBlockIdFromInstruction(hint, page, storefrontBlocks);
}

/** First-class page/block structure tools (promote ops buried under refine). */
export class StructureTools {
  static definitions(): WebsiteBuilderToolDef[] {
    return [
      {
        name: "update_page_section",
        description:
          "Update props on a specific page block (hero, Essentials/category showcase, FAQ, CTA, etc.). Prefer this for targeted structural/content prop changes. Pass page + block_id (or section alias like 'hero' / 'essentials') and a props object.",
        parameters: {
          type: "object",
          properties: {
            page: { type: "string", enum: [...PAGE_ENUM] },
            block_id: { type: "string" },
            section: {
              type: "string",
              description: "Alias when block_id unknown: hero, essentials, products, faq, trust, promo",
            },
            props: { type: "object", additionalProperties: true },
          },
          required: ["props"],
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          if (!ctx.storefront) return { ok: false, error: "website_not_generated" };
          const page = resolvePage(args, asString(args.section));
          const blocks = resolvePageBlocks(ctx.storefront, page);
          const blockId = resolveBlockId(args, page, blocks);
          if (!blockId) return { ok: false, error: "missing_block_id" };
          const props =
            args.props && typeof args.props === "object" && !Array.isArray(args.props)
              ? (args.props as Record<string, unknown>)
              : null;
          if (!props || !Object.keys(props).length) return { ok: false, error: "missing_props" };

          const result = applyPageBlockOperations(
            ctx.storefront,
            page,
            [{ op: "update_block", page, block_id: blockId, props }],
            ctx.session.store,
          );
          if (!result.changed_block_ids.length) {
            return { ok: false, error: "block_not_updated", block_id: blockId };
          }

          ctx.storefront = result.storefront;
          ctx.status = "review_ready";
          ctx.assistantMessage = describePageBlockChanges(page, result.changed_block_ids);
          ctx.payload = {
            type: "page_section_updated",
            page,
            changed_block_ids: result.changed_block_ids,
          };
          return { ok: true, page, changed_block_ids: result.changed_block_ids };
        },
      },
      {
        name: "regenerate_section",
        description:
          "Rebuild one page section's default content from the business profile without regenerating the whole site.",
        parameters: {
          type: "object",
          properties: {
            page: { type: "string", enum: [...PAGE_ENUM] },
            block_id: { type: "string" },
            section: { type: "string" },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          if (!ctx.storefront) return { ok: false, error: "website_not_generated" };
          const page = resolvePage(args, asString(args.section));
          const blocks = resolvePageBlocks(ctx.storefront, page);
          const blockId = resolveBlockId(args, page, blocks);
          if (!blockId) return { ok: false, error: "missing_block_id" };

          const result = applyPageBlockOperations(
            ctx.storefront,
            page,
            [{ op: "regenerate_section", page, block_id: blockId, props: {} }],
            ctx.session.store,
          );
          if (!result.changed_block_ids.length) {
            return { ok: false, error: "section_not_regenerated", block_id: blockId };
          }

          ctx.storefront = result.storefront;
          ctx.status = "review_ready";
          ctx.assistantMessage = `Regenerated the ${blockId} section on your ${page} page.`;
          ctx.payload = {
            type: "section_regenerated",
            page,
            changed_block_ids: result.changed_block_ids,
          };
          return { ok: true, page, changed_block_ids: result.changed_block_ids };
        },
      },
      {
        name: "reorder_page_blocks",
        description:
          "Reorder sections on a page. Pass the full desired block id order for that page.",
        parameters: {
          type: "object",
          properties: {
            page: { type: "string", enum: [...PAGE_ENUM], description: "Defaults to home" },
            order: {
              type: "array",
              items: { type: "string" },
              description: "Block ids in the desired top-to-bottom order",
            },
          },
          required: ["order"],
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          if (!ctx.storefront) return { ok: false, error: "website_not_generated" };
          const page = resolvePage(args, "home");
          const order = Array.isArray(args.order) ? args.order.map(String).filter(Boolean) : [];
          if (order.length < 2) return { ok: false, error: "order_needs_at_least_two_ids" };

          const result = applyPageBlockOperations(
            ctx.storefront,
            page,
            [{ op: "reorder_blocks", page, order }],
            ctx.session.store,
          );
          ctx.storefront = result.storefront;
          ctx.status = "review_ready";
          ctx.assistantMessage = `Reordered sections on your ${page} page.`;
          ctx.payload = {
            type: "page_blocks_reordered",
            page,
            order,
            changed_block_ids: result.changed_block_ids,
          };
          return { ok: true, page, order };
        },
      },
      {
        name: "add_page_block",
        description:
          "Add a new section to the homepage. Allowed types: stats_row, rich_text, feature_grid, cta_banner, product_grid, category_showcase, faq.",
        parameters: {
          type: "object",
          properties: {
            type: { type: "string", enum: [...BLOCK_TYPE_ENUM] },
            after: { type: "string", description: "Insert after this block id" },
            before: { type: "string", description: "Insert before this block id" },
            props: { type: "object", additionalProperties: true },
          },
          required: ["type"],
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          if (!ctx.storefront) return { ok: false, error: "website_not_generated" };
          const type = asString(args.type);
          if (!isAddableHomeBlockType(type)) {
            return { ok: false, error: `type_not_addable:${type}` };
          }

          const props =
            args.props && typeof args.props === "object" && !Array.isArray(args.props)
              ? (args.props as Record<string, unknown>)
              : undefined;

          const operation: StorefrontBlockOperation = {
            op: "add_block",
            page: "home",
            type: type as StorefrontBlockType,
            after: asString(args.after) || undefined,
            before: asString(args.before) || undefined,
            props,
          };

          const beforeIds = new Set(resolvePageBlocks(ctx.storefront, "home").map((b) => b.id));
          const result = applyPageBlockOperations(
            ctx.storefront,
            "home",
            [operation],
            ctx.session.store,
          );
          const added = result.changed_block_ids.filter((id) => !beforeIds.has(id));
          if (!added.length) {
            return { ok: false, error: "block_not_added" };
          }

          ctx.storefront = result.storefront;
          ctx.status = "review_ready";
          ctx.assistantMessage = `Added a ${type.replaceAll("_", " ")} section to your homepage.`;
          ctx.payload = {
            type: "page_block_added",
            block_ids: added,
            block_type: type,
          };
          return { ok: true, block_ids: added, block_type: type };
        },
      },
      {
        name: "remove_page_block",
        description:
          "Remove a non-protected section from a page. Hero/about-main/contact-form/faq-main cannot be removed. Requires confirm=true.",
        parameters: {
          type: "object",
          properties: {
            page: { type: "string", enum: [...PAGE_ENUM] },
            block_id: { type: "string" },
            section: { type: "string" },
            confirm: { type: "boolean" },
          },
          required: ["confirm"],
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          if (!ctx.storefront) return { ok: false, error: "website_not_generated" };
          if (!requireConfirm(args)) {
            return {
              ok: false,
              error: "confirm_required",
              message: "Ask the merchant to confirm section removal, then call with confirm=true.",
            };
          }

          const page = resolvePage(args, asString(args.section));
          const blocks = resolvePageBlocks(ctx.storefront, page);
          const blockId = resolveBlockId(args, page, blocks);
          if (!blockId) return { ok: false, error: "missing_block_id" };
          if (!canRemovePageBlock(page, blockId)) {
            return { ok: false, error: "protected_block", block_id: blockId };
          }

          const result = applyPageBlockOperations(
            ctx.storefront,
            page,
            [{ op: "remove_block", page, block_id: blockId }],
            ctx.session.store,
          );
          if (!result.changed_block_ids.length) {
            return { ok: false, error: "block_not_removed", block_id: blockId };
          }

          ctx.storefront = result.storefront;
          ctx.status = "review_ready";
          ctx.assistantMessage = `Removed the ${blockId} section from your ${page} page.`;
          ctx.payload = {
            type: "page_block_removed",
            page,
            block_id: blockId,
          };
          return { ok: true, page, block_id: blockId };
        },
      },
    ];
  }
}
