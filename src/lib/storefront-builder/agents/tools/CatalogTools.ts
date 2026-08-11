import { api } from "@/lib/api/client";
import type { StoreProduct } from "@/lib/api/types";
import {
  applyPageBlockOperations,
  resolveBlockIdFromInstruction,
} from "@/lib/storefront/blocks/page-block-operations";
import { resolvePageBlocks } from "@/lib/storefront/blocks/migrate-page-blocks";
import {
  hydrateShowcaseItemsFromCategories,
  hydrateStorefrontCategoryShowcases,
} from "@/lib/storefront/blocks/category-showcase-utils";
import type { CategoryShowcaseItem } from "@/lib/storefront/blocks/types";
import { applyCategoryShowcaseImagesOnly } from "@/lib/storefront-builder/image-sourcing";
import { applyFashionCategoryShowcaseCopy } from "@/lib/storefront-builder/local-ai";
import type { WebsiteBuilderToolDef } from "../types";
import {
  asNumber,
  asString,
  removeStorefrontProduct,
  requireConfirm,
  resolveLiveProduct,
  syncStorefrontProduct,
} from "./toolHelpers";
import {
  getProductFocus,
  resolveProductNameFromContext,
  withProductFocus,
} from "@/lib/storefront-builder/product-focus";

/** Live catalog CRUD: list, update, archive/delete, variants, categories, showcase linking. */
export class CatalogTools {
  static definitions(): WebsiteBuilderToolDef[] {
    return [
      {
        name: "list_products",
        description:
          "List the merchant's live product catalog (id, name, price, stock, status, category). Always call this before updating, archiving, or deleting products so you use real ids.",
        parameters: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["all", "active", "draft", "archived"],
              description: "Optional status filter. Defaults to all.",
            },
            search: {
              type: "string",
              description: "Optional name search filter",
            },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          try {
            const products = await api.getProducts();
            const status = asString(args.status) || "all";
            const search = asString(args.search).toLowerCase();
            const filtered = products.filter((product) => {
              if (status !== "all" && (product.status ?? "active") !== status) return false;
              if (search && !product.name.toLowerCase().includes(search)) return false;
              return true;
            });

            const summary = filtered.map((product) => ({
              id: product.id,
              name: product.name,
              price: product.price,
              currency: product.currency,
              stock_quantity: product.stock_quantity ?? null,
              status: product.status ?? "active",
              category: product.category ?? null,
              category_id: product.category_id ?? null,
              image_url: product.image_url,
              variants: product.variants ?? [],
            }));

            ctx.payload = {
              type: "products_listed",
              count: summary.length,
              products: summary,
              suggested_actions: [
                { type: "link", label: "Manage Products", href: "/admin/products" },
              ],
            };
            ctx.assistantMessage =
              summary.length === 0
                ? "You don't have any products matching that filter yet. I can help you add some."
                : `Here ${summary.length === 1 ? "is your product" : `are your ${summary.length} products`} — tap any card in Manage Products to edit.`;
            return { ok: true, count: summary.length, products: summary };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "list_products_failed",
            };
          }
        },
      },
      {
        name: "update_product",
        description:
          "Update an existing product by product_id (preferred) or unique product_name. Use for price, name, description, stock, image, status, category, sku, or perks. Call list_products first if you don't have the id.",
        parameters: {
          type: "object",
          properties: {
            product_id: { type: "string" },
            product_name: { type: "string" },
            name: { type: "string" },
            price: { type: "number" },
            description: { type: "string" },
            stock_quantity: { type: "number" },
            image_url: { type: "string" },
            images: {
              type: "array",
              items: { type: "string" },
              description: "Full product gallery URLs. First entry should match the cover image_url when replacing.",
            },
            status: { type: "string", enum: ["active", "draft", "archived"] },
            category: { type: "string" },
            category_id: { type: "string" },
            sku: { type: "string" },
            perks: { type: "array", items: { type: "string" } },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          const productName = resolveProductNameFromContext({
            message: ctx.message,
            proposedName: asString(args.product_name) || undefined,
            focus: getProductFocus(ctx.profile),
          });
          const resolved = await resolveLiveProduct(
            asString(args.product_id) || undefined,
            productName,
          );
          if (!resolved.product) return { ok: false, error: resolved.error };

          const patch: Partial<StoreProduct> = {};
          if (asString(args.name)) patch.name = asString(args.name);
          const price = asNumber(args.price);
          if (price !== null) {
            if (price <= 0) return { ok: false, error: "price_must_be_positive" };
            patch.price = price;
          }
          if (typeof args.description === "string") patch.description = args.description;
          const stock = asNumber(args.stock_quantity);
          if (stock !== null) patch.stock_quantity = Math.max(0, Math.floor(stock));
          if (typeof args.image_url === "string") patch.image_url = args.image_url || null;
          if (Array.isArray(args.images)) {
            patch.images = args.images.map(String).filter((url) => url.trim()).slice(0, 12);
          }
          if (
            args.status === "active" ||
            args.status === "draft" ||
            args.status === "archived"
          ) {
            patch.status = args.status;
          }
          if (typeof args.category === "string") patch.category = args.category;
          if (typeof args.category_id === "string") patch.category_id = args.category_id || null;
          if (typeof args.sku === "string") patch.sku = args.sku;
          if (Array.isArray(args.perks)) patch.perks = args.perks.map(String);

          if (Object.keys(patch).length === 0) {
            return { ok: false, error: "no_fields_to_update" };
          }

          try {
            const updated = await api.updateProduct(resolved.product.id, patch);
            if (ctx.storefront?.products) {
              ctx.storefront = {
                ...ctx.storefront,
                products: syncStorefrontProduct(ctx.storefront.products, updated) ?? ctx.storefront.products,
              };
            }
            ctx.status = "review_ready";
            ctx.profile = withProductFocus(ctx.profile, {
              product_id: updated.id,
              product_name: updated.name,
            });
            ctx.assistantMessage = `Updated **${updated.name}**. Check Products or the preview.`;
            ctx.payload = { type: "product_updated", product: updated };
            return { ok: true, product: updated };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "update_product_failed",
            };
          }
        },
      },
      {
        name: "archive_product",
        description:
          "Archive a product (soft-hide from the storefront) by product_id. Prefer this over delete_product.",
        parameters: {
          type: "object",
          properties: {
            product_id: { type: "string" },
            product_name: { type: "string" },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          const resolved = await resolveLiveProduct(
            asString(args.product_id) || undefined,
            asString(args.product_name) || undefined,
          );
          if (!resolved.product) return { ok: false, error: resolved.error };

          try {
            const updated = await api.updateProduct(resolved.product.id, { status: "archived" });
            if (ctx.storefront?.products) {
              ctx.storefront = {
                ...ctx.storefront,
                products:
                  removeStorefrontProduct(ctx.storefront.products, {
                    id: updated.id,
                    name: updated.name,
                  }) ?? ctx.storefront.products,
              };
            }
            ctx.status = "review_ready";
            ctx.assistantMessage = `Archived **${updated.name}**. It won't show on the live storefront.`;
            ctx.payload = { type: "product_archived", product: updated };
            return { ok: true, product: updated };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "archive_product_failed",
            };
          }
        },
      },
      {
        name: "delete_product",
        description:
          "Permanently delete a product. Prefer archive_product. Requires confirm=true and product_id from list_products.",
        parameters: {
          type: "object",
          properties: {
            product_id: { type: "string" },
            confirm: {
              type: "boolean",
              description: "Must be true. Never delete without explicit merchant confirmation.",
            },
          },
          required: ["product_id", "confirm"],
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          if (!requireConfirm(args)) {
            return {
              ok: false,
              error: "confirm_required",
              message: "Ask the merchant to confirm permanent deletion, then call again with confirm=true.",
            };
          }
          const productId = asString(args.product_id);
          if (!productId) return { ok: false, error: "missing_product_id" };

          const resolved = await resolveLiveProduct(productId);
          if (!resolved.product) return { ok: false, error: resolved.error };

          try {
            await api.deleteProduct(productId);
            if (ctx.storefront?.products) {
              ctx.storefront = {
                ...ctx.storefront,
                products:
                  removeStorefrontProduct(ctx.storefront.products, {
                    id: productId,
                    name: resolved.product.name,
                  }) ?? ctx.storefront.products,
              };
            }
            ctx.status = "review_ready";
            ctx.assistantMessage = `Deleted **${resolved.product.name}** permanently.`;
            ctx.payload = {
              type: "product_deleted",
              product_id: productId,
              name: resolved.product.name,
            };
            return { ok: true, product_id: productId };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "delete_product_failed",
            };
          }
        },
      },
      {
        name: "set_product_variants",
        description:
          "Set size/color (or other) option groups on a product. Replaces the full variants array. Options may be strings or objects with value, optional price, and optional image_url. Example: [{ name: \"Size\", options: [{ value: \"S\", price: 5000 }, { value: \"L\", price: 7000 }] }].",
        parameters: {
          type: "object",
          properties: {
            product_id: { type: "string" },
            product_name: { type: "string" },
            variants: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  options: {
                    type: "array",
                    items: {
                      anyOf: [
                        { type: "string" },
                        {
                          type: "object",
                          properties: {
                            value: { type: "string" },
                            price: { type: ["number", "null"] },
                            image_url: { type: ["string", "null"] },
                          },
                          required: ["value"],
                          additionalProperties: false,
                        },
                      ],
                    },
                  },
                },
                required: ["name", "options"],
                additionalProperties: false,
              },
            },
          },
          required: ["variants"],
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          const resolved = await resolveLiveProduct(
            asString(args.product_id) || undefined,
            asString(args.product_name) || undefined,
          );
          if (!resolved.product) return { ok: false, error: resolved.error };

          const raw = Array.isArray(args.variants) ? args.variants : [];
          const variants = raw
            .map((row: { name?: unknown; options?: unknown }) => {
              const name = asString(row?.name);
              const options = Array.isArray(row?.options)
                ? row.options
                    .map((o: unknown) => {
                      if (typeof o === "string") {
                        const value = o.trim();
                        return value ? { value } : null;
                      }
                      if (!o || typeof o !== "object") return null;
                      const opt = o as {
                        value?: unknown;
                        price?: unknown;
                        image_url?: unknown;
                      };
                      const value = asString(opt.value);
                      if (!value) return null;
                      const mapped: {
                        value: string;
                        price?: number | null;
                        image_url?: string | null;
                      } = { value };
                      if (opt.price != null && opt.price !== "") {
                        const price = Number(opt.price);
                        if (Number.isFinite(price) && price >= 0) mapped.price = price;
                      }
                      if (typeof opt.image_url === "string" && opt.image_url.trim()) {
                        mapped.image_url = opt.image_url.trim();
                      }
                      return mapped;
                    })
                    .filter(
                      (
                        o,
                      ): o is {
                        value: string;
                        price?: number | null;
                        image_url?: string | null;
                      } => !!o,
                    )
                : [];
              return name && options.length ? { name, options } : null;
            })
            .filter(
              (
                row,
              ): row is {
                name: string;
                options: Array<{
                  value: string;
                  price?: number | null;
                  image_url?: string | null;
                }>;
              } => !!row,
            );

          try {
            const updated = await api.updateProduct(resolved.product.id, { variants });
            if (ctx.storefront?.products) {
              ctx.storefront = {
                ...ctx.storefront,
                products: syncStorefrontProduct(ctx.storefront.products, updated) ?? ctx.storefront.products,
              };
            }
            ctx.status = "review_ready";
            ctx.assistantMessage =
              variants.length === 0
                ? `Cleared variants on **${updated.name}**.`
                : `Updated variants on **${updated.name}**: ${variants.map((v) => v.name).join(", ")}.`;
            ctx.payload = { type: "product_variants_set", product: updated };
            return { ok: true, product: updated };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "set_product_variants_failed",
            };
          }
        },
      },
      {
        name: "manage_categories",
        description:
          "List, create, rename, or delete store categories. Use action=list|create|update|delete. Deleting requires confirm=true.",
        parameters: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["list", "create", "update", "delete"] },
            category_id: { type: "string" },
            name: { type: "string" },
            parent_id: { type: "string" },
            sort_order: { type: "number" },
            confirm: { type: "boolean" },
          },
          required: ["action"],
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          const action = asString(args.action);
          try {
            if (action === "list") {
              const categories = await api.getCategories();
              ctx.payload = { type: "categories_listed", categories };
              ctx.assistantMessage =
                categories.length === 0
                  ? "No categories yet. I can create some for you."
                  : `You have ${categories.length} categor${categories.length === 1 ? "y" : "ies"}.`;
              return { ok: true, categories };
            }

            if (action === "create") {
              const name = asString(args.name);
              if (!name) return { ok: false, error: "missing_name" };
              const category = await api.createCategory({
                name,
                parent_id: asString(args.parent_id) || null,
                sort_order: asNumber(args.sort_order) ?? undefined,
              });
              ctx.assistantMessage = `Created category **${category.name}**.`;
              ctx.payload = { type: "category_created", category };
              return { ok: true, category };
            }

            if (action === "update") {
              const categoryId = asString(args.category_id);
              if (!categoryId) return { ok: false, error: "missing_category_id" };
              const body: { name?: string; parent_id?: string | null; sort_order?: number } = {};
              if (asString(args.name)) body.name = asString(args.name);
              if (typeof args.parent_id === "string") body.parent_id = args.parent_id || null;
              const sort = asNumber(args.sort_order);
              if (sort !== null) body.sort_order = sort;
              if (!Object.keys(body).length) return { ok: false, error: "no_fields_to_update" };
              const category = await api.updateCategory(categoryId, body);
              ctx.assistantMessage = `Updated category **${category.name}**.`;
              ctx.payload = { type: "category_updated", category };
              return { ok: true, category };
            }

            if (action === "delete") {
              if (!requireConfirm(args)) {
                return {
                  ok: false,
                  error: "confirm_required",
                  message: "Ask the merchant to confirm category deletion, then call with confirm=true.",
                };
              }
              const categoryId = asString(args.category_id);
              if (!categoryId) return { ok: false, error: "missing_category_id" };
              await api.deleteCategory(categoryId);
              ctx.assistantMessage = "Category deleted.";
              ctx.payload = { type: "category_deleted", category_id: categoryId };
              return { ok: true, category_id: categoryId };
            }

            return { ok: false, error: "unknown_action" };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "manage_categories_failed",
            };
          }
        },
      },
      {
        name: "link_category_showcase",
        description:
          "Wire homepage collection sections (Essentials, curated collections, rooms, choose your style) to real store categories. Pass block_id when targeting a specific section. Pass items with label + category_id, or omit items to auto-link from existing categories. Missing tile images are filled from Unsplash.",
        parameters: {
          type: "object",
          properties: {
            block_id: {
              type: "string",
              description:
                "Target block: category-showcase, collections, rooms, or choose-style. Defaults from the merchant message.",
            },
            title: { type: "string" },
            eyebrow: { type: "string" },
            cta_label: { type: "string", description: 'Header CTA like "View All"' },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  category_id: { type: "string" },
                  category_slug: { type: "string" },
                  image_url: { type: "string" },
                  href: { type: "string" },
                  cta_label: { type: "string" },
                },
                required: ["label"],
                additionalProperties: false,
              },
            },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          if (!ctx.storefront) return { ok: false, error: "website_not_generated" };

          const categories = await api.getCategories().catch(() => []);
          const rawItems = Array.isArray(args.items) ? args.items : [];
          let items: CategoryShowcaseItem[] = [];
          for (const row of rawItems as Array<Record<string, unknown>>) {
            const label = asString(row?.label);
            if (!label) continue;
            items.push({
              label,
              category_id: asString(row?.category_id) || null,
              category_slug: asString(row?.category_slug) || null,
              image_url: asString(row?.image_url) || null,
              href: asString(row?.href) || null,
              cta_label: asString(row?.cta_label) || null,
            });
          }

          if (!items.length && categories.length) {
            items = hydrateShowcaseItemsFromCategories([], categories, {
              limit: 8,
              products: ctx.storefront.products,
              replaceStockImages: true,
            });
          }

          if (!items.length) {
            return {
              ok: false,
              error: "no_items",
              message: "No categories to link yet. Create categories first, then link them to the section.",
            };
          }

          const blocks = resolvePageBlocks(ctx.storefront, "home");
          const explicitBlockId = asString(args.block_id);
          const instructionHint = [explicitBlockId, ctx.planIntent, ctx.message, "category showcase"]
            .filter(Boolean)
            .join(" ");
          const blockId =
            explicitBlockId ||
            resolveBlockIdFromInstruction(instructionHint, "home", blocks) ||
            "category-showcase";

          const props: Record<string, unknown> = { items };
          if (asString(args.title)) props.title = asString(args.title);
          if (asString(args.eyebrow)) props.eyebrow = asString(args.eyebrow);
          if (asString(args.cta_label)) props.cta_label = asString(args.cta_label);

          const result = applyPageBlockOperations(
            ctx.storefront,
            "home",
            [{ op: "update_block", page: "home", block_id: blockId, props }],
            ctx.session.store,
          );

          if (!result.changed_block_ids.length) {
            return {
              ok: false,
              error: "showcase_not_updated",
              message: "Could not find or update that collection section (it may be locked).",
            };
          }

          let storefront = result.storefront;
          if (ctx.session.store) {
            storefront = applyFashionCategoryShowcaseCopy(storefront, ctx.session.store);
          }
          if (categories.length) {
            storefront = hydrateStorefrontCategoryShowcases(storefront, categories, {
              products: storefront.products,
              replaceStockImages: true,
            }).storefront;
          }

          const images = await applyCategoryShowcaseImagesOnly(
            storefront,
            `${ctx.profile.business_name ?? ""} ${ctx.profile.description ?? ""} collection photos`.trim(),
            {
              business_name: ctx.session.store?.business_name,
              industry: ctx.session.store?.industry,
              description: ctx.session.store?.description,
              tone: ctx.profile.tone,
            },
          );

          ctx.storefront = images.storefront;
          ctx.status = "review_ready";
          ctx.assistantMessage = `Linked ${items.length} categor${items.length === 1 ? "y" : "ies"} to your collection section${images.changed_paths.length ? " and filled missing photos" : ""}. Check the preview.`;
          ctx.payload = {
            type: "category_showcase_linked",
            block_id: blockId,
            items,
            changed_paths: [
              ...result.changed_block_ids.map((id) => `pages.home.blocks.${id}`),
              ...images.changed_paths,
            ],
          };
          return { ok: true, block_id: blockId, items, images_filled: images.changed_paths.length };
        },
      },
      {
        name: "duplicate_product",
        description:
          "Duplicate an existing product (useful for similar variants). Pass product_id from list_products.",
        parameters: {
          type: "object",
          properties: {
            product_id: { type: "string" },
          },
          required: ["product_id"],
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          const productId = asString(args.product_id);
          if (!productId) return { ok: false, error: "missing_product_id" };
          try {
            const product = await api.duplicateProduct(productId);
            ctx.assistantMessage = `Duplicated as **${product.name}**. You can rename or adjust price next.`;
            ctx.payload = { type: "product_duplicated", product };
            ctx.status = "review_ready";
            return { ok: true, product };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "duplicate_product_failed",
            };
          }
        },
      },
    ];
  }
}
