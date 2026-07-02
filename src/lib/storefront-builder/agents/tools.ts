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
import { STOREFRONT_FONT_OPTIONS } from "@/lib/storefront/template";
import { api } from "@/lib/api/client";
import { codeFs } from "@/lib/code-fs";
import { createCodeParser } from "@/lib/code-parser";
import { createBoltActionRunner } from "@/lib/bolt/action-runner";
import type { BuilderSession } from "@/lib/api/types";
import type { WebsiteBuilderContext, WebsiteBuilderToolDef } from "./types";

const PRE_DRAFT_TOOL_NAMES = new Set([
  "capture_business_details",
  "design_website",
  "generate_website",
  "generate_custom_site",
  "change_font",
  "ask_clarifying_question",
]);

const DRAFT_TOOL_NAMES = new Set([
  "switch_design",
  "apply_brand_color",
  "refine_website_copy",
  "apply_stock_images",
  "source_website_images",
  "replace_template_images",
  "add_products",
  "generate_product_descriptions",
  "process_product_image",
  "generate_custom_site",
  "edit_custom_site_code",
  "change_font",
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
              : available[0] ?? null;
        ctx.selectedTemplateId = selected;
        ctx.status = "template_recommendation";
        ctx.payload = {
          type: "design_selected",
          template_id: selected,
          design_direction: (typeof args.design_direction === "string" ? args.design_direction : "best_fit"),
        };
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
          next_steps: [
            { label: "Add your products", action: "add_products_prompt", message: "Help me add my products" },
            { label: "Upload a header photo", action: "upload", target: "media.hero_image_url" },
            { label: "Write product descriptions", action: "prompt", message: "Write compelling descriptions for my products" },
            { label: "Improve SEO", action: "prompt", message: "Update my website SEO for better search visibility" },
            { label: "Review & publish", action: "prompt", message: "I'm ready to publish my website" },
          ],
        };
        if (!ctx.assistantMessage) {
          ctx.assistantMessage =
            "Your website is ready! Here's what to do next to get your store live:\n\n1. Add your products\n2. Upload a header photo\n3. Polish your product descriptions\n4. Improve your SEO\n5. Review and publish\n\nPick any step and I'll help you through it, or tell me what you want to refine.";
        }
        return { ok: true, template_id: selected };
      },
    },
    {
      name: "switch_design",
      description:
        "Switch to a COMPLETELY DIFFERENT website layout and design. Changes the entire template, layout, color palette, and images. Use when the merchant says 'new design', 'different look', 'another style', 'something else', or names a specific shop type (cosmetics, fashion, minimal). This is NOT for color-only changes — use apply_brand_color for palette-only requests.",
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
        "Update ONLY the color palette (primary, accent, background, surface, text, muted, border). Does NOT change the layout, template, or design. Use ONLY when the merchant specifically asks about color/palette/hex — not for design or layout changes.",
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
      name: "change_font",
      description:
        "Change the display font for headings and titles across the website. Pick from available fonts that match the merchant's desired vibe.",
      parameters: {
        type: "object",
        properties: {
          font: {
            type: "string",
            enum: Object.keys(STOREFRONT_FONT_OPTIONS),
            description:
              "Font key: modern-sans (clean modern), elegant-serif (sophisticated editorial), clean-sans (simple readable), script (decorative flowing).",
          },
        },
        required: ["font"],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        const fontKey = typeof args.font === "string" ? args.font : "";
        const option = STOREFRONT_FONT_OPTIONS[fontKey];
        if (!option) return { ok: false, error: `Unknown font: ${fontKey}` };
        if (!ctx.storefront) return { ok: false, error: "No storefront to apply font to." };

        ctx.storefront.display_font = option.css;
        ctx.status = "review_ready";
        ctx.assistantMessage = `Done — I switched your display font to ${option.label}. Check the preview!`;
        ctx.payload = {
          type: "font_changed",
          changed_paths: ["display_font"],
          font: fontKey,
          font_label: option.label,
        };
        return { ok: true, font: fontKey, font_label: option.label };
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
        ctx.assistantMessage = result.assistant_message || "Done — I've updated the copy. Check the preview on the right!";
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
               slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
               category: typeof item.category === "string" ? item.category : undefined,
               stock_quantity: typeof item.stock_quantity === "number" ? item.stock_quantity : undefined,
               image_url: typeof item.image_url === "string" ? item.image_url : null,
             });
             added.push(name);
           } catch (err) {
             console.error(`add_products failed for "${typeof item.name === "string" ? item.name : "unknown"}":`, err);
             failed.push(typeof item.name === "string" ? item.name : "(unnamed)");
           }
        }

        if (added.length === 0) {
          ctx.assistantMessage = "I couldn't add those products. Please try again with product names and prices.";
          return { ok: false, error: "all_failed" };
        }

        const summary = added.length === 1
          ? `Added ${added[0]} to your store.`
          : `Added ${added.length} products: ${added.slice(0, 3).join(", ")}${added.length > 3 ? ` and ${added.length - 3} more` : ""}.`;

        ctx.assistantMessage = `${summary} They'll appear on your storefront. You can manage them on the Products page.`;
        ctx.status = "review_ready";
        ctx.payload = {
          type: "products_added",
          added,
          failed,
          suggested_actions: [
            { type: "link", label: "Manage Products", href: "/admin/products" },
          ],
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
        if (!existingProducts.length) return { ok: false, error: "No products to describe. Add products first." };

        const style = typeof args.style === "string" && args.style.trim()
          ? args.style.trim()
          : ctx.profile.tone?.join(", ") ?? "professional";

        const productList = existingProducts
          .map((p) => `- ${p.name} (${p.price} ${p.currency ?? "NGN"}): ${p.description ?? "(no description)"}`)
          .join("\n");

        // Generate descriptions via the AI model
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
                "Return ONLY valid JSON: { \"descriptions\": [{ \"name\": string, \"description\": string }] }",
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

        ctx.assistantMessage = updated > 0
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
        // Extract image URL from args, or from the message if not provided
        let imageUrl = typeof args.image_url === "string" ? args.image_url.trim() : "";
        if (!imageUrl) {
          const match = ctx.message.match(/\[Image:\s*(https?:\/\/[^\s\]]+)\]/i);
          imageUrl = match?.[1] ?? "";
        }
        if (!imageUrl) return { ok: false, error: "No image URL provided." };

        try {
          // Route through the Next.js proxy so the backend is always reachable
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
            const detail = (err as { error?: string; detail?: string }).detail || (err as { error?: string }).error || "vision_failed";
            ctx.assistantMessage = `I couldn't analyze that image (${detail}). Can you describe the product — what's it called and how much does it cost?`;
            return { ok: false, error: detail };
          }

          const data = (await res.json()) as { product?: { name: string; price: number | null; description: string; category: string | null } };
          const product = data.product;
          if (!product?.name) {
            ctx.assistantMessage = "I couldn't identify the product in that image. Can you tell me what it is and the price?";
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

          return { ok: true, product: product };
        } catch (err) {
          console.error("process_product_image fetch failed:", err);
          ctx.assistantMessage = "Something went wrong analyzing the image. Can you describe the product for me?";
          return { ok: false, error: `vision_error: ${err instanceof Error ? err.message : "network error"}` };
        }
      },
    },
    {
      name: "generate_custom_site",
      description:
        "Generate a fully custom website with real HTML/CSS code instead of templates. The AI writes the complete storefront from scratch in bolt artifact format. Use when the merchant wants a unique handcrafted design or says 'custom site', 'build from scratch', 'unique design'.",
      parameters: {
        type: "object",
        properties: {
          style_note: { type: "string", description: "Style direction" },
        },
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        // Bolt-style: allow generation even when the merchant says "just any".
        // Fall back to sane defaults rather than blocking on requirements.
        if (!hasMinimumBusinessProfile(ctx.profile)) {
          ctx.profile = sanitizeBusinessProfile({
            ...ctx.profile,
            business_name: ctx.profile.business_name ?? ctx.session.store?.business_name ?? "My Store",
            description:
              ctx.profile.description ??
              ctx.session.store?.description ??
              "A modern online store with curated products and a smooth checkout experience.",
            industry: ctx.profile.industry ?? ctx.session.store?.industry ?? "other",
            brand_color: ctx.profile.brand_color ?? ctx.session.store?.brand_color ?? "#0E7C66",
          });
        }
        const { postChatStream } = await import("@/lib/storefront-builder/agents/openaiChat");
        const styleNote = typeof args.style_note === "string" ? args.style_note : "";
        try {
          // Ensure a baseline storefront exists so the snapshot can be persisted and previewed.
          if (!ctx.storefront) {
            const available = concreteTemplateIds(ctx.templateOptions);
            const selected = resolveSelectedTemplateId(
              {
                ...ctx.session,
                selected_template_id: ctx.selectedTemplateId ?? ctx.session.selected_template_id,
              },
              ctx.recommendations,
              available,
            );
            ctx.selectedTemplateId = selected ?? (available[0] ?? null);
            const store = ctx.session.store ?? profileToStore(ctx.profile, ctx.selectedTemplateId ?? undefined);
            ctx.storefront = synthesizeStorefront(store, ctx.recommendations);
          }

          codeFs.clear();
          const storefrontRecord = ctx.storefront as Record<string, unknown>;
          const lockedPaths = (storefrontRecord.edit_metadata as { locked_paths?: string[] } | undefined)?.locked_paths ?? [];
          const runner = createBoltActionRunner({ lockedPaths });
          const parser = createCodeParser({
            onAction: (action) => {
              runner.apply(action);
            },
          });
          const products = Array.isArray(ctx.storefront?.products) ? ctx.storefront.products : [];
          const productLines = products.length > 0
            ? products.map((p) => `- ${p.name} | ${p.price} ${p.currency ?? "NGN"}${p.description ? ` — ${p.description}` : ""}`).join("\n")
            : "Generate 4-6 sample products for this industry with prices in NGN.";
          const messages = [
            {
              role: "system" as const,
              content: [
                "You are StoreHause Code. Build a complete e-commerce storefront website.",
                "Output ALL code in bolt artifact format:",
                "<boltArtifact id=\"storefront\" title=\"Storefront\">",
                "  <boltAction type=\"file\" filePath=\"index.html\">...complete HTML...</boltAction>",
                "  <boltAction type=\"file\" filePath=\"styles.css\">...all CSS...</boltAction>",
                "  <boltAction type=\"file\" filePath=\"script.js\">...all JS...</boltAction>",
                "</boltArtifact>",
                "RULES:",
                "- index.html: Complete HTML5 with nav, hero, product grid, about, FAQ, contact, footer",
                `- Brand color: ${ctx.profile.brand_color ?? ctx.session.store?.brand_color ?? "#0E7C66"}`,
                `- Store: ${ctx.profile.business_name ?? ctx.session.store?.business_name ?? "My Store"}`,
                `- Industry: ${ctx.profile.industry ?? ctx.session.store?.industry ?? "other"}`,
                styleNote ? `- Style: ${styleNote}` : "",
                "- NO external CSS/JS — vanilla only",
                "- Responsive mobile-first, CSS variables with brand color",
                "- Cart in localStorage, Unsplash product images",
                "- No markdown fences inside boltAction tags",
                `Products:\n${productLines}`,
              ].filter(Boolean).join("\n"),
            },
            { role: "user" as const, content: "Generate the storefront now. Output in bolt artifact format only." },
          ];

          let fullText = "";
          await postChatStream({
            messages,
            temperature: 0.7,
            onDelta: (delta) => {
              fullText += delta;
              parser.feed(delta);
            },
          });
          parser.flush();

          if (codeFs.listFiles().length === 0 && fullText.trim()) codeFs.writeFile("index.html", fullText.trim());
          (ctx.storefront as Record<string, unknown>).custom_code = codeFs.getMainHtml();
          (ctx.storefront as Record<string, unknown>).custom_files = codeFs.exportFiles();
          ctx.status = "content_generated";
          ctx.assistantMessage = "Your custom website is ready! Switch to Custom mode in the preview.";
          ctx.payload = {
            type: "custom_site_generated",
            custom_code: codeFs.getMainHtml(),
            files: codeFs.listFiles(),
            bolt_action_log: runner.getLog(),
          };
          return { ok: true, files: codeFs.listFiles(), html_size: fullText.length };
        } catch (err) {
          console.error("generate_custom_site failed:", err);
          ctx.assistantMessage = "Something went wrong. Let me try the template approach.";
          return { ok: false, error: `error: ${err instanceof Error ? err.message : "unknown"}` };
        }
      },
    },
    {
      name: "edit_custom_site_code",
      description:
        "Edit an already-generated custom website's code (HTML/CSS/JS) using a natural-language instruction. Applies precise file updates in bolt artifact format.",
      parameters: {
        type: "object",
        properties: {
          instruction: { type: "string", description: "What to change in the custom code" },
        },
        required: ["instruction"],
        additionalProperties: false,
      },
      handler: async (args, ctx) => {
        if (!ctx.storefront) return { ok: false, error: "website_not_generated" };
        if (!hasMinimumBusinessProfile(ctx.profile)) {
          return { ok: false, error: "missing_business_details" };
        }

        const instruction =
          typeof args.instruction === "string" && args.instruction.trim()
            ? args.instruction.trim()
            : ctx.message.trim();
        if (!instruction) return { ok: false, error: "missing_instruction" };

        // Load current files (prefer persisted snapshot) into the in-memory FS.
        const storefrontRecord = ctx.storefront as Record<string, unknown>;
        const customFiles = storefrontRecord.custom_files as unknown;
        if (Array.isArray(customFiles)) {
          codeFs.loadFiles(customFiles as never);
        } else if (typeof storefrontRecord.custom_code === "string" && storefrontRecord.custom_code.trim()) {
          codeFs.clear();
          codeFs.writeFile("index.html", String(storefrontRecord.custom_code));
        }

        const files = codeFs.exportFiles();
        if (files.length === 0) return { ok: false, error: "no_custom_site_files" };

        const { postChatStream } = await import("@/lib/storefront-builder/agents/openaiChat");

        const systemPrompt = [
          "You are StoreHause Code Editor.",
          "You will receive a set of existing website files (HTML/CSS/JS) and a change request.",
          "Return ONLY a bolt artifact containing the file updates needed to satisfy the request.",
          "",
          "OUTPUT FORMAT (required):",
          "<boltArtifact id=\"storefront-edit\" title=\"Storefront edit\">",
          "  <boltAction type=\"file\" filePath=\"...\">...full new file contents...</boltAction>",
          "</boltArtifact>",
          "",
          "RULES:",
          "- Only include files that changed.",
          "- When editing a file, output the COMPLETE updated file contents.",
          "- Do not add new build tools, frameworks, or external dependencies.",
          "- Keep it vanilla HTML/CSS/JS. Keep the site responsive.",
          "- If adding a new section, update index.html and styles.css accordingly.",
        ].join("\n");

        const lockedPaths = (storefrontRecord.edit_metadata as { locked_paths?: string[] } | undefined)?.locked_paths ?? [];
        const runner = createBoltActionRunner({ lockedPaths });
        const parser = createCodeParser({
          onAction: (action) => {
            runner.apply(action);
          },
        });

        const messages = [
          { role: "system" as const, content: systemPrompt },
          {
            role: "user" as const,
            content: JSON.stringify({
              instruction,
              business: {
                name: ctx.profile.business_name ?? ctx.session.store?.business_name ?? null,
                industry: ctx.profile.industry ?? ctx.session.store?.industry ?? null,
                description: ctx.profile.description ?? ctx.session.store?.description ?? null,
                brand_color: ctx.profile.brand_color ?? ctx.session.store?.brand_color ?? null,
              },
              files,
            }),
          },
        ];

        let fullText = "";
        await postChatStream({
          messages,
          temperature: 0.4,
          onDelta: (delta) => {
            fullText += delta;
            parser.feed(delta);
          },
        });
        parser.flush();

        // Persist updated result back to snapshot.
        storefrontRecord.custom_files = codeFs.exportFiles();
        storefrontRecord.custom_code = codeFs.getMainHtml();

        ctx.status = "review_ready";
        ctx.assistantMessage = "Done — I updated your custom website. Switch to Custom mode and check the preview.";
        ctx.payload = {
          type: "custom_site_edited",
          files: codeFs.listFiles(),
          bolt_action_log: runner.getLog(),
        };
        return { ok: true, files: codeFs.listFiles() };
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
