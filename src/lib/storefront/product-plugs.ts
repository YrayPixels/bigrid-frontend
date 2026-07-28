import type { StoreProduct, StorefrontContent, StorefrontTemplateId } from "@/lib/api/types";
import { beautyFallbackProducts } from "./beauty-defaults";
import { cosmeticsFallbackProducts } from "./cosmetics-defaults";
import { fashionFallbackProducts } from "./fashion-defaults";
import { furnitureHardwareFallbackProducts } from "./furniture-hardware-defaults";
import { hairFashionFallbackProducts } from "./hair-fashion-defaults";
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
  if (templateId === "furniture-hardware") return furnitureHardwareFallbackProducts;
  if (templateId === "hair-and-fashion") return hairFashionFallbackProducts;
  if (templateId === "minimalistic") return minimalisticFallbackProducts;

  return genericThemeProducts;
}

/**
 * Seed draft merchant products from template fallbacks when the catalog is empty.
 * Homepage grids and AI image tools always edit these — never theme-only constants.
 */
export function ensureMerchantHomepageProducts(
  storefront: StorefrontContent,
  templateId: StorefrontTemplateId = storefront.template?.id ?? "classic",
  minCount = 4,
): { storefront: StorefrontContent; seeded: boolean } {
  const existing = storefront.products ?? [];
  if (existing.length > 0) {
    const next: StorefrontContent = {
      ...storefront,
      data_plugs: {
        ...storefront.data_plugs,
        home_products_source: "merchant_products",
      },
    };
    return { storefront: next, seeded: false };
  }

  const seeds = getThemeProducts(templateId)
    .slice(0, Math.max(minCount, 4))
    .map((product, index) => ({
      ...product,
      id: product.id?.startsWith("theme-") || !product.id ? `draft-product-${index + 1}` : product.id,
    }));

  return {
    storefront: {
      ...storefront,
      products: seeds,
      data_plugs: {
        ...storefront.data_plugs,
        home_products_source: "merchant_products",
      },
    },
    seeded: seeds.length > 0,
  };
}

/**
 * Homepage product grids always prefer the merchant catalog.
 * Theme products are only a seed source when the catalog is empty.
 * Hidden statuses (draft/archived) never appear in live or builder preview.
 */
export function isStorefrontVisibleProduct(product: StoreProduct): boolean {
  return (product.status ?? "active") === "active";
}

export function getHomepageProducts(
  storefront: StorefrontContent,
  templateId: StorefrontTemplateId,
  limit: number,
): { products: StoreProduct[]; source: ProductPlugSource } {
  const catalogProducts = (storefront.products ?? []).filter(isStorefrontVisibleProduct);

  if (catalogProducts.length > 0) {
    return {
      source: "merchant_products",
      products: catalogProducts.slice(0, limit),
    };
  }

  // Empty catalog: show theme seeds in the live preview, but AI image/text tools
  // should call ensureMerchantHomepageProducts before mutating product images.
  if (getProductPlugSource(storefront) === "theme_products") {
    return {
      source: "theme_products",
      products: getThemeProducts(templateId).slice(0, limit),
    };
  }

  return {
    source: "merchant_products",
    products: [],
  };
}

/** @deprecated Use getHomepageProducts — kept for call-site clarity in block renderers */
export const getProductGridProducts = getHomepageProducts;
