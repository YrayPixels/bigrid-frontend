import { api } from "@/lib/api/client";
import type { StoreProduct } from "@/lib/api/types";
import type { WebsiteBuilderToolDef } from "../types";
import { asString, resolveLiveProduct, resolveStorefrontProduct, syncStorefrontProduct } from "./toolHelpers";
import { sanitizePendingAction, withPendingAction } from "@/lib/storefront-builder/pending-action";
import {
  getProductFocus,
  resolveProductNameFromContext,
  withProductFocus,
} from "@/lib/storefront-builder/product-focus";

/** Catalog: add products, rewrite descriptions, vision from uploaded photos. */
export class ProductTools {
  static definitions(): WebsiteBuilderToolDef[] {
    return [
      {
        name: "add_products",
        description:
          "Add one or more products to the merchant's store. Creates real product entries with name, price, description, category, stock, and optional image. When the merchant asks to find/get/source a photo (or leaves image blank), set find_images=true so Unsplash photos are matched to each product name. If price is missing, ask_clarifying_question for the price instead of guessing.",
        parameters: {
          type: "object",
          properties: {
            products: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Product name" },
                  price: {
                    type: "number",
                    description: "Price in the merchant's currency. Required to create the product.",
                  },
                  description: { type: "string", description: "Short product description" },
                  category: { type: "string", description: "Category name (e.g. Dresses, Serums, Laptops)" },
                  stock_quantity: { type: "number", description: "How many in stock" },
                  image_url: {
                    type: "string",
                    description: "Product image URL if already known. Otherwise use find_images.",
                  },
                },
                required: ["name"],
                additionalProperties: false,
              },
              description: "List of products to add",
            },
            find_images: {
              type: "boolean",
              description:
                "When true (default if merchant asked for a photo / left image blank), search Unsplash for a photo matching each product name and attach it.",
            },
          },
          required: ["products"],
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          const raw = Array.isArray(args.products) ? args.products : [];
          if (!raw.length) return { ok: false, error: "No products provided." };
          if (!ctx.session.store) return { ok: false, error: "No store to add products to." };

          const missingPrice = raw
            .map((item) => {
              const name = typeof item.name === "string" ? item.name.trim() : "";
              const price =
                typeof item.price === "number" ? item.price : parseFloat(String(item.price ?? ""));
              if (!name) return null;
              if (isNaN(price) || price <= 0) return name;
              return null;
            })
            .filter((name): name is string => Boolean(name));

          if (missingPrice.length) {
            const label =
              missingPrice.length === 1
                ? missingPrice[0]
                : missingPrice.slice(0, 3).join(", ");
            const question =
              missingPrice.length === 1
                ? `What price should I set for ${label}?`
                : `What prices should I use for ${label}${missingPrice.length > 3 ? ", …" : ""}?`;

            const pendingProducts = raw
              .map((item) => {
                const name = typeof item.name === "string" ? item.name.trim() : "";
                if (!name) return null;
                const price =
                  typeof item.price === "number" ? item.price : parseFloat(String(item.price ?? ""));
                return {
                  name,
                  ...(!isNaN(price) && price > 0 ? { price } : {}),
                  ...(typeof item.description === "string" ? { description: item.description } : {}),
                  ...(typeof item.category === "string" ? { category: item.category } : {}),
                  ...(typeof item.stock_quantity === "number"
                    ? { stock_quantity: item.stock_quantity }
                    : {}),
                  ...(asString(item.image_url) ? { image_url: asString(item.image_url) } : {}),
                };
              })
              .filter((item): item is NonNullable<typeof item> => Boolean(item));

            const pending = sanitizePendingAction({
              type: "add_products",
              products: pendingProducts,
              find_images: args.find_images !== false,
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
            return { ok: false, error: "price_required", message: question, products: missingPrice };
          }

          const wantsImagesExplicit =
            args.find_images === true ||
            /\b(image|photo|picture|unsplash|find.*(image|photo)|get.*(image|photo)|source.*(image|photo))\b/i.test(
              ctx.message,
            );
          // Find Unsplash photos when asked, or whenever a product has no image_url (unless find_images=false).
          const findImages =
            args.find_images === false
              ? false
              : wantsImagesExplicit || raw.some((item) => !asString(item.image_url));

          const { findProductImageUrl } = await import("@/lib/storefront-builder/image-sourcing");
          const usedUrls = new Set<string>();
          const added: string[] = [];
          const failed: string[] = [];
          const imaged: string[] = [];
          const createdProducts: Awaited<ReturnType<typeof api.createProduct>>[] = [];

          for (const item of raw) {
            try {
              const name = typeof item.name === "string" ? item.name.trim() : "";
              const price =
                typeof item.price === "number" ? item.price : parseFloat(String(item.price ?? ""));
              if (!name || isNaN(price) || price <= 0) {
                failed.push(name || "(unnamed)");
                continue;
              }

              const description = typeof item.description === "string" ? item.description : "";
              const category = typeof item.category === "string" ? item.category : undefined;
              let imageUrl = asString(item.image_url) || null;

              if (findImages && !imageUrl) {
                const sourced = await findProductImageUrl(
                  { name, description, category: category ?? null },
                  {
                    intent: ctx.message,
                    context: {
                      business_name: ctx.session.store.business_name,
                      industry: ctx.session.store.industry,
                      description: ctx.session.store.description,
                      tone: ctx.profile.tone,
                    },
                    usedUrls,
                  },
                );
                if (sourced.url) {
                  imageUrl = sourced.url;
                  imaged.push(name);
                }
              }

              const created = await api.createProduct({
                name,
                price,
                description,
                currency: "NGN",
                slug: name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-|-$/g, ""),
                category,
                stock_quantity: typeof item.stock_quantity === "number" ? item.stock_quantity : undefined,
                image_url: imageUrl,
              });
              createdProducts.push(created);
              added.push(name);
            } catch (err) {
              console.error(
                `add_products failed for "${typeof item.name === "string" ? item.name : "unknown"}":`,
                err,
              );
              failed.push(typeof item.name === "string" ? item.name : "(unnamed)");
            }
          }

          if (added.length === 0) {
            ctx.assistantMessage =
              "I couldn't add those products. Please try again with product names and prices.";
            return { ok: false, error: "all_failed" };
          }

          // Clear any pending multi-turn add once products are created.
          ctx.profile = withPendingAction(ctx.profile, null);
          if (createdProducts[0]) {
            ctx.profile = withProductFocus(ctx.profile, {
              product_id: createdProducts[0].id,
              product_name: createdProducts[0].name,
            });
          }

          if (ctx.storefront) {
            const existing = ctx.storefront.products ?? [];
            ctx.storefront = {
              ...ctx.storefront,
              products: [...createdProducts, ...existing],
              data_plugs: {
                ...ctx.storefront.data_plugs,
                home_products_source: "merchant_products",
              },
            };
          }

          const summary =
            added.length === 1
              ? `Added ${added[0]} to your store.`
              : `Added ${added.length} products: ${added.slice(0, 3).join(", ")}${added.length > 3 ? ` and ${added.length - 3} more` : ""}.`;
          const imageNote =
            imaged.length > 0
              ? imaged.length === 1
                ? ` I also found a matching photo for ${imaged[0]}.`
                : ` I also found matching photos for ${imaged.length} of them.`
              : findImages
                ? " I couldn't find a stock photo for every item — you can upload your own anytime."
                : "";

          ctx.assistantMessage = `${summary}${imageNote} They'll appear on your storefront. You can manage them on the Products page.`;
          ctx.status = "review_ready";
          ctx.payload = {
            type: "products_added",
            added,
            failed,
            imaged,
            suggested_actions: [{ type: "link", label: "Manage Products", href: "/admin/products" }],
          };
          return { ok: true, added, failed, imaged };
        },
      },
      {
        name: "generate_product_descriptions",
        description:
          "Generate compelling, SEO-friendly product descriptions. Use for all products when the merchant wants better catalog copy. When they name a specific product (e.g. Samsung A15), ALWAYS pass product_name — updates ONLY that product. Pass instruction when they ask descriptions to match name/brand/tone. If which product is unclear, ask_clarifying_question instead of rewriting everything.",
        parameters: {
          type: "object",
          properties: {
            style: {
              type: "string",
              description: "Optional style direction — e.g. luxury, playful, minimal, technical",
            },
            instruction: {
              type: "string",
              description:
                "What the descriptions should emphasize — e.g. match each product name and brand, highlight benefits, more technical.",
            },
            product_name: {
              type: "string",
              description:
                "When the merchant names a specific product (e.g. Samsung A15), pass that name. Updates ONLY that product's description.",
            },
            product_id: {
              type: "string",
              description: "Optional product id from list_products when the name is ambiguous.",
            },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          const style =
            typeof args.style === "string" && args.style.trim()
              ? args.style.trim()
              : (ctx.profile.tone?.join(", ") ?? "professional");
          const instruction =
            asString(args.instruction) ||
            (ctx.message.trim() ? ctx.message.trim() : "Match each description to the product name and store brand.");

          const productName =
            resolveProductNameFromContext({
              message: ctx.message,
              proposedName: asString(args.product_name) || undefined,
              focus: getProductFocus(ctx.profile),
            }) || undefined;
          const productId = asString(args.product_id) || undefined;

          const catalog = await api.getProducts().catch(() => []);
          let products: StoreProduct[] =
            catalog.length > 0
              ? catalog
              : Array.isArray(ctx.storefront?.products)
                ? [...ctx.storefront.products]
                : [];

          if (!products.length) {
            return { ok: false, error: "No products to describe. Add products first." };
          }

          if (productName || productId) {
            const live = await resolveLiveProduct(productId, productName).catch(() => null);
            const draft = resolveStorefrontProduct(products, productId, productName);
            const target = live?.product ?? draft.product;

            if (!target) {
              const question =
                live?.error ??
                draft.error ??
                "Which product description should I update? Tell me the product name.";
              const pending = sanitizePendingAction({
                type: "resume_tool",
                tool: "generate_product_descriptions",
                arguments: {
                  style,
                  instruction,
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

            products = [target];
          }

          const { generateProductDescriptionsBatch } = await import(
            "@/lib/storefront-builder/product-description"
          );

          const businessName = ctx.profile.business_name ?? ctx.session.store?.business_name ?? null;
          const targets = products
            .filter((product) => typeof product.name === "string" && product.name.trim())
            .map((product) => ({
              id: String(product.id),
              name: product.name.trim(),
              category: typeof product.category === "string" ? product.category : null,
              price: typeof product.price === "number" ? product.price : null,
              currency: typeof product.currency === "string" ? product.currency : "NGN",
              existing_description:
                typeof product.description === "string" ? product.description : null,
            }));

          if (!targets.length) {
            return { ok: false, error: "No products with names to describe." };
          }

          const batch = await generateProductDescriptionsBatch({
            products: targets,
            style,
            business_name: businessName,
            industry: ctx.profile.industry ?? ctx.session.store?.industry,
            instruction,
          });

          let updated = 0;
          let lastName = "";
          const failures: string[] = [];

          for (const product of products) {
            const description = batch.descriptions[String(product.id)]?.trim();
            if (!description) continue;
            const name = product.name?.trim() || "";

            try {
              let saved: StoreProduct = { ...product, description };
              if (product.id) {
                try {
                  saved = await api.updateProduct(String(product.id), { description });
                } catch (err) {
                  failures.push(
                    `${name || product.id}: ${err instanceof Error ? err.message : "update failed"}`,
                  );
                  // Still keep description on the draft preview.
                }
              }

              if (ctx.storefront?.products) {
                const synced = syncStorefrontProduct(ctx.storefront.products, saved);
                ctx.storefront = {
                  ...ctx.storefront,
                  products: synced?.some((item) => item.id === saved.id)
                    ? synced
                    : [...(ctx.storefront.products ?? []).filter((item) => item.id !== saved.id), saved],
                };
              }

              product.description = description;
              lastName = name;
              updated++;
            } catch (err) {
              failures.push(`${name || product.id}: ${err instanceof Error ? err.message : "failed"}`);
            }
          }

          const scoped = Boolean(productName || productId);
          if (updated === 0) {
            const detail = failures[0] || batch.error || "Please try again.";
            ctx.assistantMessage = `I couldn't update the product descriptions. ${detail}`;
            ctx.status = "collecting_requirements";
            return {
              ok: false,
              error: "description_update_failed",
              message: ctx.assistantMessage,
              failures,
            };
          }

          const fallbackNote = batch.used_fallback
            ? " (AI was briefly unavailable, so I used name-and-brand copy.)"
            : "";
          ctx.assistantMessage = scoped
            ? `Done — I rewrote the description for **${lastName}** to match its name and brand.${fallbackNote} Check your Products page!`
            : `Done — I wrote fresh descriptions for ${updated} product(s) to match each name and brand.${fallbackNote} Check your Products page!`;
          ctx.status = "review_ready";
          ctx.profile = withPendingAction(ctx.profile, null);
          if (lastName) {
            const focused = products.find((product) => product.name === lastName) ?? products[0];
            ctx.profile = withProductFocus(ctx.profile, {
              product_id: focused?.id,
              product_name: lastName,
            });
          }
          ctx.payload = {
            type: "product_descriptions_generated",
            updated,
            product_name: scoped ? lastName || productName : undefined,
          };
          return {
            ok: true,
            updated,
            product_name: scoped ? lastName || productName : undefined,
            used_fallback: batch.used_fallback,
          };
        },
      },
      {
        name: "process_product_image",
        description:
          "Analyze a product image that the merchant uploaded. Extracts the image URL from the message if not provided explicitly. Use when the merchant mentions an [Image: url] reference and wants to add the product to their store.",
        parameters: {
          type: "object",
          properties: {
            image_url: {
              type: "string",
              description:
                "The URL of the uploaded product image to analyze. If omitted, extracted from [Image: url] in the merchant message.",
            },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          let imageUrl = typeof args.image_url === "string" ? args.image_url.trim() : "";
          if (!imageUrl) {
            const { extractFirstMerchantImageUrl } = await import(
              "@/lib/storefront-builder/merchant-image"
            );
            imageUrl = extractFirstMerchantImageUrl(ctx.message) ?? "";
          }
          if (!imageUrl) return { ok: false, error: "No image URL provided." };

          try {
            const endpoint = "/api/vision/analyze-product";

            const { getToken } = await import("@/lib/api/client");
            const token = getToken();
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (token) {
              headers.Authorization = `Bearer ${token}`;
            }

            const res = await fetch(endpoint, {
              method: "POST",
              headers,
              body: JSON.stringify({
                image_url: imageUrl,
                business_name: ctx.profile.business_name ?? ctx.session.store?.business_name ?? "",
                industry: ctx.profile.industry ?? ctx.session.store?.industry ?? "",
                description: ctx.profile.description ?? ctx.session.store?.description ?? "",
              }),
            });

            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              const detail =
                (err as { error?: string; detail?: string }).detail ||
                (err as { error?: string }).error ||
                "vision_failed";
              ctx.assistantMessage = `I couldn't analyze that image (${detail}). Can you describe the product — what's it called and how much does it cost?`;
              return { ok: false, error: detail };
            }

            const data = (await res.json()) as {
              product?: {
                name: string;
                price: number | null;
                description: string;
                category: string | null;
              };
            };
            const product = data.product;
            if (!product?.name) {
              ctx.assistantMessage =
                "I couldn't identify the product in that image. Can you tell me what it is and the price?";
              return { ok: false, error: "no_product_detected" };
            }

            ctx.payload = {
              type: "product_image_analyzed",
              image_url: imageUrl,
              product: {
                name: product.name,
                price: product.price,
                description: product.description,
                category: product.category,
              },
            };

            const priceStr = product.price ? ` around ${product.price.toLocaleString()} NGN` : "";
            ctx.assistantMessage =
              `I can see this looks like **${product.name}**${priceStr}. ` +
              `${product.description ? `\n\n> ${product.description}\n\n` : ""}` +
              "Would you like me to add this to your store? Just confirm the name, price, and any other details!";

            return { ok: true, product };
          } catch (err) {
            console.error("process_product_image fetch failed:", err);
            ctx.assistantMessage =
              "Something went wrong analyzing the image. Can you describe the product for me?";
            return {
              ok: false,
              error: `vision_error: ${err instanceof Error ? err.message : "network error"}`,
            };
          }
        },
      },
    ];
  }
}
