import { beautyTemplateImages } from "@/lib/storefront/beauty-defaults";
import { fashionCategories } from "@/lib/storefront/fashion-defaults";
import type { CategoryShowcaseBlockProps, CategoryShowcaseLayout } from "@/lib/storefront/blocks/types";

export function defaultCategoryShowcaseProps(
  layout: CategoryShowcaseLayout = "editorial_grid",
): CategoryShowcaseBlockProps {
  if (layout === "style_tiles") {
    const labels = [
      "Wefted hair & closures",
      "Kinky curl",
      "Blowout volume",
      "Sleek ponytails",
    ];

    return {
      title: "Choose your style",
      layout: "style_tiles",
      items: labels.map((label, index) => ({
        label,
        image_url: beautyTemplateImages.styles[index] ?? null,
      })),
    };
  }

  if (layout === "compact_grid") {
    return {
      title: "Shop by category",
      layout: "compact_grid",
      items: fashionCategories.slice(0, 3).map((category) => ({
        label: category.title,
        image_url: category.image,
      })),
    };
  }

  return {
    title: "Shop the Essentials",
    eyebrow: "Minimal. Comfortable. Timeless.",
    layout: "editorial_grid",
    items: fashionCategories.map((category) => ({
      label: category.title,
      image_url: category.image,
    })),
  };
}

export function categoryShowcaseLayoutForTemplate(templateId: string): CategoryShowcaseLayout {
  if (templateId === "beauty") return "style_tiles";
  if (templateId === "minimalistic" || templateId === "classic") return "compact_grid";
  return "editorial_grid";
}
