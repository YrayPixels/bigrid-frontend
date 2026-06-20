import type { StorefrontContent } from "@/lib/api/types";
import {
  migrateAboutBlocks,
  migrateContactBlocks,
  migrateFaqBlocks,
} from "@/lib/storefront/blocks/migrate-page-blocks";
import type {
  ContactFormBlockProps,
  FaqBlockProps,
  FeatureGridBlockProps,
  RichTextBlockProps,
  StorefrontBlock,
  StorefrontContentPageSlug,
} from "@/lib/storefront/blocks/types";

export function pageBlockPropPath(
  page: StorefrontContentPageSlug,
  blockId: string,
  field: string,
): string {
  return `pages.${page}.blocks.${blockId}.props.${field}`;
}

function ensurePageBlocks(
  storefront: StorefrontContent,
  page: Exclude<StorefrontContentPageSlug, "home">,
  blocks: StorefrontBlock[],
): void {
  if (page === "about") {
    storefront.pages = {
      ...storefront.pages,
      about: {
        ...(storefront.pages?.about ?? {
          title: storefront.about.title,
          body: storefront.about.body,
          source: "merchant",
        }),
        blocks,
      },
      contact: storefront.pages?.contact ?? {
        title: "Contact us",
        body: "",
        email: null,
        phone: null,
        source: "merchant",
      },
      faq: storefront.pages?.faq ?? {
        title: "Frequently asked questions",
        source: "merchant",
        items: [],
      },
      privacy_policy: storefront.pages?.privacy_policy ?? {
        title: "Privacy policy",
        body: "",
        source: "platform_default",
      },
      home: storefront.pages?.home,
    };
    return;
  }

  if (page === "contact") {
    storefront.pages = {
      ...storefront.pages,
      contact: {
        ...(storefront.pages?.contact ?? {
          title: "Contact us",
          body: "",
          email: null,
          phone: null,
          source: "merchant",
        }),
        blocks,
      },
      about: storefront.pages?.about ?? {
        title: storefront.about.title,
        body: storefront.about.body,
        source: "merchant",
      },
      faq: storefront.pages?.faq ?? {
        title: "Frequently asked questions",
        source: "merchant",
        items: [],
      },
      privacy_policy: storefront.pages?.privacy_policy ?? {
        title: "Privacy policy",
        body: "",
        source: "platform_default",
      },
      home: storefront.pages?.home,
    };
    return;
  }

  storefront.pages = {
    ...storefront.pages,
    faq: {
      ...(storefront.pages?.faq ?? {
        title: "Frequently asked questions",
        source: "merchant",
        items: [],
      }),
      blocks,
    },
    about: storefront.pages?.about ?? {
      title: storefront.about.title,
      body: storefront.about.body,
      source: "merchant",
    },
    contact: storefront.pages?.contact ?? {
      title: "Contact us",
      body: "",
      email: null,
      phone: null,
      source: "merchant",
    },
    privacy_policy: storefront.pages?.privacy_policy ?? {
      title: "Privacy policy",
      body: "",
      source: "platform_default",
    },
    home: storefront.pages?.home,
  };
}

export function syncLegacyFieldsFromAboutBlocks(
  storefront: StorefrontContent,
  blocks: StorefrontBlock[] = migrateAboutBlocks(storefront),
): void {
  const richTextBlock = blocks.find((block) => block.type === "rich_text");
  if (richTextBlock) {
    const props = richTextBlock.props as RichTextBlockProps;
    if (props.title) {
      storefront.about.title = props.title;
      if (storefront.pages?.about) storefront.pages.about.title = props.title;
    }
    if (props.body) {
      storefront.about.body = props.body;
      if (storefront.pages?.about) storefront.pages.about.body = props.body;
    }
    if (props.badges?.length) {
      storefront.value_props = props.badges.map((badge) => ({
        title: badge.value,
        body: badge.label,
      }));
    }
  }

  const featureBlock = blocks.find((block) => block.type === "feature_grid");
  if (featureBlock) {
    const props = featureBlock.props as FeatureGridBlockProps;
    if (props.items?.length) {
      storefront.value_props = props.items;
    }
  }

  ensurePageBlocks(storefront, "about", blocks);
}

export function syncLegacyFieldsFromContactBlocks(
  storefront: StorefrontContent,
  blocks: StorefrontBlock[] = migrateContactBlocks(storefront),
): void {
  const introBlock = blocks.find((block) => block.type === "rich_text");
  if (introBlock) {
    const props = introBlock.props as RichTextBlockProps;
    const contact = storefront.pages?.contact ?? {
      title: "Contact us",
      body: "",
      email: null,
      phone: null,
      source: "merchant" as const,
    };
    if (props.title) contact.title = props.title;
    if (props.body) contact.body = props.body;
    storefront.pages = { ...storefront.pages, contact: { ...contact, blocks } };
    return;
  }

  ensurePageBlocks(storefront, "contact", blocks);
}

export function syncLegacyFieldsFromFaqBlocks(
  storefront: StorefrontContent,
  blocks: StorefrontBlock[] = migrateFaqBlocks(storefront),
): void {
  const faqBlock = blocks.find((block) => block.type === "faq");
  if (faqBlock) {
    const props = faqBlock.props as FaqBlockProps;
    storefront.pages = {
      ...storefront.pages,
      faq: {
        title: props.title ?? storefront.pages?.faq?.title ?? "Frequently asked questions",
        source: "merchant",
        items: props.items ?? storefront.pages?.faq?.items ?? [],
        blocks,
      },
      about: storefront.pages?.about ?? {
        title: storefront.about.title,
        body: storefront.about.body,
        source: "merchant",
      },
      contact: storefront.pages?.contact ?? {
        title: "Contact us",
        body: "",
        email: null,
        phone: null,
        source: "merchant",
      },
      privacy_policy: storefront.pages?.privacy_policy ?? {
        title: "Privacy policy",
        body: "",
        source: "platform_default",
      },
      home: storefront.pages?.home,
    };
  }
}

export function syncAboutBlocksFromLegacyFields(storefront: StorefrontContent): void {
  const blocks = migrateAboutBlocks(storefront).map((block) => ({
    ...block,
    props: { ...block.props },
  }));

  for (const block of blocks) {
    if (block.type === "rich_text") {
      block.props = {
        ...block.props,
        title: storefront.pages?.about?.title ?? storefront.about.title,
        body: storefront.pages?.about?.body ?? storefront.about.body,
        badges: (storefront.value_props ?? []).slice(0, 3).map((item) => ({
          value: item.title,
          label: item.body,
        })),
      };
      continue;
    }

    if (block.type === "feature_grid" && storefront.value_props?.length) {
      block.props = {
        ...block.props,
        items: storefront.value_props.slice(0, 3),
      };
    }
  }

  ensurePageBlocks(storefront, "about", blocks);
}

export function syncContactBlocksFromLegacyFields(storefront: StorefrontContent): void {
  const contact = storefront.pages?.contact ?? {
    title: "Contact us",
    body: "",
    email: null,
    phone: null,
    source: "merchant" as const,
  };

  const blocks = migrateContactBlocks(storefront).map((block) => ({
    ...block,
    props: { ...block.props },
  }));

  for (const block of blocks) {
    if (block.type === "rich_text") {
      block.props = {
        ...block.props,
        title: contact.title,
        body: contact.body,
      };
      continue;
    }

    if (block.type === "contact_form") {
      const props = block.props as ContactFormBlockProps;
      block.props = {
        ...props,
        intro: contact.body?.trim() || props.intro,
      };
    }
  }

  ensurePageBlocks(storefront, "contact", blocks);
}

export function syncFaqBlocksFromLegacyFields(storefront: StorefrontContent): void {
  const blocks = migrateFaqBlocks(storefront).map((block) => ({
    ...block,
    props: { ...block.props },
  }));

  for (const block of blocks) {
    if (block.type === "faq") {
      block.props = {
        ...block.props,
        title: storefront.pages?.faq?.title ?? block.props.title,
        items: storefront.pages?.faq?.items ?? block.props.items ?? [],
      };
    }
  }

  ensurePageBlocks(storefront, "faq", blocks);
}

const LEGACY_ABOUT_SYNC_PREFIXES = ["about.", "pages.about.", "value_props.", "media.about_image_url"];
const LEGACY_CONTACT_SYNC_PREFIXES = ["pages.contact."];
const LEGACY_FAQ_SYNC_PREFIXES = ["pages.faq."];

export function shouldSyncAboutBlocksFromLegacyPaths(changedPaths: string[]): boolean {
  return changedPaths.some((path) =>
    LEGACY_ABOUT_SYNC_PREFIXES.some((prefix) => path.startsWith(prefix)),
  );
}

export function shouldSyncContactBlocksFromLegacyPaths(changedPaths: string[]): boolean {
  return changedPaths.some((path) =>
    LEGACY_CONTACT_SYNC_PREFIXES.some((prefix) => path.startsWith(prefix)),
  );
}

export function shouldSyncFaqPageBlocksFromLegacyPaths(changedPaths: string[]): boolean {
  return changedPaths.some((path) =>
    LEGACY_FAQ_SYNC_PREFIXES.some((prefix) => path.startsWith(prefix)),
  );
}

export function maybeSyncPageBlocksFromLegacyPaths(
  storefront: StorefrontContent,
  changedPaths: string[],
): StorefrontContent {
  const next = structuredClone(storefront);

  if (shouldSyncAboutBlocksFromLegacyPaths(changedPaths)) {
    syncAboutBlocksFromLegacyFields(next);
  }

  if (shouldSyncContactBlocksFromLegacyPaths(changedPaths)) {
    syncContactBlocksFromLegacyFields(next);
  }

  if (shouldSyncFaqPageBlocksFromLegacyPaths(changedPaths)) {
    syncFaqBlocksFromLegacyFields(next);
  }

  return next;
}
