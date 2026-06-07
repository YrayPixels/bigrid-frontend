import type { StoreProduct } from "@/lib/api/types";

export const fashionCategories = [
  {
    title: "Hoodies",
    image:
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=900&q=85",
  },
  {
    title: "Sweatshirts",
    image:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=85",
  },
  {
    title: "T-Shirts",
    image:
      "https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=900&q=85",
  },
  {
    title: "Everyday Basics",
    image:
      "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=900&q=85",
  },
];

export const fashionTemplateImages = {
  hero: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1800&q=90",
  about:
    "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=90",
  products: [
    "https://images.unsplash.com/photo-1523398002811-999ca8dec234?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1554568218-0f1715e72254?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&w=900&q=88",
  ],
};

export const fashionFallbackProducts: StoreProduct[] = [
  {
    id: "fashion-fallback-1",
    slug: "oversized-hoodie",
    name: "Oversized Hoodie",
    description: "A relaxed everyday hoodie cut for comfort and layering.",
    price: 28500,
    currency: "NGN",
    image_url: null,
  },
  {
    id: "fashion-fallback-2",
    slug: "wide-leg-trouser",
    name: "Wide Leg Trouser",
    description: "A clean staple trouser with an easy drape and polished finish.",
    price: 32500,
    currency: "NGN",
    image_url: null,
  },
  {
    id: "fashion-fallback-3",
    slug: "zip-sweatshirt",
    name: "Zip Sweatshirt",
    description: "A versatile midweight layer for weekday fits and weekend plans.",
    price: 24800,
    currency: "NGN",
    image_url: null,
  },
  {
    id: "fashion-fallback-4",
    slug: "cotton-tee",
    name: "Cotton Tee",
    description: "A soft essential tee with a neat shape and breathable feel.",
    price: 14500,
    currency: "NGN",
    image_url: null,
  },
];
