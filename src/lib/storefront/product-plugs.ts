import type { StoreProduct, StorefrontContent, StorefrontTemplateId } from "@/lib/api/types";
import { beautyFallbackProducts } from "./beauty-defaults";
import { cosmeticsFallbackProducts } from "./cosmetics-defaults";
import { fashionFallbackProducts } from "./fashion-defaults";
import { minimalisticFallbackProducts } from "./minimalistic-defaults";

export type ProductPlugSource = "merchant_products" | "theme_products";

const genericThemeProducts: StoreProduct[] = [
  {
    id: "theme-product-1",
    slug: "signature-item",
    name: "Signature Item",
    description: "A polished starter product for this storefront style.",
    price: 18500,
    currency: "NGN",
    image_url: null,
  },
  {
    id: "theme-product-2",
    slug: "starter-pack",
    name: "Starter Pack",
    description: "A curated bundle merchants can replace with real catalog items.",
    price: 24500,
    currency: "NGN",
    image_url: null,
  },
  {
    id: "theme-product-3",
    slug: "premium-bundle",
    name: "Premium Bundle",
    description: "A flexible product placeholder for premium homepage merchandising.",
    price: 39500,
    currency: "NGN",
    image_url: null,
  },
  {
    id: "theme-product-4",
    slug: "daily-essential",
    name: "Daily Essential",
    description: "A clean placeholder for an everyday customer favourite.",
    price: 16500,
    currency: "NGN",
    image_url: null,
  },
];

export function getProductPlugSource(storefront: StorefrontContent): ProductPlugSource {
  return storefront.data_plugs?.home_products_source ?? "merchant_products";
}

export function getThemeProducts(templateId: StorefrontTemplateId): StoreProduct[] {
  if (templateId === "cosmetics") return cosmeticsFallbackProducts;
  if (templateId === "beauty") return beautyFallbackProducts;
  if (templateId === "fashion_lookbook") return fashionFallbackProducts;
  if (templateId === "minimalistic") return minimalisticFallbackProducts;

  return genericThemeProducts;
}

export function getHomepageProducts(
  storefront: StorefrontContent,
  templateId: StorefrontTemplateId,
  limit: number,
): { products: StoreProduct[]; source: ProductPlugSource } {
  const source = getProductPlugSource(storefront);
  const merchantProducts = storefront.products ?? [];
  const themeProducts = getThemeProducts(templateId);
  const products =
    source === "theme_products" ? themeProducts : [...merchantProducts, ...themeProducts];

  return {
    source,
    products: products.slice(0, limit),
  };
}
