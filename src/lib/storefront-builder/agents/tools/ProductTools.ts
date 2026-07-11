import { api } from "@/lib/api/client";
import type { WebsiteBuilderToolDef } from "../types";

/** Catalog: add products, rewrite descriptions, vision from uploaded photos. */
export class ProductTools {
  static definitions(): WebsiteBuilderToolDef[] {
    return [
      {
        name: "add_products",
        description:
          "Add one or more products to the merchant's store. Creates real product entries with name, price, description, category, stock quantity, and variants. Use when the merchant describes products they want to sell.",
        parameters: {
          type: "object",
          properties: {
            products: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Product name" },
                  price: { type: "number", description: "Price in the merchant's currency" },
                  description: { type: "string", description: "Short product description" },
                  category: { type: "string", description: "Category name (e.g. Dresses, Serums)" },
                  stock_quantity: { type: "number", description: "How many in stock" },
                  image_url: { type: "string", description: "Product image URL (optional)" },
                },
                required: ["name", "price"],
                additionalProperties: false,
              },
              description: "List of products to add",
            },
          },
          required: ["products"],
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          const raw = Array.isArray(args.products) ? args.products : [];
          if (!raw.length) return { ok: false, error: "No products provided." };
          if (!ctx.session.store) return { ok: false, error: "No store to add products to." };

          const added: string[] = [];
          const failed: string[] = [];

          for (const item of raw) {
            try {
              const name = typeof item.name === "string" ? item.name.trim() : "";
              const price = typeof item.price === "number" ? item.price : parseFloat(item.price as string);
              if (!name || isNaN(price) || price <= 0) {
                failed.push(name || "(unnamed)");
                continue;
              }
              await api.createProduct({
                name,
                price,
                description: typeof item.description === "string" ? item.description : "",
                currency: "NGN",
                slug: name
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/^-|-$/g, ""),
                category: typeof item.category === "string" ? item.category : undefined,
                stock_quantity: typeof item.stock_quantity === "number" ? item.stock_quantity : undefined,
                image_url: typeof item.image_url === "string" ? item.image_url : null,
              });
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

          const summary =
            added.length === 1
              ? `Added ${added[0]} to your store.`
              : `Added ${added.length} products: ${added.slice(0, 3).join(", ")}${added.length > 3 ? ` and ${added.length - 3} more` : ""}.`;

          ctx.assistantMessage = `${summary} They'll appear on your storefront. You can manage them on the Products page.`;
          ctx.status = "review_ready";
          ctx.payload = {
            type: "products_added",
            added,
            failed,
            suggested_actions: [{ type: "link", label: "Manage Products", href: "/admin/products" }],
          };
          return { ok: true, added, failed };
        },
      },
      {
        name: "generate_product_descriptions",
        description:
          "Generate compelling, SEO-friendly product descriptions for existing products. Use when the merchant wants better copy for their product catalog.",
        parameters: {
          type: "object",
          properties: {
            style: {
              type: "string",
              description: "Optional style direction — e.g. luxury, playful, minimal, technical",
            },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          const storefront = ctx.storefront;
          const existingProducts = Array.isArray(storefront?.products) ? storefront.products : [];
          if (!existingProducts.length) {
            return { ok: false, error: "No products to describe. Add products first." };
          }

          const style =
            typeof args.style === "string" && args.style.trim()
              ? args.style.trim()
              : (ctx.profile.tone?.join(", ") ?? "professional");

          const productList = existingProducts
            .map(
              (p) =>
                `- ${p.name} (${p.price} ${p.currency ?? "NGN"}): ${p.description ?? "(no description)"}`,
            )
            .join("\n");

          const { postChat } = await import("@/lib/storefront-builder/agents/openaiChat");
          const data = await postChat({
            messages: [
              {
                role: "system",
                content: [
                  "You write compelling product descriptions for an online store.",
                  `Brand tone: ${style}.`,
                  "For each product, write a short, punchy description (2-3 sentences max).",
                  "Focus on benefits and sensory details — not just features.",
                  'Return ONLY valid JSON: { "descriptions": [{ "name": string, "description": string }] }',
                ].join("\n"),
              },
              {
                role: "user",
                content: `Write descriptions for these products:\n${productList}`,
              },
            ],
            tool_choice: "none",
            temperature: 0.7,
            response_format: { type: "json_object" },
          });

          const content = data?.choices?.[0]?.message?.content;
          const parsed = typeof content === "string" ? JSON.parse(content) : null;
          const descriptions = Array.isArray(parsed?.descriptions) ? parsed.descriptions : [];

          if (!descriptions.length) return { ok: false, error: "Description generation failed." };

          let updated = 0;
          for (const item of descriptions) {
            const match = existingProducts.find(
              (p) => p.name.toLowerCase() === (item.name as string)?.toLowerCase(),
            );
            if (!match) continue;
            try {
              await api.updateProduct(match.id, { description: String(item.description) });
              match.description = String(item.description);
              updated++;
            } catch {
              // skip failed updates
            }
          }

          ctx.assistantMessage =
            updated > 0
              ? `Done — I wrote fresh descriptions for ${updated} product(s) in a ${style} tone. Check your Products page!`
              : "I generated descriptions but couldn't update the products. Try again.";
          ctx.payload = {
            type: "product_descriptions_generated",
            updated,
          };
          return { ok: true, updated };
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
              description: "The URL of the uploaded product image to analyze",
            },
          },
          required: ["image_url"],
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          let imageUrl = typeof args.image_url === "string" ? args.image_url.trim() : "";
          if (!imageUrl) {
            const match = ctx.message.match(/\[Image:\s*(https?:\/\/[^\s\]]+)\]/i);
            imageUrl = match?.[1] ?? "";
          }
          if (!imageUrl) return { ok: false, error: "No image URL provided." };

          try {
            const endpoint = "/api/vision/analyze-product";

            const res = await fetch(endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
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
