import type { StorefrontContent, StorefrontTemplateId } from "@/lib/api/types";
import { beautyTemplateImages } from "@/lib/storefront/beauty-defaults";
import { cosmeticsTemplateImages } from "@/lib/storefront/cosmetics-defaults";
import { fashionTemplateImages } from "@/lib/storefront/fashion-defaults";
import { minimalisticTemplateImages } from "@/lib/storefront/minimalistic-defaults";

export function stockImagesForTemplate(templateId: StorefrontTemplateId): {
  hero: string;
  about: string;
} {
  switch (templateId) {
    case "cosmetics":
      return { hero: cosmeticsTemplateImages.hero, about: cosmeticsTemplateImages.about };
    case "beauty":
      return { hero: beautyTemplateImages.hero, about: beautyTemplateImages.about };
    case "fashion_lookbook":
      return { hero: fashionTemplateImages.hero, about: fashionTemplateImages.about };
    case "minimalistic":
      return { hero: minimalisticTemplateImages.hero, about: minimalisticTemplateImages.about };
    default:
      return { hero: cosmeticsTemplateImages.hero, about: cosmeticsTemplateImages.about };
  }
}

export function applyStockImagesToStorefront(
  storefront: StorefrontContent,
  templateId: StorefrontTemplateId,
): { storefront: StorefrontContent; changed_paths: string[] } {
  const next = structuredClone(storefront);
  const stock = stockImagesForTemplate(templateId);
  next.media = {
    ...next.media,
    hero_image_url: stock.hero,
    about_image_url: stock.about,
  };
  return {
    storefront: next,
    changed_paths: ["media.hero_image_url", "media.about_image_url"],
  };
}
