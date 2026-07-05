import type { StorefrontContent } from "@/lib/api/types";
import type { StorefrontBlock } from "@/lib/storefront/blocks/types";
import {
  furnitureHardwareCategories,
  furnitureHardwareContactDefaults,
  furnitureHardwareFaqDefaults,
  furnitureHardwareRooms,
  furnitureHardwareTemplateImages,
  furnitureHardwareValueProps,
} from "@/lib/storefront/furniture-hardware-defaults";
import { getDefaultStorefrontPalette } from "@/lib/storefront/template";
import { seedTemplatePages } from "@/lib/storefront/template-presets/seed-pages";

export const furnitureHardwareHeroDefaults = {
  headline: "Modern\n& Elegant",
  subheadline:
    "Thoughtfully crafted furniture that blends timeless design, everyday comfort, and lasting quality.",
  cta_label: "Buy now",
};

export const furnitureHardwareAboutDefaults = {
  title: "Crafted for modern living",
  body: "Furniture designed to blend timeless silhouettes with the calm of modern living.",
};

export function buildFurnitureHardwareHomeBlocks(storefront: StorefrontContent): StorefrontBlock[] {
  return [
    {
      id: "hero-main",
      type: "hero",
      props: {
        headline: storefront.hero.headline || furnitureHardwareHeroDefaults.headline,
        subheadline: storefront.hero.subheadline || furnitureHardwareHeroDefaults.subheadline,
        cta_label: storefront.hero.cta_label || furnitureHardwareHeroDefaults.cta_label,
        cta_href: "/products",
        image_url: storefront.media?.hero_image_url ?? furnitureHardwareTemplateImages.hero,
        layout: "split",
      },
    },
    {
      id: "collections",
      type: "category_showcase",
      props: {
        title: "Discover Our Curated Collections",
        layout: "editorial_grid",
        items: furnitureHardwareCategories.map((category) => ({
          label: category.name,
          image_url: category.image,
          cta_label: `${category.count} Products`,
        })),
      },
    },
    {
      id: "new-arrivals",
      type: "product_grid",
      props: {
        title: "New Arrivals",
        limit: 4,
      },
    },
    {
      id: "modern-form",
      type: "cta_banner",
      props: {
        eyebrow: "New Season Edit",
        title: "Modern Form Collection",
        body: "Designed for contemporary living. Minimal shapes, natural materials, and refined details come together to create furniture that feels calm, functional, and timeless.",
        cta_label: "View All",
        cta_href: "/products",
        image_url: furnitureHardwareTemplateImages.collection,
        layout: "text_left",
      },
    },
    {
      id: "rooms",
      type: "category_showcase",
      props: {
        title: "Style your space by room",
        layout: "compact_grid",
        items: furnitureHardwareRooms.map((room) => ({
          label: room.name,
          image_url: room.image,
          cta_label: room.copy,
        })),
      },
    },
    {
      id: "reviews",
      type: "feature_grid",
      props: {
        title: "Crafted & Loved",
        body: "Customer stories from homes styled with ÉLAVÉ pieces.",
        items: [
          {
            title: "Amelia Carter",
            body: "The craftsmanship is absolutely beautiful. The carved details and balanced design instantly elevated my space.",
          },
          {
            title: "Daniel Morrison",
            body: "Every guest notices these pieces the moment they walk in. The quality, texture, and finish speak for themselves.",
          },
          {
            title: "Lina Farrow",
            body: "I fell in love the moment I placed it in my home. A piece that truly grows with your space.",
          },
        ],
      },
    },
    {
      id: "home-faq",
      type: "faq",
      props: {
        title: storefront.pages?.faq?.title ?? furnitureHardwareFaqDefaults.title,
        items: storefront.pages?.faq?.items?.length
          ? storefront.pages.faq.items
          : furnitureHardwareFaqDefaults.items,
      },
    },
  ];
}

export function applyFurnitureHardwareTemplatePreset(
  content: StorefrontContent,
  brandColor?: string | null,
): StorefrontContent {
  const palette = getDefaultStorefrontPalette("furniture-hardware", brandColor ?? undefined);
  const hero = furnitureHardwareHeroDefaults;
  const about = furnitureHardwareAboutDefaults;

  const next = seedTemplatePages(
    {
      ...content,
      template: { id: "furniture-hardware", source: "merchant_selected" },
      palette,
      data_plugs: { home_products_source: "theme_products" },
      hero,
      about,
      media: {
        ...content.media,
        hero_image_url: furnitureHardwareTemplateImages.hero,
      },
    },
    "furniture-hardware",
    {
      about,
      contact: furnitureHardwareContactDefaults,
      faq: furnitureHardwareFaqDefaults,
      value_props: furnitureHardwareValueProps,
    },
  );

  next.pages = {
    ...next.pages,
    home: { blocks: buildFurnitureHardwareHomeBlocks(next) },
  };

  return next;
}
