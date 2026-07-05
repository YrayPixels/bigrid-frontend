import type { StoreProduct } from "@/lib/api/types";

const base = "/storefront-templates/hair-and-fashion";

export const hairFashionNavItems = [
  { label: "Shop", href: "/products" },
  { label: "About", href: "/about" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
] as const;

export const hairFashionFooterColumns = [
  {
    title: "Shop",
    links: [{ label: "All products", href: "/products" }],
  },
  {
    title: "Support",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "FAQ", href: "/faq" },
      { label: "Privacy policy", href: "/privacy-policy" },
    ],
  },
] as const;

export const hairFashionTemplateImages = {
  hero: `${base}/hero.jpg`,
  match: `${base}/match.jpg`,
  kit: `${base}/kit.jpg`,
  textureBg: `${base}/texture-bg.jpg`,
  styles: [`${base}/style-1.jpg`, `${base}/style-2.jpg`, `${base}/style-3.jpg`],
  products: [
    `${base}/product-1.jpg`,
    `${base}/product-2.jpg`,
    `${base}/product-3.jpg`,
    `${base}/product-4.jpg`,
  ],
};

export const hairFashionDifferences = [
  {
    number: "01",
    title: "Uncompromised Quality",
    body: "To us, quality is everything. We know the difference between a 'quick fix' and a transformative product crafted with care. Our priority is to offer you beautiful extensions that really last.",
  },
  {
    number: "02",
    title: "Black-Owned & Operated",
    body: "The Black women behind Lush Roots are naturals, just like you. We know what's needed to achieve the perfect look and will stop at nothing to give it to you. We deserve it, after all.",
  },
  {
    number: "03",
    title: "Curl Pattern Pioneers",
    body: "We're the creators and tastemakers of the original natural hair extensions movement. Nine years in, we continue to innovate, so that you always get next-level styles ahead of the rest.",
  },
  {
    number: "04",
    title: "Ethically Sourced",
    body: "We know where our virgin hair comes from because we own the factory that creates our signature textures. From our honest and fair donor collection process to our multi-step filtration methods, we ensure our products are made the right way.",
  },
];

export const hairFashionProductTags: Record<string, string> = {
  "for-kurls-wefted": "for kurls",
  "for-koils-wefted": "for koils",
  "for-kinks-clip-ins": "for kinks",
  "for-kurls-clip-ins": "for kurls",
};

export const hairFashionValueProps = hairFashionDifferences.slice(0, 3).map((item) => ({
  title: item.title,
  body: item.body,
}));

export const hairFashionContactDefaults = {
  title: "We're here to help",
  body: "Questions about textures, orders, or extensions care? Send us a message and our team will reply shortly.",
};

export const hairFashionFaqDefaults = {
  title: "Frequently asked questions",
  items: [
    {
      question: "How do I choose the right texture?",
      answer: "Match our texture names to your natural curl pattern — Kurls, Koils, and Kinks — or contact us for a recommendation.",
    },
    {
      question: "How long do your extensions last?",
      answer: "With proper care, our virgin hair extensions can last 12 months or longer depending on install and maintenance.",
    },
    {
      question: "Can I color or heat-style the hair?",
      answer: "Yes. Our virgin textures can be colored and heat-styled. Always use a heat protectant and follow our care guide.",
    },
    {
      question: "What is your shipping policy?",
      answer: "Orders ship within 2–4 business days. Tracking is sent by email once your package is on the way.",
    },
  ],
};

export const hairFashionFallbackProducts: StoreProduct[] = [
  {
    id: "hair-fallback-1",
    slug: "for-kurls-wefted",
    name: '"For Kurls" Wefted Hair',
    description: "Virgin texture made to blend with natural curls.",
    price: 18900,
    currency: "USD",
    image_url: `${base}/product-1.jpg`,
  },
  {
    id: "hair-fallback-2",
    slug: "for-koils-wefted",
    name: '"For Koils" Wefted Hair',
    description: "Soft coils with movement and longevity.",
    price: 18900,
    currency: "USD",
    image_url: `${base}/product-2.jpg`,
  },
  {
    id: "hair-fallback-3",
    slug: "for-kinks-clip-ins",
    name: '"For Kinks" Clip-Ins',
    description: "Easy-install clip-ins for natural kinks.",
    price: 18900,
    currency: "USD",
    image_url: `${base}/product-3.jpg`,
  },
  {
    id: "hair-fallback-4",
    slug: "for-kurls-clip-ins",
    name: '"For Kurls" Clip-Ins',
    description: "Blendable clip-ins for curl patterns.",
    price: 18900,
    currency: "USD",
    image_url: `${base}/product-4.jpg`,
  },
];
