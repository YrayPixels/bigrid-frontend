import prodSofaChair from "@/assets/prod-sofa-chair.jpg";
import prodCoffeeTable from "@/assets/prod-coffee-table.jpg";
import prodLamp from "@/assets/prod-lamp.jpg";
import prodBlueChair from "@/assets/prod-blue-chair.jpg";
import heroChair from "@/assets/hero-chair.jpg";
import roomLiving from "@/assets/room-living.jpg";

export type Product = {
  slug: string;
  name: string;
  price: number;
  was: number;
  category: string;
  img: string;
  gallery: string[];
  swatches: { name: string; hex: string }[];
  sizes: string[];
  rating: number;
  reviewCount: number;
  sku: string;
  stock: number;
  short: string;
  description: string;
  features: string[];
  specs: { label: string; value: string }[];
};

export const products: Product[] = [
  {
    slug: "sofa-savile-row-von",
    name: "Sofa Savile Row von",
    price: 120,
    was: 150,
    category: "Chairs",
    img: prodSofaChair,
    gallery: [prodSofaChair, heroChair, roomLiving, prodBlueChair],
    swatches: [
      { name: "Sand", hex: "#c6b393" },
      { name: "Walnut", hex: "#5a4633" },
      { name: "Onyx", hex: "#1a1a1a" },
    ],
    sizes: ["Compact", "Standard", "Large"],
    rating: 4.8,
    reviewCount: 142,
    sku: "ELV-SSR-01",
    stock: 12,
    short: "A refined wingback silhouette with hand-tailored linen and solid oak legs.",
    description:
      "The Savile Row lounge chair is our take on the classic wingback — quieter proportions, softer curves, and a hand-tailored linen shell that ages into your space. Built on a solid oak frame with high-resilience foam and a slow-return seat, it is designed to feel just as considered on day one as it does ten years in.",
    features: [
      "Hand-tailored belgian linen upholstery",
      "Kiln-dried solid oak legs, hand-finished",
      "High-resilience CertiPUR foam core",
      "Assembled in Portugal by master craftspeople",
    ],
    specs: [
      { label: "Dimensions", value: 'W 32" × D 34" × H 41"' },
      { label: "Seat height", value: '17.5"' },
      { label: "Weight", value: "48 lbs" },
      { label: "Material", value: "Linen, solid oak" },
      { label: "Warranty", value: "10 years" },
      { label: "Ships in", value: "2–3 weeks" },
    ],
  },
  {
    slug: "boxford-coffee-table",
    name: "Boxford Coffee Table",
    price: 130,
    was: 160,
    category: "Tables",
    img: prodCoffeeTable,
    gallery: [prodCoffeeTable, roomLiving, heroChair, prodSofaChair],
    swatches: [
      { name: "Amber", hex: "#a86a3b" },
      { name: "Espresso", hex: "#3a2b21" },
      { name: "Onyx", hex: "#1a1a1a" },
    ],
    sizes: ["Ø 36\"", "Ø 42\"", "Ø 48\""],
    rating: 4.7,
    reviewCount: 88,
    sku: "ELV-BXF-04",
    stock: 7,
    short: "A quietly sculptural round table with a crossed base in blackened ash.",
    description:
      "Boxford pairs a soft-edged round top with a crossed geometric base. Machined from solid ash and hand-finished with a matte protective oil, it holds its own in a minimal room and disappears politely in a busier one.",
    features: [
      "Solid ash, matte protective oil finish",
      "CNC-machined base with hand-sanded edges",
      "Felt floor pads included",
      "FSC-certified sustainably sourced wood",
    ],
    specs: [
      { label: "Dimensions", value: 'Ø 42" × H 16"' },
      { label: "Weight", value: "62 lbs" },
      { label: "Material", value: "Solid ash" },
      { label: "Finish", value: "Matte protective oil" },
      { label: "Warranty", value: "10 years" },
      { label: "Ships in", value: "2–3 weeks" },
    ],
  },
  {
    slug: "decker-table-lamp",
    name: "Decker Table Lamp",
    price: 110,
    was: 140,
    category: "Accessories",
    img: prodLamp,
    gallery: [prodLamp, roomLiving, heroChair, prodCoffeeTable],
    swatches: [
      { name: "Cream", hex: "#e8d9b8" },
      { name: "Clay", hex: "#6b5b3a" },
      { name: "Onyx", hex: "#1a1a1a" },
    ],
    sizes: ["Small", "Medium"],
    rating: 4.9,
    reviewCount: 214,
    sku: "ELV-DKR-02",
    stock: 24,
    short: "A soft-glow ceramic lamp with a hand-stitched linen shade.",
    description:
      "Decker is a study in warm light. A hand-thrown ceramic body carries a linen shade stitched from a single seam, casting a soft, even glow that plays well with warm interiors and cool ones alike.",
    features: [
      "Hand-thrown stoneware base",
      "Single-seam linen shade",
      "In-line dimmer switch",
      "Uses E26 bulb (not included)",
    ],
    specs: [
      { label: "Dimensions", value: 'Ø 12" × H 22"' },
      { label: "Weight", value: "6 lbs" },
      { label: "Material", value: "Stoneware, linen" },
      { label: "Bulb", value: "E26, max 60W" },
      { label: "Warranty", value: "5 years" },
      { label: "Ships in", value: "1–2 weeks" },
    ],
  },
  {
    slug: "casa-luxe-rexine-chair",
    name: "Casa Luxe Rexine Chair",
    price: 150,
    was: 180,
    category: "Chairs",
    img: prodBlueChair,
    gallery: [prodBlueChair, heroChair, roomLiving, prodSofaChair],
    swatches: [
      { name: "Stone", hex: "#c9c1b0" },
      { name: "Slate", hex: "#3a4a6b" },
      { name: "Midnight", hex: "#1e2a4a" },
    ],
    sizes: ["Standard", "Wide"],
    rating: 4.6,
    reviewCount: 96,
    sku: "ELV-CLR-07",
    stock: 5,
    short: "A tufted velvet armchair with rolled arms and warm oak legs.",
    description:
      "Casa Luxe brings a bit of the drawing room home. Deep-buttoned velvet, rolled arms bound in antique nailhead trim, and turned oak legs — restrained, considered, and unmistakably built to be lived in.",
    features: [
      "Deep-buttoned cotton-velvet upholstery",
      "Antique brass nailhead trim, hand-set",
      "Turned solid oak legs",
      "Down-wrapped seat cushion",
    ],
    specs: [
      { label: "Dimensions", value: 'W 34" × D 36" × H 38"' },
      { label: "Seat height", value: '18"' },
      { label: "Weight", value: "56 lbs" },
      { label: "Material", value: "Cotton velvet, oak" },
      { label: "Warranty", value: "10 years" },
      { label: "Ships in", value: "3–4 weeks" },
    ],
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}