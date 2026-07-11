import {
  applyBrandColorToStorefront,
  applyColorChangeFromMessageAsync,
  resolveBrandColorForMessage,
  sanitizeBusinessProfile,
} from "@/lib/storefront-builder/local-ai";
import { STOREFRONT_FONT_OPTIONS } from "@/lib/storefront/template";
import type { WebsiteBuilderToolDef } from "../types";

/** Palette and typography — layout stays the same. */
export class BrandingTools {
  static definitions(): WebsiteBuilderToolDef[] {
    return [
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
    ];
  }
}
