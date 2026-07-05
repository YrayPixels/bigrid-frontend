import type { StoreProduct } from "@/lib/api/types";

const base = "/storefront-templates/furniture-hardware";

export const furnitureHardwareNavItems = [
  { label: "Products", href: "/products" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
] as const;

export const furnitureHardwareFooterColumns = [
  {
    title: "Shop",
    links: [{ label: "All products", href: "/products" }],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "FAQ", href: "/faq" },
      { label: "Privacy policy", href: "/privacy-policy" },
    ],
  },
] as const;

export const furnitureHardwareTemplateImages = {
  hero: `${base}/hero-chair.jpg`,
  collection: `${base}/collection-modern-form.jpg`,
  categories: {
    chairs: `${base}/cat-chairs.jpg`,
    tables: `${base}/cat-tables.jpg`,
    sofas: `${base}/cat-sofas.jpg`,
    accessories: `${base}/cat-accessories.jpg`,
  },
  rooms: {
    living: `${base}/room-living.jpg`,
    bedroom: `${base}/room-bedroom.jpg`,
    dining: `${base}/room-dining.jpg`,
  },
  products: [
    `${base}/prod-sofa-chair.jpg`,
    `${base}/prod-coffee-table.jpg`,
    `${base}/prod-lamp.jpg`,
    `${base}/prod-blue-chair.jpg`,
  ],
};

export const furnitureHardwareCategories = [
  { name: "Chairs", count: 14, image: furnitureHardwareTemplateImages.categories.chairs },
  { name: "Tables", count: 11, image: furnitureHardwareTemplateImages.categories.tables },
  { name: "Sofas", count: 12, image: furnitureHardwareTemplateImages.categories.sofas },
  { name: "Accessories", count: 22, image: furnitureHardwareTemplateImages.categories.accessories },
];

export const furnitureHardwareRooms = [
  {
    name: "Living Room",
    copy: "Create a cozy, stylish space you'll love spending time in.",
    image: furnitureHardwareTemplateImages.rooms.living,
  },
  {
    name: "Bedroom",
    copy: "Build a peaceful retreat with comfort-first design.",
    image: furnitureHardwareTemplateImages.rooms.bedroom,
  },
  {
    name: "Dining",
    copy: "Make every meal feel like a gathering worth having.",
    image: furnitureHardwareTemplateImages.rooms.dining,
  },
];

export const furnitureHardwareProductDisplay: Record<
  string,
  { was: number; swatches: string[] }
> = {
  "sofa-savile-row-von": { was: 150, swatches: ["#c6b393", "#5a4633", "#1a1a1a"] },
  "boxford-coffee-table": { was: 160, swatches: ["#a86a3b", "#3a2b21", "#1a1a1a"] },
  "decker-table-lamp": { was: 140, swatches: ["#e8d9b8", "#6b5b3a", "#1a1a1a"] },
  "casa-luxe-rexine-chair": { was: 180, swatches: ["#c9c1b0", "#3a4a6b", "#1e2a4a"] },
};

export const furnitureHardwareReviews = [
  {
    name: "Amelia Carter",
    city: "Melbourne",
    product: "Organic Conference Chair",
    price: 220,
    image: furnitureHardwareTemplateImages.products[0],
    body: "The craftsmanship is absolutely beautiful. The carved details and balanced design instantly elevated my space. It's one of those pieces that quietly steals attention without trying too hard. Truly impressive work.",
  },
  {
    name: "Daniel Morrison",
    city: "Brighton",
    product: "Decker Table Lamp",
    price: 110,
    image: furnitureHardwareTemplateImages.products[2],
    body: "Every guest notices these pieces the moment they walk in. The quality, texture, and finish speak for themselves, adding a refined yet cozy feel to the room. It's design that feels both thoughtful and timeless.",
  },
  {
    name: "Lina Farrow",
    city: "Willow Creek",
    product: "Sofa Savile Row von",
    price: 120,
    image: furnitureHardwareTemplateImages.products[3],
    body: "I fell in love the moment I placed it in my home. The design feels solid, elegant, and full of character — and somehow it looks even better with time. A piece that truly grows with your space.",
  },
];

export const furnitureHardwareValueProps = [
  {
    title: "Thoughtful craftsmanship",
    body: "Every piece is designed with balanced proportions, natural materials, and lasting quality.",
  },
  {
    title: "Room-ready styling",
    body: "Curated collections make it easy to furnish living, bedroom, and dining spaces.",
  },
  {
    title: "Delivery you can trust",
    body: "Careful packaging and reliable shipping so your furniture arrives ready to enjoy.",
  },
];

export const furnitureHardwareContactDefaults = {
  title: "Contact us",
  body: "Questions about an order, delivery, or a piece from our collection? Reach out and our team will get back to you shortly.",
};

export const furnitureHardwareFaqDefaults = {
  title: "Frequently asked questions",
  items: [
    {
      question: "How long does delivery take?",
      answer: "Most furniture orders ship within 5–10 business days. Delivery windows are confirmed after checkout.",
    },
    {
      question: "Do you offer assembly?",
      answer: "Select pieces include straightforward assembly guides. White-glove delivery is available in major cities.",
    },
    {
      question: "What is your return policy?",
      answer: "Unused items in original packaging can be returned within 30 days. Contact us to start a return.",
    },
    {
      question: "How should I care for my furniture?",
      answer: "Use a soft cloth for dusting and avoid direct sunlight or harsh cleaners to preserve finishes.",
    },
  ],
};

export const furnitureHardwareFallbackProducts: StoreProduct[] = [
  {
    id: "furniture-fallback-1",
    slug: "sofa-savile-row-von",
    name: "Sofa Savile Row von",
    description: "A refined wingback silhouette with hand-tailored linen.",
    price: 12000,
    currency: "USD",
    image_url: `${base}/prod-sofa-chair.jpg`,
  },
  {
    id: "furniture-fallback-2",
    slug: "boxford-coffee-table",
    name: "Boxford Coffee Table",
    description: "A sculptural round table with a crossed ash base.",
    price: 13000,
    currency: "USD",
    image_url: `${base}/prod-coffee-table.jpg`,
  },
  {
    id: "furniture-fallback-3",
    slug: "decker-table-lamp",
    name: "Decker Table Lamp",
    description: "A soft-glow ceramic lamp with a linen shade.",
    price: 11000,
    currency: "USD",
    image_url: `${base}/prod-lamp.jpg`,
  },
  {
    id: "furniture-fallback-4",
    slug: "casa-luxe-rexine-chair",
    name: "Casa Luxe Rexine Chair",
    description: "A tufted velvet armchair with rolled arms.",
    price: 15000,
    currency: "USD",
    image_url: `${base}/prod-blue-chair.jpg`,
  },
];
