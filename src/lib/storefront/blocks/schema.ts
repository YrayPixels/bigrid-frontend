import { z } from "zod";
import type { StorefrontBlock, StorefrontBlockType } from "@/lib/storefront/blocks/types";

const statItemSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
});

const featureItemSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
});

const faqItemSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

const blockPropsSchema: Record<StorefrontBlockType, z.ZodType<Record<string, unknown>>> = {
  hero: z.object({
    eyebrow: z.string().optional(),
    announcement: z.string().optional(),
    headline: z.string().min(1),
    subheadline: z.string().min(1),
    cta_label: z.string().min(1),
    cta_href: z.string().optional(),
    image_url: z.string().nullable().optional(),
    layout: z.enum(["centered", "split", "image_right"]).optional(),
  }),
  stats_row: z.object({
    items: z.array(statItemSchema).min(1).max(6),
  }),
  rich_text: z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    image_url: z.string().nullable().optional(),
    badges: z.array(statItemSchema).max(6).optional(),
    cta_label: z.string().optional(),
    meta_left: z.string().optional(),
    meta_right: z.string().optional(),
    footer_left: z.string().optional(),
    footer_right: z.string().optional(),
  }),
  feature_grid: z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    items: z.array(featureItemSchema).min(1).max(6),
  }),
  cta_banner: z.object({
    title: z.string().min(1),
    body: z.string().min(1),
    bullets: z.array(z.string()).max(6).optional(),
    cta_label: z.string().min(1),
    cta_href: z.string().optional(),
    image_url: z.string().nullable().optional(),
    layout: z.enum(["text_left", "text_right"]).optional(),
  }),
  product_grid: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    limit: z.number().int().min(1).max(12).optional(),
  }),
  category_showcase: z.object({
    title: z.string().min(1),
    eyebrow: z.string().optional(),
    layout: z.enum(["editorial_grid", "style_tiles", "compact_grid"]).optional(),
    items: z
      .array(
        z.object({
          label: z.string().min(1),
          category_id: z.string().nullable().optional(),
          category_slug: z.string().nullable().optional(),
          image_url: z.string().nullable().optional(),
          href: z.string().nullable().optional(),
          cta_label: z.string().nullable().optional(),
        }),
      )
      .min(1)
      .max(8),
  }),
  faq: z.object({
    title: z.string().min(1),
    items: z.array(faqItemSchema).max(12),
  }),
  contact_form: z.object({
    title: z.string().min(1),
    intro: z.string().min(1),
    fields: z
      .array(
        z.object({
          name: z.string().min(1),
          label: z.string().min(1),
          type: z.enum(["text", "email", "tel", "textarea", "number"]),
          required: z.boolean().optional(),
          placeholder: z.string().optional(),
        }),
      )
      .min(1)
      .max(8),
    submit_label: z.string().min(1),
    success_message: z.string().min(1),
  }),
};

export function parseStorefrontBlock(raw: unknown): StorefrontBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const type = value.type;
  const id = value.id;
  if (typeof type !== "string" || typeof id !== "string" || !blockPropsSchema[type as StorefrontBlockType]) {
    return null;
  }

  const parsedProps = blockPropsSchema[type as StorefrontBlockType].safeParse(value.props ?? {});
  if (!parsedProps.success) return null;

  return {
    id,
    type: type as StorefrontBlockType,
    props: parsedProps.data,
    edit_metadata:
      value.edit_metadata && typeof value.edit_metadata === "object"
        ? (value.edit_metadata as StorefrontBlock["edit_metadata"])
        : undefined,
  };
}

export function parseStorefrontBlocks(raw: unknown): StorefrontBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(parseStorefrontBlock).filter((block): block is StorefrontBlock => block !== null);
}
