import type { StorefrontContent, StorefrontTemplateId } from "@/lib/api/types";
import { cosmeticsTemplateImages } from "@/lib/storefront/cosmetics-defaults";
import {
  categoryShowcaseLayoutForTemplate,
  defaultCategoryShowcaseProps,
} from "@/lib/storefront/blocks/category-showcase-defaults";
import type { HeroBlockProps, StorefrontBlock } from "@/lib/storefront/blocks/types";

const DEFAULT_HOME_STATS = [
  { value: "Trusted by over 350,000+ Clients", label: "worldwide since 2008" },
  { value: "6M+", label: "Worldwide Product sale per year" },
  { value: "4.6", label: "3,350 Rating Worldwide" },
];

export function buildCosmeticsHomeBlocks(storefront: StorefrontContent): StorefrontBlock[] {
  const stats = storefront.home_stats?.length ? storefront.home_stats : DEFAULT_HOME_STATS;
  const valueProps = storefront.value_props?.length
    ? storefront.value_props
    : [
        { title: "100% organic", body: "Botanical ingredients chosen for gentle daily care." },
        { title: "Clinical feel", body: "Simple formulas that support comfort, glow, and consistency." },
        { title: "Herbal products", body: "Clean textures made to layer easily in any routine." },
      ];

  return [
    {
      id: "hero-main",
      type: "hero",
      props: {
        eyebrow: "Discover the Nature with",
        headline: storefront.hero.headline,
        subheadline: storefront.hero.subheadline,
        cta_label: storefront.hero.cta_label,
        cta_href: "/products",
        image_url: storefront.media?.hero_image_url ?? cosmeticsTemplateImages.hero,
        layout: "split",
      },
    },
    {
      id: "home-stats",
      type: "stats_row",
      props: { items: stats },
    },
    {
      id: "about-spotlight",
      type: "rich_text",
      props: {
        title: storefront.about.title,
        body: storefront.about.body,
        image_url: cosmeticsTemplateImages.cleanser,
        badges: valueProps.slice(0, 3).map((item) => ({
          value: item.title,
          label: item.body,
        })),
      },
    },
    {
      id: "serum-promo",
      type: "cta_banner",
      props: {
        title: "Our Best Serums",
        body: "Lightweight botanical actives made to layer cleanly after cleansing and before daily moisture.",
        bullets: [
          "Designed for bright, hydrated-looking skin.",
          "Calm textures for morning and evening routines.",
          "Simple steps customers can understand quickly.",
        ],
        cta_label: "Explore",
        cta_href: "/products",
        image_url: cosmeticsTemplateImages.serum,
        layout: "text_left",
      },
    },
    {
      id: "trust-features",
      type: "feature_grid",
      props: {
        title: "Why Choose Us",
        body: "A calm product story, premium formulas, and trust blocks that match the clean cosmetics reference.",
        items: valueProps.slice(0, 3),
      },
    },
    {
      id: "featured-products",
      type: "product_grid",
      props: {
        title: "Shop the line",
        limit: 4,
      },
    },
    {
      id: "home-faq",
      type: "faq",
      props: {
        title: storefront.pages?.faq?.title ?? "Frequently Ask Questions",
        items: storefront.pages?.faq?.items ?? [],
      },
    },
  ];
}

function heroLayoutForTemplate(templateId: StorefrontTemplateId): HeroBlockProps["layout"] {
  if (templateId === "editorial" || templateId === "minimalistic") return "centered";
  if (templateId === "bold_grid") return "image_right";
  return "split";
}

function productLimitForTemplate(templateId: StorefrontTemplateId): number {
  if (templateId === "bold_grid") return 6;
  if (templateId === "classic") return 3;
  return 4;
}

function categoryShowcaseBlock(templateId: StorefrontTemplateId): StorefrontBlock {
  return {
    id: "category-showcase",
    type: "category_showcase",
    props: defaultCategoryShowcaseProps(categoryShowcaseLayoutForTemplate(templateId)),
  };
}

export function buildDefaultHomeBlocks(
  storefront: StorefrontContent,
  templateId: StorefrontTemplateId = storefront.template?.id ?? "classic",
): StorefrontBlock[] {
  if (templateId === "cosmetics") {
    return buildCosmeticsHomeBlocks(storefront);
  }

  const valueProps = storefront.value_props?.length
    ? storefront.value_props
    : [
        { title: "Curated for your customers", body: "A focused storefront built around what buyers need most." },
        { title: "Fast local delivery", body: "Most orders ship within 2–4 business days." },
        { title: "Built for trust", body: "Clear messaging and a simple shopping experience." },
      ];

  const blocks: StorefrontBlock[] = [
    {
      id: "hero-main",
      type: "hero",
      props: {
        headline: storefront.hero.headline,
        subheadline: storefront.hero.subheadline,
        cta_label: storefront.hero.cta_label,
        cta_href: "/products",
        image_url: storefront.media?.hero_image_url ?? null,
        layout: heroLayoutForTemplate(templateId),
      },
    },
    {
      id: "trust-features",
      type: "feature_grid",
      props: {
        title: "Why shop with us",
        body: storefront.about.body,
        items: valueProps.slice(0, 3),
      },
    },
  ];

  if (templateId === "fashion_lookbook" || templateId === "beauty") {
    blocks.push(categoryShowcaseBlock(templateId));
  }

  blocks.push(
    {
      id: "featured-products",
      type: "product_grid",
      props: {
        title: templateId === "beauty" ? "Shop the collection" : "Featured products",
        limit: productLimitForTemplate(templateId),
      },
    },
    {
      id: "home-faq",
      type: "faq",
      props: {
        title: storefront.pages?.faq?.title ?? "Frequently asked questions",
        items: storefront.pages?.faq?.items ?? [],
      },
    },
  );

  return blocks;
}

function ensureCategoryShowcaseBlock(
  blocks: StorefrontBlock[],
  storefront: StorefrontContent,
): StorefrontBlock[] {
  const templateId = storefront.template?.id ?? "classic";
  if (templateId !== "fashion_lookbook" && templateId !== "beauty") return blocks;
  if (blocks.some((block) => block.type === "category_showcase")) return blocks;

  const categoryBlock = categoryShowcaseBlock(templateId);
  const trustIndex = blocks.findIndex((block) => block.id === "trust-features");
  if (trustIndex >= 0) {
    return [...blocks.slice(0, trustIndex + 1), categoryBlock, ...blocks.slice(trustIndex + 1)];
  }

  const heroIndex = blocks.findIndex((block) => block.id === "hero-main");
  if (heroIndex >= 0) {
    return [...blocks.slice(0, heroIndex + 1), categoryBlock, ...blocks.slice(heroIndex + 1)];
  }

  return [categoryBlock, ...blocks];
}

export function migrateHomeBlocks(storefront: StorefrontContent): StorefrontBlock[] {
  const existing = storefront.pages?.home?.blocks;
  if (existing?.length) return ensureCategoryShowcaseBlock(existing, storefront);

  const templateId = storefront.template?.id ?? "classic";
  if (templateId === "cosmetics") {
    return buildCosmeticsHomeBlocks(storefront);
  }

  return buildDefaultHomeBlocks(storefront, templateId);
}
