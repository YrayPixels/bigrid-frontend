import type { StoreProduct } from "@/lib/api/types";

export const beautyCategories = [
  "All textures",
  "Wefted hair",
  "Closures",
  "Ponytails",
  "Care kits",
];

export const beautyTemplateImages = {
  hero: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1800&q=90",
  about:
    "https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?auto=format&fit=crop&w=1200&q=90",
  texture:
    "https://images.unsplash.com/photo-1519415943484-9fa1873496d4?auto=format&fit=crop&w=1600&q=90",
  careKit:
    "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?auto=format&fit=crop&w=1200&q=90",
  styles: [
    "https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=88",
  ],
  products: [
    "https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1519415943484-9fa1873496d4?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=900&q=88",
    "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=88",
  ],
};

export const beautyFallbackProducts: StoreProduct[] = [
  {
    id: "beauty-fallback-1",
    slug: "virgin-curl-bundles",
    name: "The Kurl Wefted Hair",
    description: "Premium virgin curls with soft, natural volume.",
    price: 68000,
    currency: "NGN",
    image_url: beautyTemplateImages.products[0],
    category: "Wefted hair",
  },
  {
    id: "beauty-fallback-2",
    slug: "kurl-closure",
    name: "The Kurl Closure",
    description: "A seamless closure for fuller protective styling.",
    price: 42000,
    currency: "NGN",
    image_url: beautyTemplateImages.products[1],
    category: "Closures",
  },
  {
    id: "beauty-fallback-3",
    slug: "natural-clip-in-set",
    name: "Natural Clip-in Set",
    description: "Easy volume for blowouts, twist-outs, and defined curls.",
    price: 56000,
    currency: "NGN",
    image_url: beautyTemplateImages.products[2],
    category: "All textures",
  },
  {
    id: "beauty-fallback-4",
    slug: "sleek-pony-extension",
    name: "Sleek Pony Extension",
    description: "A polished ponytail extension for quick styling.",
    price: 38500,
    currency: "NGN",
    image_url: beautyTemplateImages.products[3],
    category: "Ponytails",
  },
  {
    id: "beauty-fallback-5",
    slug: "extensions-care-kit",
    name: "Extensions Care Kit",
    description: "Cleanse, condition, and protect every install.",
    price: 14200,
    currency: "NGN",
    image_url: beautyTemplateImages.products[4],
    category: "Care kits",
  },
  {
    id: "beauty-fallback-6",
    slug: "curly-bundle-set",
    name: "Curly Bundle Set",
    description: "Full-body curls bundled for a complete look.",
    price: 99000,
    currency: "NGN",
    image_url: beautyTemplateImages.products[5],
    category: "Wefted hair",
  },
];
