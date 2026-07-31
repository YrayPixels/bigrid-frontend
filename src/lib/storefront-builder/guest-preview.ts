import type {
  Industry,
  Store,
  StoreProduct,
  StorefrontContent,
  StorefrontTemplateId,
  StorefrontTemplateRecommendation,
} from "@/lib/api/types";
import { STOREFRONT_TEMPLATE_OPTIONS } from "@/lib/api/types";
import {
  applyStorefrontEditAsync,
  extractBusinessProfile,
  profileToStore,
  resolveSelectedTemplateId,
  resolveTemplateFromMessage,
  sanitizeBusinessProfile,
  synthesizeStorefront,
} from "@/lib/storefront-builder/local-ai";
import {
  formatUnsplashPhotoUrl,
  searchUnsplashPhotosDirect,
} from "@/lib/storefront-builder/unsplash-client";
import { ensureHomeBlocksOnStorefront } from "@/lib/storefront/blocks/sync-legacy";
import {
  GUEST_PREVIEW_PRODUCT_COUNT,
  createGuestChatSession,
  makeGuestMessage,
  sessionToPreviewPayload,
  type GuestChatProfile,
  type GuestChatSession,
  type GuestPreviewPayload,
} from "@/lib/storefront-builder/guest-preview-types";

export {
  GUEST_PREVIEW_PRODUCT_COUNT,
  GUEST_PREVIEW_STORAGE_KEY,
  createGuestChatSession,
  sessionToPreviewPayload,
  type GuestChatMessage,
  type GuestChatProfile,
  type GuestChatSession,
  type GuestChatStatus,
  type GuestPreviewPayload,
} from "@/lib/storefront-builder/guest-preview-types";

type ProductSeed = {
  name: string;
  description: string;
  price: number;
  category?: string;
  image_query: string;
};

type GuestBrief = {
  business_name: string;
  description: string;
  industry: Industry;
  brand_color: string;
  tone: string[];
  hero_headline: string;
  hero_subheadline: string;
  products: ProductSeed[];
};

const HANDMADE_CLOTHES_SEEDS: ProductSeed[] = [
  { name: "Hand-Stitched Linen Shirt", description: "Breathable linen with visible hand finishing.", price: 28500, category: "Shirts", image_query: "handmade linen shirt" },
  { name: "Tailored Wrap Dress", description: "Soft drape wrap dress made to order.", price: 42500, category: "Dresses", image_query: "handmade wrap dress" },
  { name: "Artisan Cargo Trouser", description: "Utility trouser with careful stitching.", price: 35500, category: "Bottoms", image_query: "handmade cargo trousers" },
  { name: "Quilted Work Jacket", description: "Lightweight jacket with quilted panels.", price: 48500, category: "Outerwear", image_query: "handmade quilted jacket" },
  { name: "Everyday Cotton Tee", description: "Soft cotton tee cut for comfort.", price: 14500, category: "Basics", image_query: "handmade cotton tshirt" },
  { name: "Gathered Midi Skirt", description: "Flowing midi skirt with handmade gathers.", price: 26500, category: "Skirts", image_query: "handmade midi skirt" },
  { name: "Canvas Market Tote", description: "Sturdy tote for markets and weekends.", price: 12500, category: "Bags", image_query: "handmade canvas tote" },
  { name: "Embroidered Cap", description: "Soft cap with hand embroidery.", price: 9500, category: "Accessories", image_query: "embroidered cap handmade" },
  { name: "Wide-Leg Culottes", description: "Easy wide-leg cut for warm days.", price: 29500, category: "Bottoms", image_query: "handmade culottes" },
  { name: "Studio Apron", description: "Maker apron with deep utility pockets.", price: 18500, category: "Studio", image_query: "handmade studio apron" },
];

const CANDLE_SEEDS: ProductSeed[] = [
  { name: "Vanilla Ember Candle", description: "Warm vanilla and soft amber for cozy evenings.", price: 12500, category: "Candles", image_query: "soy candle vanilla" },
  { name: "Cedarwood & Sage", description: "Earthy cedar with a clean herbal finish.", price: 13500, category: "Candles", image_query: "cedarwood candle" },
  { name: "Honey Fig Jar", description: "Sweet fig and honey in a gift-ready jar.", price: 14500, category: "Candles", image_query: "fig scented candle" },
  { name: "Lavender Night", description: "Calming lavender for wind-down routines.", price: 12000, category: "Candles", image_query: "lavender candle" },
  { name: "Citrus Grove", description: "Bright citrus peel with a fresh green note.", price: 11800, category: "Candles", image_query: "citrus candle" },
  { name: "Rose Petal Glow", description: "Soft floral rose for romantic spaces.", price: 15500, category: "Candles", image_query: "rose candle jar" },
  { name: "Travel Tin Duo", description: "Two mini tins for gifting and travel.", price: 9800, category: "Gift sets", image_query: "travel candle tin" },
  { name: "Weekend Ritual Set", description: "Three signature scents in a gift box.", price: 28500, category: "Gift sets", image_query: "candle gift set" },
  { name: "Matches & Coaster Kit", description: "Branded matches with a ceramic coaster.", price: 6500, category: "Accessories", image_query: "candle matches coaster" },
  { name: "Seasonal Limited Edition", description: "A rotating scent made for the season.", price: 16500, category: "Limited", image_query: "seasonal scented candle" },
];

const FASHION_SEEDS: ProductSeed[] = [
  { name: "Oversized Hoodie", description: "Relaxed everyday hoodie cut for comfort.", price: 28500, category: "Hoodies", image_query: "oversized hoodie fashion" },
  { name: "Wide Leg Trouser", description: "Clean staple trouser with an easy drape.", price: 32500, category: "Bottoms", image_query: "wide leg trousers" },
  { name: "Zip Sweatshirt", description: "Midweight layer for weekday fits.", price: 24800, category: "Tops", image_query: "zip sweatshirt" },
  { name: "Cotton Tee", description: "Soft essential tee with a neat shape.", price: 14500, category: "Basics", image_query: "plain cotton tshirt" },
  { name: "Cargo Short", description: "Utility short with a modern silhouette.", price: 19500, category: "Bottoms", image_query: "cargo shorts fashion" },
  { name: "Everyday Cap", description: "Structured cap for casual looks.", price: 8500, category: "Accessories", image_query: "streetwear cap" },
  { name: "Crew Socks Pack", description: "Three-pack soft crew socks.", price: 6500, category: "Accessories", image_query: "crew socks pack" },
  { name: "Relaxed Denim", description: "Washed denim with room to move.", price: 35500, category: "Bottoms", image_query: "relaxed fit jeans" },
  { name: "Lightweight Jacket", description: "Easy outer layer for cool evenings.", price: 42500, category: "Outerwear", image_query: "lightweight jacket fashion" },
  { name: "Weekend Totebag", description: "Durable tote for everyday carry.", price: 12500, category: "Bags", image_query: "canvas tote bag" },
];

const BEAUTY_SEEDS: ProductSeed[] = [
  { name: "Botanical Gel Cleanser", description: "Gentle daily cleanser for clear comfort.", price: 18500, category: "Cleansers", image_query: "face cleanser bottle" },
  { name: "Glow Repair Serum", description: "Lightweight serum for radiance and hydration.", price: 24000, category: "Serums", image_query: "face serum bottle" },
  { name: "Daily Moisture Cream", description: "Soft cream that locks in moisture.", price: 22000, category: "Moisturizers", image_query: "moisturizer jar" },
  { name: "Vitamin C Mist", description: "Refreshing mist for midday glow.", price: 16500, category: "Mists", image_query: "facial mist bottle" },
  { name: "Overnight Recovery Mask", description: "Leave-on mask for rested-looking skin.", price: 26500, category: "Masks", image_query: "face mask jar" },
  { name: "Lip Oil Tint", description: "Sheer tint with a glossy finish.", price: 9500, category: "Lips", image_query: "lip oil beauty" },
  { name: "Gentle Eye Cream", description: "Cooling cream for the eye area.", price: 19500, category: "Eyes", image_query: "eye cream jar" },
  { name: "SPF Daily Shield", description: "Lightweight daytime protection.", price: 21000, category: "SPF", image_query: "sunscreen bottle skincare" },
  { name: "Travel Mini Kit", description: "Cleanser, serum, and cream in mini sizes.", price: 32000, category: "Kits", image_query: "skincare travel kit" },
  { name: "Daily Radiance Kit", description: "Full routine favourites packed together.", price: 52000, category: "Kits", image_query: "skincare gift set" },
];

const HOME_SEEDS: ProductSeed[] = [
  { name: "Signature Ceramic Vase", description: "Hand-finished vase for everyday styling.", price: 18500, category: "Decor", image_query: "ceramic vase minimal" },
  { name: "Linen Throw", description: "Soft throw for couches and beds.", price: 24500, category: "Textiles", image_query: "linen throw blanket" },
  { name: "Oak Serving Board", description: "Natural oak board for hosting.", price: 16500, category: "Kitchen", image_query: "oak serving board" },
  { name: "Matte Table Lamp", description: "Warm ambient light with a clean base.", price: 38500, category: "Lighting", image_query: "modern table lamp" },
  { name: "Stoneware Mug Set", description: "Set of four everyday mugs.", price: 14500, category: "Kitchen", image_query: "stoneware mugs" },
  { name: "Woven Storage Basket", description: "Stylish storage for living spaces.", price: 12500, category: "Storage", image_query: "woven basket home" },
  { name: "Scented Room Diffuser", description: "Long-lasting scent for open rooms.", price: 15500, category: "Scent", image_query: "reed diffuser home" },
  { name: "Cotton Cushion Cover", description: "Neutral cover that layers easily.", price: 8500, category: "Textiles", image_query: "cushion cover linen" },
  { name: "Wall Frame Duo", description: "Two frames for prints and photos.", price: 17500, category: "Decor", image_query: "picture frames wall" },
  { name: "Weekend Hosting Set", description: "Board, coasters, and napkin set.", price: 29500, category: "Kits", image_query: "home hosting set" },
];

const FOOD_SEEDS: ProductSeed[] = [
  { name: "House Blend Coffee", description: "Balanced everyday roast.", price: 9500, category: "Coffee", image_query: "coffee beans bag" },
  { name: "Chocolate Chip Cookies", description: "Fresh-baked classic cookies.", price: 5500, category: "Bakes", image_query: "chocolate chip cookies" },
  { name: "Granola Crunch Jar", description: "Toasted oats with nuts and honey.", price: 7500, category: "Pantry", image_query: "granola jar" },
  { name: "Spiced Chai Mix", description: "Warm spice blend for daily chai.", price: 6500, category: "Drinks", image_query: "chai spice mix" },
  { name: "Hot Sauce Trio", description: "Mild, medium, and bold sauces.", price: 11500, category: "Pantry", image_query: "hot sauce bottles" },
  { name: "Honey Gift Jar", description: "Pure honey in a gift-ready jar.", price: 8500, category: "Pantry", image_query: "honey jar gift" },
  { name: "Weekend Brunch Box", description: "Pastries and spreads for sharing.", price: 18500, category: "Boxes", image_query: "brunch box food" },
  { name: "Herbal Tea Sampler", description: "Four calming tea blends.", price: 10500, category: "Drinks", image_query: "herbal tea sampler" },
  { name: "Artisan Bread Loaf", description: "Crusty loaf baked fresh.", price: 4500, category: "Bakes", image_query: "artisan sourdough bread" },
  { name: "Seasonal Preserve", description: "Small-batch fruit preserve.", price: 7000, category: "Pantry", image_query: "fruit jam jar" },
];

const ELECTRONICS_SEEDS: ProductSeed[] = [
  { name: "Wireless Earbuds", description: "Clear sound with all-day comfort.", price: 45000, category: "Audio", image_query: "wireless earbuds" },
  { name: "Phone Stand Dock", description: "Stable desk dock for phones.", price: 12500, category: "Accessories", image_query: "phone stand desk" },
  { name: "USB-C Hub", description: "Expand ports for laptops and tablets.", price: 28500, category: "Accessories", image_query: "usb c hub" },
  { name: "Portable Power Bank", description: "Fast-charge battery pack.", price: 22500, category: "Power", image_query: "power bank portable" },
  { name: "Bluetooth Speaker", description: "Compact speaker with rich bass.", price: 35500, category: "Audio", image_query: "bluetooth speaker" },
  { name: "Laptop Sleeve", description: "Padded sleeve for daily commute.", price: 15500, category: "Cases", image_query: "laptop sleeve" },
  { name: "Desk Cable Kit", description: "Organized cables for a clean desk.", price: 9500, category: "Accessories", image_query: "desk cable organizer" },
  { name: "Smart LED Strip", description: "Color lighting for rooms and setups.", price: 18500, category: "Smart home", image_query: "led strip lights" },
  { name: "Gaming Mouse Pad", description: "Wide pad with a smooth glide.", price: 8500, category: "Gaming", image_query: "gaming mouse pad" },
  { name: "Webcam Cover Pack", description: "Privacy covers for laptops.", price: 3500, category: "Accessories", image_query: "webcam privacy cover" },
];

const GENERIC_SEEDS: ProductSeed[] = [
  { name: "Signature Item", description: "A polished starter product for your shop.", price: 18500, category: "Best sellers", image_query: "product photography" },
  { name: "Everyday Essential", description: "A customer favourite for daily use.", price: 14500, category: "Essentials", image_query: "everyday product" },
  { name: "Starter Pack", description: "A curated set to try first.", price: 24500, category: "Bundles", image_query: "product starter kit" },
  { name: "Premium Bundle", description: "Best-value pack for repeat buyers.", price: 39500, category: "Bundles", image_query: "premium product bundle" },
  { name: "Gift Edition", description: "Ready-to-gift packaging and extras.", price: 27500, category: "Gifts", image_query: "gift product packaging" },
  { name: "Limited Drop", description: "A seasonal or limited run item.", price: 32000, category: "Limited", image_query: "limited edition product" },
  { name: "Travel Size", description: "Compact version for on-the-go.", price: 9500, category: "Travel", image_query: "travel size product" },
  { name: "Refill Pack", description: "Refill for your signature item.", price: 12500, category: "Refills", image_query: "product refill pack" },
  { name: "Duo Set", description: "Two complementary products together.", price: 28500, category: "Bundles", image_query: "product duo set" },
  { name: "Member Favourite", description: "The item customers reorder most.", price: 21500, category: "Best sellers", image_query: "bestseller product photo" },
];

const BRAND_COLORS: Record<string, string> = {
  handmade_clothes: "#5C4033",
  fashion: "#1E3A5F",
  candles: "#C47A2C",
  beauty: "#C76B7F",
  home: "#6B7F5E",
  food: "#B42318",
  electronics: "#0F4C81",
  default: "#0E7C66",
};

const FILLER_NAME_WORDS = new Set([
  "i",
  "sell",
  "want",
  "a",
  "site",
  "that",
  "shows",
  "what",
  "build",
  "my",
  "shop",
  "store",
  "online",
  "website",
  "for",
  "the",
  "and",
  "with",
  "to",
  "an",
  "please",
  "need",
  "looking",
]);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function nowIso(): string {
  return new Date().toISOString();
}

function looksLikeSentenceBrandName(value: string): boolean {
  const lower = value.toLowerCase().trim();
  if (!lower) return true;
  if (value.length > 36) return true;
  if (/\b(i sell|i want|site that|website|show what|build|storefront|looking for)\b/.test(lower)) {
    return true;
  }
  const words = lower.split(/\s+/).filter(Boolean);
  if (words.length > 4) return true;
  const fillerCount = words.filter((word) => FILLER_NAME_WORDS.has(word)).length;
  return fillerCount >= 2;
}

function extractExplicitBrandName(message: string): string | null {
  const patterns = [
    /(?:called|named|brand(?:\s+name)?(?:\s+is)?|business(?:\s+name)?(?:\s+is)?|shop(?:\s+name)?(?:\s+is)?|store(?:\s+name)?(?:\s+is)?)\s+["']?([^"'.,!?\n]{2,40})["']?/i,
    /(?:call(?:\s+it)?|name(?:\s+it)?)\s+["']?([^"'.,!?\n]{2,40})["']?/i,
    /^["']([^"']{2,40})["']$/,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    const candidate = match?.[1]?.trim();
    if (candidate && !looksLikeSentenceBrandName(candidate)) {
      return titleCase(candidate.replace(/\s+/g, " ").slice(0, 40));
    }
  }
  return null;
}

function extractNameFromAwaitingReply(message: string): string | null {
  const trimmed = message.trim().replace(/^["']|["']$/g, "");
  if (!trimmed) return null;
  if (/^(you\s+pick|surprise\s+me|no\s+name|i\s+don'?t\s+have|idk|n\/?a|none)\b/i.test(trimmed)) {
    return null;
  }
  const explicit = extractExplicitBrandName(trimmed);
  if (explicit) return explicit;
  if (!looksLikeSentenceBrandName(trimmed) && trimmed.split(/\s+/).length <= 5) {
    return titleCase(trimmed.slice(0, 40));
  }
  return null;
}

function inventBrandName(productFocus: string, industry: Industry | null | undefined): string {
  const lower = productFocus.toLowerCase();
  if (/\bcandle|soy|wax\b/.test(lower)) return "Ember & Wick";
  if (/\bhandmade\b.*\b(cloth|clothes|clothing|apparel|dress|wear)\b|\b(cloth|clothes|clothing)\b.*\bhandmade\b/.test(lower)) {
    return "Stitch Atelier";
  }
  if (/\bstreetwear|hoodie\b/.test(lower)) return "Block & Thread";
  if (/\bfashion|apparel|clothing|clothes\b/.test(lower)) return "Loom & Co";
  if (/\bskincare|beauty|cosmetic\b/.test(lower)) return "Glow Ritual";
  if (/\bcoffee|bakery|food\b/.test(lower)) return "Hearth Market";
  if (/\bhome|decor|furniture\b/.test(lower)) return "Form Studio";
  if (industry === "fashion_and_apparel") return "Loom & Co";
  if (industry === "beauty_and_skincare") return "Glow Ritual";
  if (industry === "home_and_living") return "Form Studio";
  if (industry === "food_and_beverage") return "Hearth Market";
  return "Studio Shop";
}

function productFocusFromMessage(message: string, current?: string | null): string {
  const cleaned = message
    .replace(/\b(i want|i need|i'?d like|looking for|please|can you|could you).*$/i, " ")
    .replace(/\b(build|create|make|generate|design)\b.*\b(site|website|store|storefront|shop)\b.*$/i, " ")
    .replace(/\b(site|website|storefront)\b.*$/i, " ")
    .replace(/\bclothers\b/gi, "clothes")
    .replace(/\bclothings\b/gi, "clothing")
    .replace(/\s+/g, " ")
    .trim();

  const sellMatch = cleaned.match(/\b(?:i\s+)?sell\s+(.+)$/i);
  if (sellMatch?.[1]) {
    const focus = sellMatch[1].replace(/\s+/g, " ").trim();
    if (focus.length >= 3) return focus.slice(0, 80);
  }

  const forMatch = cleaned.match(/\b(?:i\s+(?:make|craft|create)|we\s+(?:make|sell|craft))\s+(.+)$/i);
  if (forMatch?.[1]) {
    const focus = forMatch[1].replace(/\s+/g, " ").trim();
    if (focus.length >= 3) return focus.slice(0, 80);
  }

  if (current && current.length >= 3 && current.length <= 80) {
    return current.replace(/\bclothers\b/gi, "clothes");
  }
  return cleaned.slice(0, 80);
}

function isStartOverReply(message: string): boolean {
  return /^(start over|reset|again|new(?:\s+shop)?|start\s+again)\b/i.test(message.trim());
}

function isSignupNudgeReply(message: string): boolean {
  return /\b(create\s+(an\s+)?account|sign\s*up|register|claim|manage\s+(my\s+)?store|publish)\b/i.test(
    message,
  );
}

function marketingDescription(productFocus: string, tone: string[]): string {
  const vibe = tone.length ? tone.slice(0, 2).join(", ") : "thoughtful";
  return `A ${vibe} shop for ${productFocus}. Pieces made to feel personal, clear, and easy to buy online.`;
}

function inferBrandColor(productFocus: string, industry: Industry | null | undefined, tone: string[]): string {
  const lower = `${productFocus} ${tone.join(" ")}`.toLowerCase();
  if (/\bcandle|warm|cozy|amber\b/.test(lower)) return BRAND_COLORS.candles;
  if (/\bhandmade\b.*\b(cloth|clothes|clothing)\b|\blinen|atelier|earth\b/.test(lower)) {
    return BRAND_COLORS.handmade_clothes;
  }
  if (industry === "fashion_and_apparel" || /\bfashion|streetwear|apparel\b/.test(lower)) {
    return BRAND_COLORS.fashion;
  }
  if (industry === "beauty_and_skincare" || /\bskincare|beauty|blush|soft\b/.test(lower)) {
    return BRAND_COLORS.beauty;
  }
  if (industry === "home_and_living" || /\bhome|decor|sage\b/.test(lower)) return BRAND_COLORS.home;
  if (industry === "food_and_beverage") return BRAND_COLORS.food;
  if (industry === "electronics") return BRAND_COLORS.electronics;
  return BRAND_COLORS.default;
}

function seedsForFocus(productFocus: string, industry: Industry | null | undefined): ProductSeed[] {
  const lower = productFocus.toLowerCase();
  if (/\bcandle|soy|wax melt|scented\b/.test(lower)) return CANDLE_SEEDS;
  if (/\bhandmade\b.*\b(cloth|clothes|clothing|apparel|dress|wear)\b|\b(cloth|clothes|clothing)\b.*\bhandmade\b/.test(lower)) {
    return HANDMADE_CLOTHES_SEEDS;
  }
  if (industry === "fashion_and_apparel" || /\bfashion|streetwear|clothing|apparel|hoodie\b/.test(lower)) {
    return FASHION_SEEDS;
  }
  if (industry === "beauty_and_skincare" || /\bskincare|beauty|cosmetic|serum\b/.test(lower)) {
    return BEAUTY_SEEDS;
  }
  if (industry === "food_and_beverage" || /\bfood|coffee|bakery|snack\b/.test(lower)) return FOOD_SEEDS;
  if (industry === "electronics" || /\belectronic|gadget|phone|laptop\b/.test(lower)) {
    return ELECTRONICS_SEEDS;
  }
  if (industry === "home_and_living" || /\bhome|decor|furniture|pottery\b/.test(lower)) {
    return HOME_SEEDS;
  }
  return GENERIC_SEEDS;
}

function localRecommendations(profile: GuestChatProfile, prompt: string): StorefrontTemplateRecommendation[] {
  const haystack = `${prompt} ${(profile.tone ?? []).join(" ")}`.toLowerCase();
  const concrete = STOREFRONT_TEMPLATE_OPTIONS.filter(
    (option): option is (typeof STOREFRONT_TEMPLATE_OPTIONS)[number] & { value: StorefrontTemplateId } =>
      option.value !== "ai_pick",
  );

  return concrete
    .map((template) => {
      let score = 0.35;
      if (profile.industry && template.industries?.includes(profile.industry)) score += 0.35;
      const matchedTone = (template.tone_tags ?? []).filter((tag) => haystack.includes(tag.toLowerCase()));
      if (matchedTone.length) score += Math.min(0.18, matchedTone.length * 0.06);
      return {
        template_id: template.value,
        score,
        reason: template.bestFor ?? template.description,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

function toStoreProducts(seeds: ProductSeed[], slugBase: string, brandName: string): StoreProduct[] {
  return seeds.slice(0, GUEST_PREVIEW_PRODUCT_COUNT).map((seed, index) => ({
    id: `guest-product-${index + 1}`,
    slug: `${slugBase}-${slugify(seed.name)}`,
    name: seed.name,
    description: seed.description.includes(brandName)
      ? seed.description
      : `${seed.description} From ${brandName}.`,
    price: seed.price,
    currency: "NGN",
    image_url: null,
    category: seed.category,
    status: "active" as const,
  }));
}

function bumpProductGridLimits(storefront: StorefrontContent, limit: number): StorefrontContent {
  const next = ensureHomeBlocksOnStorefront(structuredClone(storefront));
  const home = next.pages?.home;
  if (home?.blocks) {
    home.blocks = home.blocks.map((block) => {
      if (block.type !== "product_grid") return block;
      return { ...block, props: { ...block.props, limit } };
    });
  }
  return next;
}

async function sourceProductImages(products: StoreProduct[], seeds: ProductSeed[]): Promise<StoreProduct[]> {
  const used = new Set<string>();
  const next: StoreProduct[] = [];
  for (let i = 0; i < products.length; i += 1) {
    const product = products[i];
    const query = seeds[i]?.image_query || product.name;
    const photos = await searchUnsplashPhotosDirect(query, 4, { orientation: "squarish" });
    const match = photos.find((photo) => {
      const url = formatUnsplashPhotoUrl(photo, 900);
      return url && !used.has(url);
    });
    const url = match ? formatUnsplashPhotoUrl(match, 900) : null;
    if (url) used.add(url);
    next.push({ ...product, image_url: url });
  }
  return next;
}

async function sourceHeroImage(productFocus: string, industry: Industry | null | undefined): Promise<string | null> {
  const lower = productFocus.toLowerCase();
  const query =
    /\bcandle\b/.test(lower)
      ? "handmade soy candles cozy"
      : /\bhandmade\b.*\b(cloth|clothes|clothing)\b/.test(lower)
        ? "handmade clothing atelier studio"
        : industry === "beauty_and_skincare"
          ? "skincare products flat lay"
          : industry === "fashion_and_apparel"
            ? "fashion lookbook editorial"
            : industry === "food_and_beverage"
              ? "artisan food products"
              : "modern boutique storefront products";
  const photos = await searchUnsplashPhotosDirect(query, 3, { orientation: "landscape" });
  return photos[0] ? formatUnsplashPhotoUrl(photos[0], 1800) : null;
}

async function callGuestAiJson<T>(system: string, user: unknown): Promise<T | null> {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  const baseUrl = process.env.DEEPSEEK_API_KEY
    ? process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com/v1"
    : process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const model = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(user) },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = payload.choices?.[0]?.message?.content;
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function buildLocalBrief(profile: GuestChatProfile): GuestBrief {
  const productFocus = profile.product_focus || profile.description || "everyday products";
  const industry = profile.industry ?? "other";
  const tone = profile.tone?.length ? profile.tone : ["clean"];
  const businessName =
    profile.business_name && !looksLikeSentenceBrandName(profile.business_name)
      ? profile.business_name
      : inventBrandName(productFocus, industry);
  const brandColor = profile.brand_color ?? inferBrandColor(productFocus, industry, tone);
  const description = marketingDescription(productFocus, tone);
  return {
    business_name: businessName,
    description,
    industry,
    brand_color: brandColor,
    tone,
    hero_headline:
      industry === "fashion_and_apparel"
        ? `Made by hand. Worn with intent.`
        : `Welcome to ${businessName}.`,
    hero_subheadline: description,
    products: seedsForFocus(productFocus, industry),
  };
}

async function buildAiBrief(profile: GuestChatProfile): Promise<GuestBrief | null> {
  const productFocus = profile.product_focus || profile.description || "";
  const result = await callGuestAiJson<{
    business_name?: string;
    description?: string;
    industry?: Industry;
    brand_color?: string;
    tone?: string[];
    hero_headline?: string;
    hero_subheadline?: string;
    products?: ProductSeed[];
  }>(
    "You design ecommerce storefront previews. Return ONLY JSON with keys: " +
      "business_name, description, industry, brand_color, tone, hero_headline, hero_subheadline, products. " +
      "business_name must be a short brand (2-4 words), never a full sentence or 'I sell…'. " +
      "brand_color is a hex like #5C4033 that fits the niche. " +
      `products is an array of exactly ${GUEST_PREVIEW_PRODUCT_COUNT} items: ` +
      "{name, description, price (NGN int 3500-85000), category, image_query}. " +
      "Products must clearly match what they sell (e.g. handmade clothes → shirts, dresses, trousers — not gadgets). " +
      "image_query is a short Unsplash search without brand names. " +
      "industry must be one of: food_and_beverage, fashion_and_apparel, beauty_and_skincare, electronics, home_and_living, services, other.",
    {
      product_focus: productFocus,
      business_name: profile.business_name,
      industry: profile.industry,
      tone: profile.tone,
      brand_color: profile.brand_color,
      description: profile.description,
    },
  );

  if (!result?.business_name || !Array.isArray(result.products) || result.products.length < 6) {
    return null;
  }

  const products = result.products
    .filter((p) => p?.name && p?.description && Number.isFinite(Number(p.price)))
    .slice(0, GUEST_PREVIEW_PRODUCT_COUNT)
    .map((p) => ({
      name: String(p.name).trim().slice(0, 80),
      description: String(p.description).trim().slice(0, 220),
      price: Math.max(3500, Math.round(Number(p.price))),
      category: p.category ? String(p.category).trim().slice(0, 40) : undefined,
      image_query: String(p.image_query || p.name).trim().slice(0, 80),
    }));

  if (products.length < 6) return null;

  const color =
    typeof result.brand_color === "string" && /^#[0-9A-Fa-f]{6}$/.test(result.brand_color)
      ? result.brand_color
      : inferBrandColor(productFocus, result.industry ?? profile.industry, result.tone ?? []);

  return {
    business_name: looksLikeSentenceBrandName(result.business_name)
      ? inventBrandName(productFocus, result.industry ?? profile.industry)
      : titleCase(result.business_name).slice(0, 40),
    description: String(result.description || marketingDescription(productFocus, result.tone ?? [])).slice(0, 280),
    industry: result.industry ?? profile.industry ?? "other",
    brand_color: color,
    tone: Array.isArray(result.tone) ? result.tone.map(String).slice(0, 4) : profile.tone ?? [],
    hero_headline: String(result.hero_headline || `Welcome to ${result.business_name}.`).slice(0, 80),
    hero_subheadline: String(result.hero_subheadline || result.description || "").slice(0, 180),
    products,
  };
}

async function generateStorefrontForProfile(profile: GuestChatProfile): Promise<{
  profile: GuestChatProfile;
  store: Store;
  storefront: StorefrontContent;
}> {
  const brief = (await buildAiBrief(profile)) ?? buildLocalBrief(profile);
  const nextProfile: GuestChatProfile = sanitizeBusinessProfile({
    ...profile,
    business_name: brief.business_name,
    description: brief.description,
    industry: brief.industry,
    brand_color: brief.brand_color,
    tone: brief.tone,
  });
  nextProfile.product_focus = profile.product_focus ?? productFocusFromMessage(brief.description);

  const prompt = `${nextProfile.business_name} ${nextProfile.product_focus ?? ""} ${nextProfile.description ?? ""}`;
  const recommendations = localRecommendations(nextProfile, prompt);
  const fromMessage = resolveTemplateFromMessage(prompt);
  const selected =
    fromMessage ??
    resolveSelectedTemplateId(
      {
        id: "guest",
        status: "collecting_requirements",
        business_profile: nextProfile,
        selected_template_id: "ai_pick",
        storefront_snapshot: null,
        store: null,
        messages: [],
        recommendations,
      },
      recommendations,
      STOREFRONT_TEMPLATE_OPTIONS.filter((o) => o.value !== "ai_pick").map(
        (o) => o.value as StorefrontTemplateId,
      ),
    ) ??
    (brief.industry === "fashion_and_apparel" ? "fashion_lookbook" : "minimalistic");

  const store = profileToStore(nextProfile, selected);
  store.id = `guest-${slugify(store.business_name)}-${Date.now().toString(36)}`;
  store.brand_color = brief.brand_color;

  let storefront = synthesizeStorefront(store, recommendations, {
    hero: {
      headline: brief.hero_headline,
      subheadline: brief.hero_subheadline,
      cta_label:
        brief.industry === "fashion_and_apparel" ? "Shop the collection" : "Start shopping",
    },
    about: {
      title: `About ${brief.business_name}`,
      body: brief.description,
    },
    seo: {
      title: `${brief.business_name} | Online Store`,
      description: brief.description.slice(0, 150),
    },
  });

  const slugBase = slugify(brief.business_name) || "shop";
  let products = toStoreProducts(brief.products, slugBase, brief.business_name);
  products = await sourceProductImages(products, brief.products);
  const heroUrl = await sourceHeroImage(nextProfile.product_focus ?? brief.description, brief.industry);

  storefront = {
    ...storefront,
    products,
    media: {
      ...storefront.media,
      hero_image_url: heroUrl ?? storefront.media?.hero_image_url ?? null,
    },
    palette: storefront.palette
      ? { ...storefront.palette, primary: brief.brand_color }
      : storefront.palette,
  };
  storefront = bumpProductGridLimits(storefront, GUEST_PREVIEW_PRODUCT_COUNT);

  return { profile: nextProfile, store, storefront };
}

function hasEnoughToAskForName(profile: GuestChatProfile): boolean {
  const focus = profile.product_focus?.trim() ?? "";
  return focus.length >= 3 || (profile.description?.trim().length ?? 0) >= 12;
}

function isPickForMeReply(message: string): boolean {
  return /^(you\s+pick|surprise\s+me|no\s+name|i\s+don'?t\s+have|idk|n\/?a|none|anything|whatever)\b/i.test(
    message.trim(),
  );
}

function isConfirmSuggestedNameReply(message: string): boolean {
  return /^(yes|yeah|yep|yup|ok|okay|sure|perfect|sounds?\s+good|use\s+(that|it)|that\s+works|go\s+(ahead|with\s+it))\b/i.test(
    message.trim(),
  );
}

function mergeProfileFromMessage(profile: GuestChatProfile, message: string): GuestChatProfile {
  const extracted = sanitizeBusinessProfile(extractBusinessProfile(message, profile));
  const next: GuestChatProfile = {
    ...profile,
    industry: extracted.industry ?? profile.industry,
    brand_color: extracted.brand_color ?? profile.brand_color,
    tone: [...new Set([...(profile.tone ?? []), ...(extracted.tone ?? [])])],
    // Never trust sell-sentence "names" from extractBusinessProfile.
    business_name: null,
  };

  const explicitName = extractExplicitBrandName(message);
  if (explicitName) {
    next.business_name = explicitName;
  } else if (profile.business_name && !looksLikeSentenceBrandName(profile.business_name)) {
    next.business_name = profile.business_name;
  }

  next.product_focus = productFocusFromMessage(message, profile.product_focus);
  next.description = next.product_focus
    ? marketingDescription(next.product_focus, next.tone ?? [])
    : message.trim().slice(0, 200);

  return next;
}

export function validateGuestPreviewPrompt(prompt: string): string | null {
  const trimmed = prompt.trim();
  if (trimmed.length < 3) return "Say a bit more so I can help.";
  return null;
}

/**
 * Conversational guest turn: collect what they sell → ask for brand name → generate preview.
 */
export async function processGuestChatTurn(
  session: GuestChatSession,
  message: string,
): Promise<GuestChatSession> {
  const trimmed = message.trim();
  if (!trimmed) {
    throw new Error("Type a message to continue.");
  }

  let next: GuestChatSession = {
    ...session,
    messages: [...session.messages, makeGuestMessage("user", trimmed)],
    updated_at: nowIso(),
  };

  if (session.status === "ready") {
    if (isStartOverReply(trimmed)) {
      const fresh = createGuestChatSession();
      return {
        ...fresh,
        messages: [
          ...fresh.messages,
          makeGuestMessage("user", trimmed),
          makeGuestMessage(
            "assistant",
            "Alright — fresh start. What do you sell, and who is it for?",
          ),
        ],
      };
    }

    if (isSignupNudgeReply(trimmed)) {
      next.messages = [
        ...next.messages,
        makeGuestMessage(
          "assistant",
          "Create a free account to save this preview, manage products, take payments, and publish. Use the Create account button when you're ready — or keep refining the site here first.",
        ),
      ];
      return next;
    }

    if (!session.store || !session.storefront) {
      next.messages = [
        ...next.messages,
        makeGuestMessage(
          "assistant",
          "I don't have a storefront draft to edit yet. Say \"start over\" and we'll build a new one.",
        ),
      ];
      return next;
    }

    try {
      const edit = await applyStorefrontEditAsync(session.storefront, trimmed, {
        store: session.store,
        message: trimmed,
        planIntent: trimmed,
      });

      const changed = edit.changed_paths?.length ?? 0;
      const reply =
        changed > 0
          ? edit.assistant_message ||
            `Updated ${changed} part${changed === 1 ? "" : "s"} of your preview. What else should we change?`
          : "I couldn't match that to a specific edit. Try something like \"update the products\", \"refresh the homepage copy\", or \"change the headline to …\".";

      return {
        ...next,
        status: "ready",
        storefront: edit.storefront,
        store: session.store,
        messages: [...next.messages, makeGuestMessage("assistant", reply)],
        updated_at: nowIso(),
      };
    } catch {
      next.messages = [
        ...next.messages,
        makeGuestMessage(
          "assistant",
          "I hit a snag updating the preview. Try again, or be a bit more specific — e.g. \"update the products\" or \"rewrite the headline\".",
        ),
      ];
      return next;
    }
  }

  if (session.status === "awaiting_name") {
    const productFocus = session.profile.product_focus || "your products";
    const suggested =
      session.profile.business_name && !looksLikeSentenceBrandName(session.profile.business_name)
        ? session.profile.business_name
        : null;

    let chosen: string | null = null;
    if (isPickForMeReply(trimmed)) {
      chosen = inventBrandName(productFocus, session.profile.industry);
    } else if (suggested && isConfirmSuggestedNameReply(trimmed)) {
      chosen = suggested;
    } else {
      chosen = extractNameFromAwaitingReply(trimmed);
    }

    if (!chosen) {
      next.status = "awaiting_name";
      next.messages = [
        ...next.messages,
        makeGuestMessage(
          "assistant",
          `That still reads like a sentence. Pick a short brand name (2–4 words), like "Stitch Atelier", or reply "you pick" and I'll invent one.`,
        ),
      ];
      return next;
    }

    const profile: GuestChatProfile = {
      ...session.profile,
      business_name: chosen,
      product_focus: productFocus,
    };

    next = {
      ...next,
      status: "generating",
      profile,
      store: null,
      storefront: null,
      messages: [
        ...next.messages,
        makeGuestMessage(
          "assistant",
          `Love it — building ${chosen} with products that fit ${productFocus}. One moment…`,
        ),
      ],
    };

    const generated = await generateStorefrontForProfile(profile);
    return {
      ...next,
      status: "ready",
      profile: generated.profile,
      store: generated.store,
      storefront: generated.storefront,
      messages: [
        ...next.messages,
        makeGuestMessage(
          "assistant",
          `Your ${generated.store.business_name} preview is ready — ${generated.storefront.products?.length ?? 0} starter products, brand color, and homepage copy. Browse it on the right. You can ask me to update the content, headline, or products — or create an account to manage the store.`,
        ),
      ],
      updated_at: nowIso(),
    };
  }

  // collecting — always ask for a brand name before generating
  const profile = mergeProfileFromMessage(session.profile, trimmed);
  next.profile = profile;

  if (!hasEnoughToAskForName(profile)) {
    next.messages = [
      ...next.messages,
      makeGuestMessage(
        "assistant",
        "Got it — tell me a bit more about what you sell (products or services) and who it's for.",
      ),
    ];
    next.status = "collecting";
    return next;
  }

  const focus = profile.product_focus ?? "your shop";
  const suggested = profile.business_name && !looksLikeSentenceBrandName(profile.business_name)
    ? profile.business_name
    : null;

  next.status = "awaiting_name";
  // Clear any inferred name so we never generate until they confirm.
  next.profile = { ...profile, business_name: suggested };
  next.store = null;
  next.storefront = null;
  next.messages = [
    ...next.messages,
    makeGuestMessage(
      "assistant",
      suggested
        ? `Nice — a shop for ${focus}. Should we call it "${suggested}", or type a different brand name? (Or say "you pick".)`
        : `Nice — a shop for ${focus}. What should we call your brand? A short name works best, like "Stitch Atelier". Or say "you pick" and I'll invent one.`,
    ),
  ];
  return next;
}

/** One-shot helper used only if something still calls the old generate path. */
export async function buildGuestPreview(prompt: string): Promise<GuestPreviewPayload> {
  let session = createGuestChatSession();
  session = await processGuestChatTurn(session, prompt);
  if (session.status === "awaiting_name") {
    session = await processGuestChatTurn(session, "you pick");
  }
  const payload = sessionToPreviewPayload(session);
  if (!payload) throw new Error("Could not build a storefront preview.");
  return payload;
}
