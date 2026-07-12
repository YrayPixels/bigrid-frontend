import type { StorefrontContent, StorefrontTemplateId } from "@/lib/api/types";
import { beautyTemplateImages } from "@/lib/storefront/beauty-defaults";
import { cosmeticsTemplateImages } from "@/lib/storefront/cosmetics-defaults";
import { buildFurnitureHardwareHomeBlocks } from "@/lib/storefront/template-presets/furniture-hardware";
import { buildHairFashionHomeBlocks } from "@/lib/storefront/template-presets/hair-and-fashion";
import {
  categoryShowcaseLayoutForTemplate,
  defaultCategoryShowcaseProps,
} from "@/lib/storefront/blocks/category-showcase-defaults";
import type { HeroBlockProps, StorefrontBlock } from "@/lib/storefront/blocks/types";

const DEFAULT_HOME_STATS = [
  { value: "Crafted for everyday routines", label: "calm care, clean formulas" },
  { value: "Everyday glow", label: "simple steps that layer easily" },
  { value: "Gentle care", label: "formulas chosen for comfort" },
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
        image_url: cosmeticsTemplateImages.cactus,
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

  if (templateId === "furniture-hardware") {
    return buildFurnitureHardwareHomeBlocks(storefront);
  }

  if (templateId === "hair-and-fashion") {
    return buildHairFashionHomeBlocks(storefront);
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
  ];

  if (templateId === "beauty") {
    blocks.push(
      {
        id: "perfect-match",
        type: "cta_banner",
        props: {
          title: "The perfect match.",
          body: "Our signature textures are created to blend flawlessly with the natural curls, coils, and kinks you were born with.",
          cta_label: "Shop extensions",
          cta_href: "/products",
          image_url: storefront.media?.about_image_url ?? beautyTemplateImages.about,
          layout: "text_left",
        },
      },
      {
        id: "extensions-kit",
        type: "cta_banner",
        props: {
          title: "Perfect extensions kit.",
          body: "Care and styling essentials that keep every install soft, glossy, and ready to wear.",
          cta_label: "Shop extensions care",
          cta_href: "/products",
          image_url: beautyTemplateImages.careKit,
          layout: "text_right",
        },
      },
      {
        id: "difference",
        type: "feature_grid",
        props: {
          title: "the heatfree hair difference",
          body: "Feel good wearing your own hair. Shop women believe in and trust.",
          items: [
            {
              title: "Undetectable closures",
              body: "Seamless finishes made to blend naturally with your hairline.",
            },
            {
              title: "Virgin textures",
              body: "Soft, full bundles selected for movement, body, and longevity.",
            },
            {
              title: "No-shed finishing",
              body: "Reinforced wefts and gentle care routines for longer wear.",
            },
            {
              title: "Ready-to-style",
              body: "Curated textures, ponytails, and kits for salon-level looks.",
            },
          ],
          image_url: beautyTemplateImages.texture,
        },
      },
    );
  } else {
    blocks.push({
      id: "trust-features",
      type: "feature_grid",
      props: {
        title: "Why shop with us",
        body: storefront.about.body,
        items: valueProps.slice(0, 3),
      },
    });
  }

  if (templateId === "fashion_lookbook" || templateId === "beauty") {
    blocks.push(categoryShowcaseBlock(templateId));
  }

  blocks.push(
    {
      id: "featured-products",
      type: "product_grid",
      props: {
        title: templateId === "beauty" ? "Best sellers" : "Featured products",
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

function homeBlocksMatchTemplate(
  blocks: StorefrontBlock[],
  templateId: StorefrontTemplateId,
): boolean {
  const hasCosmeticsRecipe = blocks.some((block) => block.id === "serum-promo");
  const hasFurnitureRecipe = blocks.some((block) => block.id === "collections");
  const hasHairRecipe = blocks.some((block) => block.id === "choose-style");

  if (templateId === "cosmetics") return hasCosmeticsRecipe;
  if (templateId === "furniture-hardware") return hasFurnitureRecipe;
  if (templateId === "hair-and-fashion") return hasHairRecipe;

  // Shared default / fashion / beauty recipes must not keep specialty trees.
  return !hasCosmeticsRecipe && !hasFurnitureRecipe && !hasHairRecipe;
}

export function migrateHomeBlocks(storefront: StorefrontContent): StorefrontBlock[] {
  const existing = storefront.pages?.home?.blocks;
  const templateId = storefront.template?.id ?? "classic";

  if (existing?.length && homeBlocksMatchTemplate(existing, templateId)) {
    if (templateId === "fashion_lookbook" || templateId === "beauty") {
      return ensureCategoryShowcaseBlock(existing, storefront);
    }
    return existing;
  }

  if (templateId === "cosmetics") {
    return buildCosmeticsHomeBlocks(storefront);
  }

  if (templateId === "furniture-hardware") {
    return buildFurnitureHardwareHomeBlocks(storefront);
  }

  if (templateId === "hair-and-fashion") {
    return buildHairFashionHomeBlocks(storefront);
  }

  return buildDefaultHomeBlocks(storefront, templateId);
}
