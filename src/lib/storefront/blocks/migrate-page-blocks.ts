import type { StorefrontContent, StorefrontTemplateId } from "@/lib/api/types";
import { cosmeticsTemplateImages } from "@/lib/storefront/cosmetics-defaults";
import { furnitureHardwareTemplateImages } from "@/lib/storefront/furniture-hardware-defaults";
import { hairFashionTemplateImages } from "@/lib/storefront/hair-fashion-defaults";
import { migrateHomeBlocks } from "@/lib/storefront/blocks/migrate-home";
import type {
  ContactFormBlockProps,
  ContactFormField,
  StorefrontBlock,
  StorefrontContentPageSlug,
} from "@/lib/storefront/blocks/types";

export const DEFAULT_CONTACT_FORM_FIELDS: ContactFormField[] = [
  { name: "name", label: "Full name", type: "text", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "message", label: "Message", type: "textarea", required: true },
];

export function defaultContactFormProps(
  storefront: StorefrontContent,
  fields: ContactFormField[] = DEFAULT_CONTACT_FORM_FIELDS,
): ContactFormBlockProps {
  const contact = storefront.pages?.contact;

  return {
    title: "Get in touch",
    intro: contact?.body?.trim() || "Questions about an order or product?",
    fields,
    submit_label: "Send message",
    success_message: "Thanks — we'll reply soon.",
  };
}

function defaultValueProps(storefront: StorefrontContent) {
  return storefront.value_props?.length
    ? storefront.value_props
    : [
        { title: "100% organic", body: "Botanical ingredients chosen for gentle daily care." },
        { title: "Clinical feel", body: "Simple formulas that support comfort, glow, and consistency." },
        { title: "Herbal products", body: "Clean textures made to layer easily in any routine." },
      ];
}

export function buildAboutPageBlocks(
  storefront: StorefrontContent,
  templateId: StorefrontTemplateId = storefront.template?.id ?? "classic",
): StorefrontBlock[] {
  const about = storefront.pages?.about ?? storefront.about;
  const valueProps = defaultValueProps(storefront);
  const imageUrl =
    templateId === "cosmetics" || templateId === "beauty"
      ? storefront.media?.about_image_url ?? cosmeticsTemplateImages.about
      : templateId === "furniture-hardware"
        ? storefront.media?.about_image_url ?? furnitureHardwareTemplateImages.collection
        : templateId === "hair-and-fashion"
          ? storefront.media?.about_image_url ?? hairFashionTemplateImages.textureBg
          : storefront.media?.about_image_url ?? null;

  return [
    {
      id: "about-main",
      type: "rich_text",
      props: {
        title: about.title,
        body: about.body,
        image_url: imageUrl,
        badges: valueProps.slice(0, 3).map((item) => ({
          value: item.title,
          label: item.body,
        })),
      },
    },
    {
      id: "about-features",
      type: "feature_grid",
      props: {
        title: "Why choose us",
        body: "Thoughtful formulas and trust blocks that match your brand story.",
        items: valueProps.slice(0, 3),
      },
    },
  ];
}

export function buildContactPageBlocks(storefront: StorefrontContent): StorefrontBlock[] {
  const contact = storefront.pages?.contact ?? {
    title: "Contact us",
    body: "Have a question about an order or product? Reach out and our team will get back to you shortly.",
    email: null,
    phone: null,
    source: "ai_generated" as const,
  };

  return [
    {
      id: "contact-intro",
      type: "rich_text",
      props: {
        title: contact.title,
        body: contact.body,
      },
    },
    {
      id: "contact-form",
      type: "contact_form",
      props: defaultContactFormProps(storefront),
    },
  ];
}

export function buildFaqPageBlocks(storefront: StorefrontContent): StorefrontBlock[] {
  const faq = storefront.pages?.faq ?? {
    title: "Frequently asked questions",
    source: "ai_generated" as const,
    items: [],
  };

  return [
    {
      id: "faq-main",
      type: "faq",
      props: {
        title: faq.title,
        items: faq.items ?? [],
      },
    },
  ];
}

export function migrateAboutBlocks(storefront: StorefrontContent): StorefrontBlock[] {
  const existing = storefront.pages?.about?.blocks;
  if (existing?.length) return existing;

  const templateId = storefront.template?.id ?? "classic";
  return buildAboutPageBlocks(storefront, templateId);
}

export function migrateContactBlocks(storefront: StorefrontContent): StorefrontBlock[] {
  const existing = storefront.pages?.contact?.blocks;
  if (existing?.length) return existing;

  return buildContactPageBlocks(storefront);
}

export function migrateFaqBlocks(storefront: StorefrontContent): StorefrontBlock[] {
  const existing = storefront.pages?.faq?.blocks;
  if (existing?.length) return existing;

  return buildFaqPageBlocks(storefront);
}

export function resolvePageBlocks(
  storefront: StorefrontContent,
  page: StorefrontContentPageSlug,
): StorefrontBlock[] {
  switch (page) {
    case "home":
      return migrateHomeBlocks(storefront);
    case "about":
      return migrateAboutBlocks(storefront);
    case "contact":
      return migrateContactBlocks(storefront);
    case "faq":
      return migrateFaqBlocks(storefront);
    default:
      return [];
  }
}

export function ensureAllPageBlocksOnStorefront(storefront: StorefrontContent): StorefrontContent {
  const next = structuredClone(storefront);
  const homeBlocks = migrateHomeBlocks(next);
  const aboutBlocks = migrateAboutBlocks(next);
  const contactBlocks = migrateContactBlocks(next);
  const faqBlocks = migrateFaqBlocks(next);

  next.pages = {
    ...next.pages,
    about: {
      ...(next.pages?.about ?? {
        title: next.about.title,
        body: next.about.body,
        source: "ai_generated" as const,
      }),
      blocks: aboutBlocks,
    },
    contact: {
      ...(next.pages?.contact ?? {
        title: "Contact us",
        body: "",
        email: null,
        phone: null,
        source: "ai_generated" as const,
      }),
      blocks: contactBlocks,
    },
    faq: {
      ...(next.pages?.faq ?? {
        title: "Frequently asked questions",
        source: "ai_generated" as const,
        items: [],
      }),
      blocks: faqBlocks,
    },
    privacy_policy: next.pages?.privacy_policy ?? {
      title: "Privacy policy",
      body: "",
      source: "platform_default",
    },
    home: { blocks: homeBlocks },
  };

  return next;
}
