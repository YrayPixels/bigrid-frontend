import type { StoreProduct } from "@/lib/api/types";

export const cosmeticsCategories = [
  "Best sellers",
  "Cleansers",
  "Serums",
  "Moisturisers",
  "Routine kits",
];

export const cosmeticsTemplateImages = {
  hero: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1800&q=90",
  cleanser:
    "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=1300&q=90",
  serum:
    "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=1300&q=90",
  about:
    "https://images.unsplash.com/photo-1612817288484-6f916006741a?auto=format&fit=crop&w=1400&q=90",
  cactus:
    "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=900&q=88",
  products: [
    "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1617897903246-719242758050?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=88",
  ],
};

export const cosmeticsFallbackProducts: StoreProduct[] = [
  {
    id: "cosmetics-fallback-1",
    slug: "botanical-gel-cleanser",
    name: "Botanical Gel Cleanser",
    description: "A gentle daily cleanser that leaves skin fresh, soft, and balanced.",
    price: 18500,
    currency: "NGN",
    image_url: cosmeticsTemplateImages.products[0],
    category: "Cleansers",
    perks: ["100% organic", "Low-foam cleanse", "Daily use"],
  },
  {
    id: "cosmetics-fallback-2",
    slug: "glow-repair-serum",
    name: "Glow Repair Serum",
    description: "Lightweight botanical actives for visible radiance and hydration.",
    price: 24000,
    currency: "NGN",
    image_url: cosmeticsTemplateImages.products[1],
    category: "Serums",
    perks: ["Clinical feel", "Fast absorbing", "Herbal extracts"],
  },
  {
    id: "cosmetics-fallback-3",
    slug: "calm-barrier-cream",
    name: "Calm Barrier Cream",
    description: "A cushiony moisturiser for stronger-feeling, comfortable skin.",
    price: 21000,
    currency: "NGN",
    image_url: cosmeticsTemplateImages.products[2],
    category: "Moisturisers",
    perks: ["Barrier care", "Soft finish", "Fragrance light"],
  },
  {
    id: "cosmetics-fallback-4",
    slug: "daily-radiance-kit",
    name: "Daily Radiance Kit",
    description: "Cleanser, serum, and cream curated for a simple morning ritual.",
    price: 52000,
    currency: "NGN",
    image_url: cosmeticsTemplateImages.products[3],
    category: "Routine kits",
    perks: ["Three-step routine", "Best value", "Gift ready"],
  },
  {
    id: "cosmetics-fallback-5",
    slug: "hydrating-face-mist",
    name: "Hydrating Face Mist",
    description: "A refreshing mist for post-cleanse hydration and midday glow.",
    price: 13500,
    currency: "NGN",
    image_url: cosmeticsTemplateImages.products[4],
    category: "Serums",
    perks: ["Dewy finish", "Plant water", "Travel friendly"],
  },
  {
    id: "cosmetics-fallback-6",
    slug: "soft-polish-mask",
    name: "Soft Polish Mask",
    description: "A weekly treatment that smooths texture without stripping skin.",
    price: 22500,
    currency: "NGN",
    image_url: cosmeticsTemplateImages.products[5],
    category: "Cleansers",
    perks: ["Weekly reset", "Gentle polish", "Fresh glow"],
  },
];
