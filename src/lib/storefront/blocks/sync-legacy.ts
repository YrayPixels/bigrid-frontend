import type { StorefrontContent } from "@/lib/api/types";
import {
  ensureAllPageBlocksOnStorefront,
  migrateAboutBlocks,
  migrateContactBlocks,
  migrateFaqBlocks,
} from "@/lib/storefront/blocks/migrate-page-blocks";
import { migrateHomeBlocks } from "@/lib/storefront/blocks/migrate-home";
import {
  syncLegacyFieldsFromAboutBlocks,
  syncLegacyFieldsFromContactBlocks,
  syncLegacyFieldsFromFaqBlocks,
} from "@/lib/storefront/blocks/sync-page-legacy";
import type { HeroBlockProps, StatsRowBlockProps, StorefrontBlock } from "@/lib/storefront/blocks/types";

export function resolveHomeBlocks(storefront: StorefrontContent): StorefrontBlock[] {
  return migrateHomeBlocks(storefront);
}

export function ensureHomeBlocksOnStorefront(storefront: StorefrontContent): StorefrontContent {
  const next = ensureAllPageBlocksOnStorefront(storefront);
  const homeBlocks = migrateHomeBlocks(next);
  syncLegacyFieldsFromHomeBlocks(next, homeBlocks);
  syncLegacyFieldsFromAboutBlocks(next, migrateAboutBlocks(next));
  syncLegacyFieldsFromContactBlocks(next, migrateContactBlocks(next));
  syncLegacyFieldsFromFaqBlocks(next, migrateFaqBlocks(next));
  return next;
}

export function syncLegacyFieldsFromHomeBlocks(
  storefront: StorefrontContent,
  blocks: StorefrontBlock[] = resolveHomeBlocks(storefront),
): void {
  const heroBlock = blocks.find((block) => block.type === "hero");
  if (heroBlock) {
    const props = heroBlock.props as HeroBlockProps;
    storefront.hero = {
      headline: props.headline,
      subheadline: props.subheadline,
      cta_label: props.cta_label,
      eyebrow: props.eyebrow ?? storefront.hero?.eyebrow ?? null,
    };
    if (props.image_url) {
      storefront.media = { ...storefront.media, hero_image_url: props.image_url };
    }
  }

  const statsBlock = blocks.find((block) => block.type === "stats_row");
  if (statsBlock) {
    storefront.home_stats = (statsBlock.props as StatsRowBlockProps).items;
  }

  const richTextBlock = blocks.find((block) => block.type === "rich_text");
  if (richTextBlock) {
    const props = richTextBlock.props as { title?: string; body?: string; badges?: { value: string; label: string }[] };
    if (props.title) storefront.about.title = props.title;
    if (props.body) storefront.about.body = props.body;
    if (props.badges?.length) {
      storefront.value_props = props.badges.map((badge) => ({
        title: badge.value,
        body: badge.label,
      }));
    }
  }

  const featureBlock = blocks.find((block) => block.type === "feature_grid");
  if (featureBlock) {
    const props = featureBlock.props as { items?: { title: string; body: string }[] };
    if (props.items?.length) {
      storefront.value_props = props.items;
    }
  }

  const faqBlock = blocks.find((block) => block.type === "faq");
  if (faqBlock) {
    const props = faqBlock.props as { title?: string; items?: { question: string; answer: string }[] };
    const existingFaqBlocks = storefront.pages?.faq?.blocks;
    storefront.pages = {
      ...storefront.pages,
      faq: {
        title: props.title ?? storefront.pages?.faq?.title ?? "Frequently asked questions",
        source: "merchant",
        items: props.items ?? storefront.pages?.faq?.items ?? [],
        ...(existingFaqBlocks?.length ? { blocks: existingFaqBlocks } : {}),
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
      home: { blocks },
    };
  }
}

export function findHomeBlockIndex(blocks: StorefrontBlock[], blockId: string): number {
  return blocks.findIndex((block) => block.id === blockId);
}

export function syncHomeBlocksFromLegacyFields(storefront: StorefrontContent): void {
  const blocks = migrateHomeBlocks(storefront).map((block) => ({
    ...block,
    props: { ...block.props },
  }));

  for (const block of blocks) {
    if (block.type === "hero") {
      block.props = {
        ...block.props,
        eyebrow: storefront.hero.eyebrow ?? block.props.eyebrow ?? null,
        headline: storefront.hero.headline,
        subheadline: storefront.hero.subheadline,
        cta_label: storefront.hero.cta_label,
        image_url: storefront.media?.hero_image_url ?? block.props.image_url ?? null,
      };
      continue;
    }

    if (block.type === "stats_row" && storefront.home_stats?.length) {
      block.props = { items: storefront.home_stats };
      continue;
    }

    if (block.type === "rich_text") {
      const nextProps: Record<string, unknown> = {
        ...block.props,
        title: storefront.about.title,
        body: storefront.about.body,
      };
      // Preserve cosmetics-style badge rows; don't invent them for Fashion about chrome.
      if (Array.isArray(block.props.badges)) {
        nextProps.badges = (storefront.value_props ?? []).slice(0, 3).map((item) => ({
          value: item.title,
          label: item.body,
        }));
      }
      block.props = nextProps;
      continue;
    }

    if (block.type === "feature_grid" && storefront.value_props?.length) {
      block.props = {
        ...block.props,
        items: storefront.value_props.slice(0, 3),
      };
      continue;
    }

    if (block.type === "faq") {
      block.props = {
        ...block.props,
        title: storefront.pages?.faq?.title ?? block.props.title,
        items: storefront.pages?.faq?.items ?? block.props.items ?? [],
      };
    }
  }

  storefront.pages = {
    ...storefront.pages,
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
    home: { blocks },
  };
}

const LEGACY_HOME_SYNC_PREFIXES = [
  "hero.",
  "home_stats.",
  "about.",
  "pages.about.",
  "value_props.",
  "pages.faq.",
  "media.hero_image_url",
];

export function shouldSyncHomeBlocksFromLegacyPaths(changedPaths: string[]): boolean {
  return changedPaths.some((path) =>
    LEGACY_HOME_SYNC_PREFIXES.some((prefix) => path.startsWith(prefix)),
  );
}

export function maybeSyncHomeBlocksFromLegacyPaths(
  storefront: StorefrontContent,
  changedPaths: string[],
): StorefrontContent {
  if (!shouldSyncHomeBlocksFromLegacyPaths(changedPaths)) {
    return storefront;
  }

  const next = structuredClone(storefront);
  syncHomeBlocksFromLegacyFields(next);
  return next;
}
