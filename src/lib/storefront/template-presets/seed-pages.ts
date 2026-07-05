import type { StorefrontContent, StorefrontTemplateId } from "@/lib/api/types";
import {
  buildAboutPageBlocks,
  buildContactPageBlocks,
  buildFaqPageBlocks,
} from "@/lib/storefront/blocks/migrate-page-blocks";

type TemplatePageDefaults = {
  about: { title: string; body: string };
  contact: { title: string; body: string };
  faq: {
    title: string;
    items: { question: string; answer: string }[];
  };
  value_props?: { title: string; body: string }[];
};

export function seedTemplatePages(
  storefront: StorefrontContent,
  templateId: StorefrontTemplateId,
  defaults: TemplatePageDefaults,
): StorefrontContent {
  const next: StorefrontContent = {
    ...storefront,
    about: defaults.about,
    ...(defaults.value_props ? { value_props: defaults.value_props } : {}),
  };

  next.pages = {
    ...next.pages,
    about: {
      title: defaults.about.title,
      body: defaults.about.body,
      source: "platform_default",
      blocks: buildAboutPageBlocks(next, templateId),
    },
    contact: {
      title: defaults.contact.title,
      body: defaults.contact.body,
      email: next.pages?.contact?.email ?? null,
      phone: next.pages?.contact?.phone ?? null,
      source: "merchant",
      blocks: buildContactPageBlocks({
        ...next,
        pages: {
          ...next.pages,
          contact: {
            title: defaults.contact.title,
            body: defaults.contact.body,
            email: null,
            phone: null,
            source: "merchant",
          },
        },
      }),
    },
    faq: {
      title: defaults.faq.title,
      source: "platform_default",
      items: defaults.faq.items,
      blocks: buildFaqPageBlocks({
        ...next,
        pages: {
          ...next.pages,
          faq: {
            title: defaults.faq.title,
            source: "platform_default",
            items: defaults.faq.items,
          },
        },
      }),
    },
    privacy_policy: next.pages?.privacy_policy ?? {
      title: "Privacy policy",
      body: "",
      source: "platform_default",
    },
  };

  return next;
}
