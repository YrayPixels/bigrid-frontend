import {
  applyBrandColorToStorefront,
  applyColorChangeFromMessageAsync,
  resolveBrandColorForMessage,
  sanitizeBusinessProfile,
} from "@/lib/storefront-builder/local-ai";
import type { StorefrontThemeOverrides } from "@/lib/api/types";
import {
  STOREFRONT_BODY_FONT_OPTIONS,
  STOREFRONT_FONT_OPTIONS,
} from "@/lib/storefront/template";
import type { WebsiteBuilderToolDef } from "../types";

function patchThemeOverrides(
  current: StorefrontThemeOverrides | undefined,
  patch: Partial<StorefrontThemeOverrides>,
): StorefrontThemeOverrides | undefined {
  const next: StorefrontThemeOverrides = { ...current };
  for (const key of Object.keys(patch) as (keyof StorefrontThemeOverrides)[]) {
    const value = patch[key];
    if (value === undefined || value === null) {
      delete next[key];
    } else if (key === "button_style") {
      next.button_style = value as StorefrontThemeOverrides["button_style"];
    } else if (key === "button_radius") {
      next.button_radius = value as StorefrontThemeOverrides["button_radius"];
    } else if (key === "density") {
      next.density = value as StorefrontThemeOverrides["density"];
    } else if (key === "body_font") {
      next.body_font = value as StorefrontThemeOverrides["body_font"];
    }
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

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
          "Change typography without changing template or layout. Use target=display for headings/titles, target=body for page body text. Pick from available fonts that match the merchant's desired vibe.",
        parameters: {
          type: "object",
          properties: {
            font: {
              type: "string",
              enum: Object.keys(STOREFRONT_FONT_OPTIONS),
              description:
                "Font key: modern-sans (clean modern), elegant-serif (sophisticated editorial), clean-sans (simple readable), script (decorative flowing — display only).",
            },
            target: {
              type: "string",
              enum: ["display", "body"],
              description:
                "display = headings (default). body = body text (clean-sans, modern-sans, or elegant-serif only — not script).",
            },
          },
          required: ["font"],
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          const fontKey = typeof args.font === "string" ? args.font : "";
          const target = args.target === "body" ? "body" : "display";
          const option = STOREFRONT_FONT_OPTIONS[fontKey];
          if (!option) return { ok: false, error: `Unknown font: ${fontKey}` };
          if (!ctx.storefront) return { ok: false, error: "No storefront to apply font to." };

          if (target === "body") {
            if (!(fontKey in STOREFRONT_BODY_FONT_OPTIONS)) {
              return {
                ok: false,
                error: "body_font_not_allowed",
                message: "Body font must be clean-sans, modern-sans, or elegant-serif (not script).",
              };
            }
            const nextOverrides = patchThemeOverrides(ctx.storefront.theme_overrides, {
              body_font: fontKey as keyof typeof STOREFRONT_BODY_FONT_OPTIONS,
            });
            if (nextOverrides) {
              ctx.storefront.theme_overrides = nextOverrides;
            } else {
              delete ctx.storefront.theme_overrides;
            }
            ctx.status = "review_ready";
            ctx.assistantMessage = `Done — I switched your body font to ${option.label}. Check the preview!`;
            ctx.payload = {
              type: "font_changed",
              changed_paths: ["theme_overrides.body_font"],
              font: fontKey,
              font_label: option.label,
              target: "body",
            };
            return { ok: true, font: fontKey, font_label: option.label, target: "body" };
          }

          ctx.storefront.display_font = option.css;
          ctx.status = "review_ready";
          ctx.assistantMessage = `Done — I switched your display font to ${option.label}. Check the preview!`;
          ctx.payload = {
            type: "font_changed",
            changed_paths: ["display_font"],
            font: fontKey,
            font_label: option.label,
            target: "display",
          };
          return { ok: true, font: fontKey, font_label: option.label, target: "display" };
        },
      },
      {
        name: "update_theme_style",
        description:
          "Update ONLY style tokens (button shape/radius, spacing density). Does NOT change template, layout structure, colors, or copy. Use for requests like sharper buttons, pill buttons, more spacing, tighter layout. Prefer this over switch_design when the merchant wants small style tweaks.",
        parameters: {
          type: "object",
          properties: {
            button_style: {
              type: "string",
              enum: ["rounded", "square", "pill"],
              description: "Button shape. Omit to leave unchanged.",
            },
            button_radius: {
              type: "string",
              enum: ["none", "md", "full"],
              description: "Corner radius. Omit to leave unchanged.",
            },
            density: {
              type: "string",
              enum: ["compact", "default", "airy"],
              description:
                "Spacing density. default clears a previous density override back to the template. Omit to leave unchanged.",
            },
            reset: {
              type: "boolean",
              description:
                "When true, clear all theme_overrides (and keep display_font unless also cleared elsewhere). Restores template button/density defaults.",
            },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          if (!ctx.storefront) return { ok: false, error: "No storefront to style." };

          if (args.reset === true) {
            const next = { ...ctx.storefront };
            delete next.theme_overrides;
            ctx.storefront = next;
            ctx.status = "review_ready";
            ctx.assistantMessage =
              "Done — I reset buttons and spacing back to this design’s defaults. Check the preview.";
            ctx.payload = {
              type: "theme_style_updated",
              changed_paths: ["theme_overrides"],
              reset: true,
            };
            return { ok: true, reset: true };
          }

          const patch: Partial<StorefrontThemeOverrides> = {};
          if (
            args.button_style === "rounded" ||
            args.button_style === "square" ||
            args.button_style === "pill"
          ) {
            patch.button_style = args.button_style;
          }
          if (
            args.button_radius === "none" ||
            args.button_radius === "md" ||
            args.button_radius === "full"
          ) {
            patch.button_radius = args.button_radius;
          }
          if (args.density === "compact" || args.density === "airy") {
            patch.density = args.density;
          } else if (args.density === "default") {
            patch.density = undefined;
            // Explicitly clear density while keeping other overrides
            const cleared = { ...ctx.storefront.theme_overrides };
            delete cleared.density;
            ctx.storefront.theme_overrides =
              Object.keys(cleared).length > 0 ? cleared : undefined;
            if (ctx.storefront.theme_overrides === undefined) {
              delete ctx.storefront.theme_overrides;
            }
          }

          const hasPatch =
            patch.button_style !== undefined ||
            patch.button_radius !== undefined ||
            (args.density === "compact" || args.density === "airy");

          if (!hasPatch && args.density !== "default") {
            return { ok: false, error: "no_style_changes" };
          }

          if (hasPatch) {
            const nextOverrides = patchThemeOverrides(ctx.storefront.theme_overrides, patch);
            if (nextOverrides) {
              ctx.storefront.theme_overrides = nextOverrides;
            } else {
              delete ctx.storefront.theme_overrides;
            }
          }

          const parts: string[] = [];
          if (patch.button_style) parts.push(`${patch.button_style} buttons`);
          if (patch.button_radius) parts.push(`${patch.button_radius} corners`);
          if (args.density === "compact") parts.push("tighter spacing");
          if (args.density === "airy") parts.push("more breathing room");
          if (args.density === "default") parts.push("template spacing");

          ctx.status = "review_ready";
          ctx.assistantMessage = `Done — I updated your style (${parts.join(", ") || "style tokens"}). Check the preview on the right.`;
          ctx.payload = {
            type: "theme_style_updated",
            changed_paths: ["theme_overrides"],
            theme_overrides: ctx.storefront.theme_overrides ?? null,
          };
          return { ok: true, theme_overrides: ctx.storefront.theme_overrides ?? null };
        },
      },
    ];
  }
}
