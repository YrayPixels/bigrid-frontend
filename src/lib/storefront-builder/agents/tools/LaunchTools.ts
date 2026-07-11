import { api } from "@/lib/api/client";
import type { UpdateStoreInput } from "@/lib/api/types";
import { sanitizeBusinessProfile } from "@/lib/storefront-builder/local-ai";
import type { WebsiteBuilderToolDef } from "../types";
import { asString, requireConfirm } from "./toolHelpers";

type ReadinessCheck = {
  id: string;
  label: string;
  ok: boolean;
  severity: "blocker" | "warning";
  detail: string;
};

/** Publish readiness, go-live, and store profile sync. */
export class LaunchTools {
  static definitions(): WebsiteBuilderToolDef[] {
    return [
      {
        name: "get_storefront_readiness",
        description:
          "Check whether the website is ready to publish. Reports blockers (missing products, missing store, empty hero) and warnings (payments, contact details).",
        parameters: { type: "object", properties: {}, additionalProperties: false },
        handler: async (_args, ctx) => {
          const store = ctx.session.store ?? (await api.getMyStore().catch(() => null));
          const products = await api.getProducts().catch(() => []);
          const activeProducts = products.filter((p) => (p.status ?? "active") === "active");
          const storefront = ctx.storefront;
          const hero =
            storefront?.pages?.home?.blocks?.find((b) => b.type === "hero" || b.id === "hero-main") ??
            null;
          const heroHeadline =
            typeof hero?.props?.headline === "string"
              ? hero.props.headline
              : storefront?.hero?.headline;

          const checks: ReadinessCheck[] = [
            {
              id: "store",
              label: "Store profile",
              ok: !!store?.id,
              severity: "blocker",
              detail: store?.id ? `Store “${store.business_name}” is set up.` : "No store found.",
            },
            {
              id: "draft",
              label: "Website draft",
              ok: !!storefront,
              severity: "blocker",
              detail: storefront ? "A website draft exists." : "Generate a website first.",
            },
            {
              id: "products",
              label: "Active products",
              ok: activeProducts.length > 0,
              severity: "blocker",
              detail:
                activeProducts.length > 0
                  ? `${activeProducts.length} active product(s).`
                  : "Add at least one active product before publishing.",
            },
            {
              id: "hero",
              label: "Homepage hero",
              ok: !!heroHeadline && String(heroHeadline).trim().length > 0,
              severity: "warning",
              detail: heroHeadline ? "Hero headline is set." : "Homepage hero copy is empty.",
            },
            {
              id: "contact",
              label: "Contact details",
              ok: !!(store?.contact_email || store?.contact_phone),
              severity: "warning",
              detail:
                store?.contact_email || store?.contact_phone
                  ? "Contact email or phone is set."
                  : "Add a contact email or phone so customers can reach you.",
            },
            {
              id: "payments",
              label: "Checkout / payouts",
              ok: !!store?.checkout_enabled || !!store?.payouts_configured,
              severity: "warning",
              detail:
                store?.checkout_enabled || store?.payouts_configured
                  ? "Payments look configured."
                  : "Checkout or payouts may still need setup before taking orders.",
            },
          ];

          const blockers = checks.filter((c) => !c.ok && c.severity === "blocker");
          const warnings = checks.filter((c) => !c.ok && c.severity === "warning");
          const ready = blockers.length === 0;

          ctx.payload = {
            type: "storefront_readiness",
            ready,
            checks,
            blockers,
            warnings,
          };
          ctx.assistantMessage = ready
            ? warnings.length
              ? `You're clear to publish, with ${warnings.length} suggestion(s) to improve first.`
              : "You're ready to publish."
            : `Not ready to publish yet — ${blockers.map((b) => b.label.toLowerCase()).join(", ")}.`;

          return { ok: true, ready, checks, blocker_count: blockers.length, warning_count: warnings.length };
        },
      },
      {
        name: "publish_website",
        description:
          "Publish the current storefront draft to the live site. Requires confirm=true. Call get_storefront_readiness first and only publish when the merchant explicitly asks.",
        parameters: {
          type: "object",
          properties: {
            confirm: {
              type: "boolean",
              description: "Must be true after explicit merchant confirmation.",
            },
            force: {
              type: "boolean",
              description: "When true, publish even if readiness has blockers (not recommended).",
            },
          },
          required: ["confirm"],
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          if (!requireConfirm(args)) {
            return {
              ok: false,
              error: "confirm_required",
              message: "Ask the merchant to confirm go-live, then call with confirm=true.",
            };
          }

          const store = ctx.session.store ?? (await api.getMyStore().catch(() => null));
          if (!store?.id) return { ok: false, error: "missing_store" };
          if (!ctx.storefront && !ctx.session.storefront_snapshot) {
            return { ok: false, error: "website_not_generated" };
          }

          if (args.force !== true) {
            const products = await api.getProducts().catch(() => []);
            const activeProducts = products.filter((p) => (p.status ?? "active") === "active");
            if (!activeProducts.length) {
              return {
                ok: false,
                error: "readiness_blockers",
                message: "Add at least one active product, or pass force=true if they insist.",
              };
            }
          }

          try {
            if (ctx.storefront) {
              await api.updateStorefront(store.id, {
                storefront: ctx.storefront,
                ...(ctx.selectedTemplateId
                  ? { storefront_template_id: ctx.selectedTemplateId }
                  : {}),
              });
            }

            const published = await api.publishStorefront(store.id);
            ctx.status = "review_ready";
            ctx.assistantMessage =
              published.message ||
              `Published! Your store is live${published.store.primary_domain || published.store.subdomain_host ? ` at ${published.store.primary_domain ?? published.store.subdomain_host}` : ""}.`;
            ctx.payload = {
              type: "website_published",
              store: published.store,
              publish: published.publish,
            };
            return {
              ok: true,
              store_id: published.store.id,
              is_published: published.store.is_published ?? true,
              domain: published.store.primary_domain ?? published.store.subdomain_host ?? null,
            };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "publish_failed",
            };
          }
        },
      },
      {
        name: "update_store_profile",
        description:
          "Update the merchant store profile (business name, description, contact email/phone, brand color, logo). Syncs to PATCH /stores/me.",
        parameters: {
          type: "object",
          properties: {
            business_name: { type: "string" },
            description: { type: "string" },
            contact_email: { type: "string" },
            contact_phone: { type: "string" },
            brand_color: { type: "string" },
            logo_url: { type: "string" },
          },
          additionalProperties: false,
        },
        handler: async (args, ctx) => {
          const body: UpdateStoreInput = {};
          if (asString(args.business_name)) body.business_name = asString(args.business_name);
          if (typeof args.description === "string") body.description = args.description;
          if (typeof args.contact_email === "string") body.contact_email = args.contact_email || null;
          if (typeof args.contact_phone === "string") body.contact_phone = args.contact_phone || null;
          if (asString(args.brand_color)) body.brand_color = asString(args.brand_color);
          if (typeof args.logo_url === "string") body.logo_url = args.logo_url || null;

          if (!Object.keys(body).length) return { ok: false, error: "no_fields_to_update" };

          try {
            const store = await api.updateMyStore(body);
            ctx.profile = sanitizeBusinessProfile({
              ...ctx.profile,
              ...(body.business_name ? { business_name: body.business_name } : {}),
              ...(typeof body.description === "string" ? { description: body.description } : {}),
              ...(body.brand_color ? { brand_color: body.brand_color } : {}),
            });
            ctx.session = { ...ctx.session, store };
            ctx.status = "review_ready";
            ctx.assistantMessage = `Updated store profile for **${store.business_name}**.`;
            ctx.payload = { type: "store_profile_updated", store };
            return { ok: true, store };
          } catch (err) {
            return {
              ok: false,
              error: err instanceof Error ? err.message : "update_store_profile_failed",
            };
          }
        },
      },
    ];
  }
}
