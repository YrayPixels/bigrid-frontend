import type { StorefrontContent } from "@/lib/api/types";
import type { StorefrontBlock } from "@/lib/storefront/blocks/types";
import {
  hairFashionContactDefaults,
  hairFashionFaqDefaults,
  hairFashionNavItems,
  hairFashionTemplateImages,
  hairFashionValueProps,
} from "@/lib/storefront/hair-fashion-defaults";
import { getDefaultStorefrontPalette } from "@/lib/storefront/template";
import { seedTemplatePages } from "@/lib/storefront/template-presets/seed-pages";

export const hairFashionHeroDefaults = {
  headline: "Be beautiful, be you,",
  subheadline: "Premium virgin hair extensions created exclusively for natural textures.",
  cta_label: "Shop Now",
};

export const hairFashionAboutDefaults = {
  title: "The Lush Roots difference",
  body: "Premium virgin hair extensions and care crafted exclusively for natural textures.",
};

const styleTiles = [
  { label: "Ponytails & buns", image_url: hairFashionTemplateImages.styles[0] },
  { label: "Headband wigs", image_url: hairFashionTemplateImages.styles[1] },
  { label: "Clip-ins", image_url: hairFashionTemplateImages.styles[2] },
];

export function buildHairFashionHomeBlocks(storefront: StorefrontContent): StorefrontBlock[] {
  return [
    {
      id: "hero-main",
      type: "hero",
      props: {
        headline: storefront.hero.headline || hairFashionHeroDefaults.headline,
        subheadline: storefront.hero.subheadline || hairFashionHeroDefaults.subheadline,
        cta_label: storefront.hero.cta_label || hairFashionHeroDefaults.cta_label,
        cta_href: "/products",
        image_url: storefront.media?.hero_image_url ?? hairFashionTemplateImages.hero,
        layout: "split",
      },
    },
    {
      id: "perfect-match",
      type: "cta_banner",
      props: {
        title: "The perfect match.",
        body: "Our signature textures are created to blend flawlessly with the natural curls, coils, and kinks you were born with.",
        cta_label: "Shop Extensions",
        cta_href: "/products",
        image_url: hairFashionTemplateImages.match,
        layout: "text_left",
      },
    },
    {
      id: "extensions-kit",
      type: "cta_banner",
      props: {
        title: "Perfect extensions kit.",
        body: "Our texture-tailored maintenance kits are specially formulated to meet the needs of hair extensions wearers everywhere.",
        cta_label: "Shop Extensions Care",
        cta_href: "/products",
        image_url: hairFashionTemplateImages.kit,
        layout: "text_right",
      },
    },
    {
      id: "difference",
      type: "feature_grid",
      props: {
        title: "the lush roots difference",
        body: "Why over 250,000 women believe in and trust the Lush Roots difference.",
        items: [
          {
            title: "Uncompromised Quality",
            body: "Beautiful extensions crafted with care that really last.",
          },
          {
            title: "Black-Owned & Operated",
            body: "Built by naturals, for naturals — we know what your hair needs.",
          },
          {
            title: "Curl Pattern Pioneers",
            body: "Original natural hair extensions with next-level textures.",
          },
          {
            title: "Ethically Sourced",
            body: "Virgin hair from an honest, fair collection process.",
          },
        ],
      },
    },
    {
      id: "choose-style",
      type: "category_showcase",
      props: {
        title: "Choose your style",
        layout: "style_tiles",
        items: [
          {
            label: "Wefted hair & closures",
            image_url: hairFashionTemplateImages.styles[2],
            cta_label: "Shop Now",
          },
          ...styleTiles.map((tile) => ({
            label: tile.label,
            image_url: tile.image_url,
          })),
        ],
      },
    },
    {
      id: "bestsellers",
      type: "product_grid",
      props: {
        title: "Best sellers",
        limit: 4,
      },
    },
    {
      id: "newsletter",
      type: "cta_banner",
      props: {
        title: "stay in the loop",
        body: "Get first access to new textures, restocks, and styling tips crafted for your curls.",
        cta_label: "Subscribe",
        cta_href: "#",
        layout: "text_left",
      },
    },
    {
      id: "home-faq",
      type: "faq",
      props: {
        title: storefront.pages?.faq?.title ?? hairFashionFaqDefaults.title,
        items: storefront.pages?.faq?.items?.length
          ? storefront.pages.faq.items
          : hairFashionFaqDefaults.items,
      },
    },
  ];
}

export function applyHairFashionTemplatePreset(
  content: StorefrontContent,
  brandColor?: string | null,
): StorefrontContent {
  const palette = getDefaultStorefrontPalette("hair-and-fashion", brandColor ?? undefined);
  const hero = hairFashionHeroDefaults;
  const about = hairFashionAboutDefaults;

  const next = seedTemplatePages(
    {
      ...content,
      template: { id: "hair-and-fashion", source: "merchant_selected" },
      palette,
      data_plugs: { home_products_source: "theme_products" },
      hero,
      about,
      media: {
        ...content.media,
        hero_image_url: hairFashionTemplateImages.hero,
      },
      navigation: [...hairFashionNavItems],
    },
    "hair-and-fashion",
    {
      about,
      contact: hairFashionContactDefaults,
      faq: hairFashionFaqDefaults,
      value_props: hairFashionValueProps,
    },
  );

  next.pages = {
    ...next.pages,
    home: { blocks: buildHairFashionHomeBlocks(next) },
  };

  return next;
}
