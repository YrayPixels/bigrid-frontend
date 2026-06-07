import type { StoreProduct } from "@/lib/api/types";

export const minimalisticCategories = [
  "All Products",
  "Beauty",
  "Gut & Digestion",
  "Brain Health",
  "Sleep & Stress",
];

export const minimalisticTemplateImages = {
  hero: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=1800&q=90",
  about:
    "https://images.unsplash.com/photo-1543362906-acfc16c67564?auto=format&fit=crop&w=1200&q=90",
  lifestyle:
    "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=88",
  products: [
    "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=900&q=88",
  ],
};

export const minimalisticFallbackProducts: StoreProduct[] = [
  {
    id: "minimalistic-fallback-1",
    slug: "hair-skin-gummies",
    name: "Hair+ Skin Gummies",
    description: "Glow from within with a daily beauty blend.",
    price: 27500,
    currency: "NGN",
    image_url: minimalisticTemplateImages.products[0],
    category: "Beauty",
  },
  {
    id: "minimalistic-fallback-2",
    slug: "gut-well-probiotic",
    name: "Gut Well Probiotic",
    description: "Daily digestive balance with clean cultures.",
    price: 28999,
    currency: "NGN",
    image_url: minimalisticTemplateImages.products[1],
    category: "Gut & Digestion",
  },
  {
    id: "minimalistic-fallback-3",
    slug: "focus-max-nootropic",
    name: "Focus Max Nootropic",
    description: "Enhance clarity and brain power.",
    price: 32000,
    currency: "NGN",
    image_url: minimalisticTemplateImages.products[2],
    category: "Brain Health",
  },
  {
    id: "minimalistic-fallback-4",
    slug: "sleep-ease-formula",
    name: "Sleep Ease Formula",
    description: "Restful nights, naturally.",
    price: 24999,
    currency: "NGN",
    image_url: minimalisticTemplateImages.products[3],
    category: "Sleep & Stress",
  },
  {
    id: "minimalistic-fallback-5",
    slug: "immuni-guard-pills",
    name: "Immuni Guard Pills",
    description: "Boost immunity daily.",
    price: 26999,
    currency: "NGN",
    image_url: minimalisticTemplateImages.products[4],
    category: "Beauty",
  },
  {
    id: "minimalistic-fallback-6",
    slug: "energy-capsules",
    name: "Energy+ Capsules",
    description: "Boost natural energy and focus.",
    price: 29999,
    currency: "NGN",
    image_url: minimalisticTemplateImages.products[5],
    category: "Brain Health",
  },
];
