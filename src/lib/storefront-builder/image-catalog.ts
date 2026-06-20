import type { Industry } from "@/lib/api/types";

export type ImageCatalogSection = "hero" | "about" | "product" | "lifestyle";

export type ImageCatalogEntry = {
  id: string;
  url: string;
  label: string;
  section: ImageCatalogSection;
  tags: string[];
  industries: Industry[];
};

/** Curated Unsplash images the AI can pick from — no API key required. */
export const WEBSITE_IMAGE_CATALOG: ImageCatalogEntry[] = [
  {
    id: "cosmetics-hero-botanical",
    url: "https://images.unsplash.com/photo-1749599018738-b8fb6c4a83e0?auto=format&fit=crop&w=1800&q=90",
    label: "Botanical skincare flat lay",
    section: "hero",
    tags: ["skincare", "botanical", "natural", "green", "serum", "cosmetics", "clean"],
    industries: ["beauty_and_skincare"],
  },
  {
    id: "cosmetics-about-studio",
    url: "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=1400&q=90",
    label: "Soft beauty studio",
    section: "about",
    tags: ["beauty", "studio", "soft", "premium", "cosmetics", "spa"],
    industries: ["beauty_and_skincare"],
  },
  {
    id: "beauty-hero-texture",
    url: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1800&q=90",
    label: "Hair texture portrait",
    section: "hero",
    tags: ["hair", "beauty", "texture", "portrait", "salon", "glam"],
    industries: ["beauty_and_skincare", "fashion_and_apparel"],
  },
  {
    id: "beauty-about-mirror",
    url: "https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?auto=format&fit=crop&w=1200&q=90",
    label: "Vanity and self-care",
    section: "about",
    tags: ["beauty", "mirror", "self-care", "makeup", "routine"],
    industries: ["beauty_and_skincare"],
  },
  {
    id: "fashion-hero-editorial",
    url: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1800&q=90",
    label: "Editorial fashion portrait",
    section: "hero",
    tags: ["fashion", "editorial", "streetwear", "bold", "lookbook"],
    industries: ["fashion_and_apparel"],
  },
  {
    id: "fashion-about-rack",
    url: "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1400&q=90",
    label: "Curated clothing rack",
    section: "about",
    tags: ["fashion", "apparel", "boutique", "clothing", "retail"],
    industries: ["fashion_and_apparel"],
  },
  {
    id: "minimal-hero-product",
    url: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=1800&q=90",
    label: "Minimal product on shelf",
    section: "hero",
    tags: ["minimal", "clean", "product", "calm", "neutral", "home"],
    industries: ["home_and_living", "other"],
  },
  {
    id: "minimal-about-interior",
    url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1400&q=90",
    label: "Calm interior scene",
    section: "about",
    tags: ["minimal", "interior", "home", "warm", "lifestyle"],
    industries: ["home_and_living"],
  },
  {
    id: "food-hero-coffee",
    url: "https://images.unsplash.com/photo-1495474472284-4d089bcbc360?auto=format&fit=crop&w=1800&q=90",
    label: "Artisan coffee spread",
    section: "hero",
    tags: ["coffee", "cafe", "food", "warm", "artisan", "beverage"],
    industries: ["food_and_beverage"],
  },
  {
    id: "food-about-kitchen",
    url: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1400&q=90",
    label: "Kitchen prep scene",
    section: "about",
    tags: ["food", "kitchen", "cooking", "fresh", "artisan"],
    industries: ["food_and_beverage"],
  },
  {
    id: "candles-hero-cozy",
    url: "https://images.unsplash.com/photo-1602602433660-cf7e3e85476d?auto=format&fit=crop&w=1800&q=90",
    label: "Cozy candle glow",
    section: "hero",
    tags: ["candles", "cozy", "warm", "gift", "home", "handmade"],
    industries: ["home_and_living", "other"],
  },
  {
    id: "candles-about-craft",
    url: "https://images.unsplash.com/photo-1578778770432-5185130f9428?auto=format&fit=crop&w=1400&q=90",
    label: "Handmade candle craft",
    section: "about",
    tags: ["candles", "craft", "artisan", "maker", "warm"],
    industries: ["home_and_living", "other"],
  },
  {
    id: "jewelry-hero-macro",
    url: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1800&q=90",
    label: "Fine jewelry macro",
    section: "hero",
    tags: ["jewelry", "luxury", "gold", "premium", "accessories"],
    industries: ["fashion_and_apparel", "other"],
  },
  {
    id: "tech-hero-device",
    url: "https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1800&q=90",
    label: "Clean desk tech setup",
    section: "hero",
    tags: ["tech", "electronics", "modern", "workspace", "gadgets"],
    industries: ["electronics"],
  },
  {
    id: "services-hero-team",
    url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1800&q=90",
    label: "Collaborative team",
    section: "hero",
    tags: ["services", "team", "professional", "consulting", "business"],
    industries: ["services"],
  },
  {
    id: "services-about-office",
    url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=90",
    label: "Bright modern office",
    section: "about",
    tags: ["services", "office", "professional", "trust", "business"],
    industries: ["services"],
  },
  {
    id: "lifestyle-woman-natural",
    url: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1800&q=90",
    label: "Natural lifestyle portrait",
    section: "lifestyle",
    tags: ["lifestyle", "natural", "wellness", "woman", "soft"],
    industries: ["beauty_and_skincare", "other"],
  },
  {
    id: "product-grid-skincare",
    url: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1400&q=90",
    label: "Skincare product lineup",
    section: "product",
    tags: ["skincare", "products", "serum", "bottles", "cosmetics"],
    industries: ["beauty_and_skincare"],
  },
  {
    id: "product-serum-bottle",
    url: "https://images.unsplash.com/photo-1761775247546-89950362a39b?auto=format&fit=crop&w=1000&q=90",
    label: "Serum bottle close-up",
    section: "product",
    tags: ["serum", "skincare", "product", "cosmetics"],
    industries: ["beauty_and_skincare"],
  },
  {
    id: "product-cleanser-tube",
    url: "https://images.unsplash.com/photo-1749599018738-b8fb6c4a83e0?auto=format&fit=crop&w=1000&q=90",
    label: "Cleanser product shot",
    section: "product",
    tags: ["cleanser", "skincare", "product"],
    industries: ["beauty_and_skincare"],
  },
  {
    id: "product-botanical-jar",
    url: "https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=900&q=88",
    label: "Botanical cream jar",
    section: "product",
    tags: ["cream", "botanical", "product", "natural"],
    industries: ["beauty_and_skincare"],
  },
  {
    id: "product-hair-care",
    url: "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=900&q=88",
    label: "Hair care product",
    section: "product",
    tags: ["hair", "beauty", "product"],
    industries: ["beauty_and_skincare"],
  },
  {
    id: "product-fashion-apparel",
    url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=88",
    label: "Fashion apparel flat lay",
    section: "product",
    tags: ["fashion", "apparel", "clothing", "product"],
    industries: ["fashion_and_apparel"],
  },
  {
    id: "product-home-goods",
    url: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=88",
    label: "Home goods styling",
    section: "product",
    tags: ["home", "decor", "product", "lifestyle"],
    industries: ["home_and_living"],
  },
  {
    id: "product-food-artisan",
    url: "https://images.unsplash.com/photo-1495474472284-4d089bcbc360?auto=format&fit=crop&w=900&q=88",
    label: "Artisan food product",
    section: "product",
    tags: ["food", "artisan", "product", "cafe"],
    industries: ["food_and_beverage"],
  },
  {
    id: "promo-cactus-botanical",
    url: "https://images.unsplash.com/photo-1766712245912-d248d2cc2ff1?auto=format&fit=crop&w=1000&q=90",
    label: "Botanical accent",
    section: "lifestyle",
    tags: ["botanical", "green", "natural", "promo", "accent"],
    industries: ["beauty_and_skincare", "home_and_living"],
  },
];

export function catalogEntryById(id: string): ImageCatalogEntry | undefined {
  return WEBSITE_IMAGE_CATALOG.find((entry) => entry.id === id);
}

export function catalogEntriesBySection(section: ImageCatalogSection): ImageCatalogEntry[] {
  return WEBSITE_IMAGE_CATALOG.filter((entry) => entry.section === section);
}

export function catalogEntriesForIndustry(industry?: Industry | string | null): ImageCatalogEntry[] {
  if (!industry) return WEBSITE_IMAGE_CATALOG;
  return WEBSITE_IMAGE_CATALOG.filter(
    (entry) => entry.industries.includes(industry as Industry) || entry.industries.includes("other"),
  );
}

export function catalogForAiPrompt(): Array<{
  id: string;
  label: string;
  section: ImageCatalogSection;
  tags: string[];
  industries: Industry[];
}> {
  return WEBSITE_IMAGE_CATALOG.map(({ id, label, section, tags, industries }) => ({
    id,
    label,
    section,
    tags,
    industries,
  }));
}

export const FREE_IMAGE_SOURCE_LINKS = [
  { label: "Unsplash", base: "https://unsplash.com/s/photos/" },
  { label: "Pexels", base: "https://www.pexels.com/search/" },
  { label: "Pixabay", base: "https://pixabay.com/images/search/" },
] as const;

export function buildImageSearchLinks(terms: string[]): Array<{ label: string; href: string }> {
  const query = encodeURIComponent(terms.slice(0, 3).join(" ").trim() || "small business storefront");
  return FREE_IMAGE_SOURCE_LINKS.map((source) => ({
    label: `Search ${source.label}`,
    href: `${source.base}${query}`,
  }));
}
