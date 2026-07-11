export type StorefrontBlockType =
  | "hero"
  | "stats_row"
  | "rich_text"
  | "feature_grid"
  | "cta_banner"
  | "product_grid"
  | "category_showcase"
  | "faq"
  | "contact_form";

export type CategoryShowcaseLayout = "editorial_grid" | "style_tiles" | "compact_grid";

export type CategoryShowcaseItem = {
  label: string;
  category_id?: string | null;
  category_slug?: string | null;
  image_url?: string | null;
  href?: string | null;
  cta_label?: string | null;
  /** Optional supporting line under the tile label (e.g. featured style blurb). */
  body?: string | null;
};

export type CategoryShowcaseBlockProps = {
  title: string;
  eyebrow?: string;
  /** Optional header CTA (e.g. "View All"). */
  cta_label?: string;
  layout?: CategoryShowcaseLayout;
  items: CategoryShowcaseItem[];
};

export type StorefrontContentPageSlug = "home" | "about" | "contact" | "faq";

export type StorefrontBlock = {
  id: string;
  type: StorefrontBlockType;
  props: Record<string, unknown>;
  edit_metadata?: {
    source?: "ai_generated" | "merchant" | "platform_default";
    locked?: boolean;
  };
};

export type StorefrontHomePage = {
  blocks: StorefrontBlock[];
};

export type StorefrontBlockOperation =
  | { op: "update_block"; page?: StorefrontContentPageSlug; block_id: string; props: Record<string, unknown> }
  | { op: "reorder_blocks"; page?: StorefrontContentPageSlug; order: string[] }
  | {
      op: "add_block";
      page?: StorefrontContentPageSlug;
      type: StorefrontBlockType;
      after?: string;
      before?: string;
      props?: Record<string, unknown>;
    }
  | { op: "remove_block"; page?: StorefrontContentPageSlug; block_id: string }
  | {
      op: "regenerate_section";
      page: StorefrontContentPageSlug;
      block_id: string;
      props?: Record<string, unknown>;
    };

export type HeroBlockProps = {
  eyebrow?: string;
  headline: string;
  subheadline: string;
  cta_label: string;
  cta_href?: string;
  image_url?: string | null;
  layout?: "centered" | "split" | "image_right";
};

export type StatsRowBlockProps = {
  items: { value: string; label: string }[];
};

export type RichTextBlockProps = {
  title: string;
  body: string;
  image_url?: string | null;
  badges?: { value: string; label: string }[];
};

export type FeatureGridBlockProps = {
  title: string;
  body: string;
  items: { title: string; body: string }[];
  /** Optional section background / accent image (difference panels, trust visuals). */
  image_url?: string | null;
};

export type CtaBannerBlockProps = {
  title: string;
  body: string;
  eyebrow?: string;
  bullets?: string[];
  cta_label: string;
  cta_href?: string;
  image_url?: string | null;
  layout?: "text_left" | "text_right";
};

export type ProductGridBlockProps = {
  title?: string;
  limit?: number;
};

export type FaqBlockProps = {
  title: string;
  items: { question: string; answer: string }[];
};

export type ContactFormFieldType = "text" | "email" | "tel" | "textarea" | "number";

export type ContactFormField = {
  name: string;
  label: string;
  type: ContactFormFieldType;
  required?: boolean;
  placeholder?: string;
};

export type ContactFormBlockProps = {
  title: string;
  intro: string;
  fields: ContactFormField[];
  submit_label: string;
  success_message: string;
};
