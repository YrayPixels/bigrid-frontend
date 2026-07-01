import type { StorefrontBlock } from "@/lib/storefront/blocks/types";
import type {
  BusinessLocation,
  PaymentCurrency,
  PhysicalStoreCount,
  StaffCountRange,
  WeeklyOrderRange,
} from "@/lib/business-profile";

export type {
  BusinessLocation,
  PaymentCurrency,
  PhysicalStoreCount,
  StaffCountRange,
  WeeklyOrderRange,
} from "@/lib/business-profile";

export type User = {
  id: string;
  name: string;
  email: string;
  has_store: boolean;
};

export type AuthResponse = {
  token: string;
  user: User;
};

export type Industry =
  | "food_and_beverage"
  | "fashion_and_apparel"
  | "beauty_and_skincare"
  | "electronics"
  | "home_and_living"
  | "services"
  | "other";

export type StorefrontTemplateId =
  | "classic"
  | "editorial"
  | "bold_grid"
  | "fashion_lookbook"
  | "minimalistic"
  | "beauty"
  | "cosmetics";
export type StorefrontTemplateChoice = StorefrontTemplateId | "ai_pick";

export type StorefrontTemplateOrigin = "platform" | "ai_generated" | "admin_created";

export type StorefrontTemplateGenerationStatus =
  | "requested"
  | "draft_generated"
  | "preview_ready"
  | "review_required"
  | "active"
  | "inactive";

export type StorefrontColorPalette = {
  primary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
};

export type Store = {
  id: string;
  slug: string;
  business_name: string;
  industry: Industry;
  description: string;
  brand_color: string;
  logo_url: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  business_location?: BusinessLocation | null;
  weekly_orders?: WeeklyOrderRange | null;
  payment_currencies?: PaymentCurrency[];
  staff_count?: StaffCountRange | null;
  physical_store_count?: PhysicalStoreCount | null;
  storefront_template_id: StorefrontTemplateChoice;
  subdomain?: string;
  subdomain_host?: string;
  primary_domain?: string;
  status?: "draft" | "published" | string;
  published_at?: string | null;
  is_published?: boolean;
  has_unpublished_changes?: boolean;
};

export type StorefrontPublishState = {
  status: string;
  published_at: string | null;
  is_published: boolean;
  has_unpublished_changes: boolean;
};

export type StorefrontDraftResponse = {
  storefront: StorefrontContent | null;
  publish: StorefrontPublishState;
};

export type PublishStorefrontResponse = {
  store: Store;
  storefront: StorefrontContent | null;
  publish: StorefrontPublishState;
  message: string;
};

export type CreateStoreInput = {
  business_name: string;
  slug?: string;
  industry: Industry;
  description: string;
  brand_color: string;
  logo_url: string | null;
  business_location: BusinessLocation;
  weekly_orders: WeeklyOrderRange;
  payment_currencies: PaymentCurrency[];
  staff_count: StaffCountRange;
  physical_store_count: PhysicalStoreCount;
  storefront_template_id?: StorefrontTemplateChoice;
};

export type UpdateStoreInput = {
  business_name?: string;
  description?: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  brand_color?: string;
  business_location?: BusinessLocation;
  weekly_orders?: WeeklyOrderRange;
  payment_currencies?: PaymentCurrency[];
  staff_count?: StaffCountRange;
  physical_store_count?: PhysicalStoreCount;
};

export type ProductImportError = {
  row: number;
  field: string | null;
  message: string;
};

export type ProductImportReport = {
  imported: number;
  failed: number;
  errors: ProductImportError[];
  data: StoreProduct[];
};

export type UpdateStorefrontInput = {
  storefront: StorefrontContent;
  storefront_template_id?: StorefrontTemplateId;
};

export type StoreProduct = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  image_url: string | null;
  sku?: string;
  category?: string;
  category_id?: string | null;
  stock_quantity?: number;
  status?: "active" | "draft" | "archived";
  in_stock?: boolean;
  low_stock?: boolean;
  variants?: { name: string; options: string[] }[];
  perks?: string[];
};

export type StoreCategory = {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  parent_name?: string | null;
  sort_order?: number;
  products_count?: number;
};

export type CreateCategoryInput = {
  name: string;
  slug?: string;
  parent_id?: string | null;
  sort_order?: number;
};

export type UpdateCategoryInput = {
  name?: string;
  slug?: string;
  parent_id?: string | null;
  sort_order?: number;
};

export type StorePageSource = "merchant" | "ai_generated" | "platform_default";

export type StorefrontPages = {
  home?: { blocks: StorefrontBlock[] };
  about?: { title: string; body: string; source: StorePageSource; blocks?: StorefrontBlock[] };
  contact?: {
    title: string;
    body: string;
    email?: string | null;
    phone?: string | null;
    source: StorePageSource;
    blocks?: StorefrontBlock[];
  };
  faq?: {
    title: string;
    source: StorePageSource;
    items: { question: string; answer: string }[];
    blocks?: StorefrontBlock[];
  };
  privacy_policy?: { title: string; body: string; source: StorePageSource };
};

export type StoreContactInquiryInput = {
  block_id?: string;
  fields: Record<string, string>;
};

export type StorefrontEditMetadata = {
  locked_paths?: string[];
  user_edited_paths?: string[];
  ai_generated_paths?: string[];
  last_generation_prompt?: string | null;
  last_generated_at?: string | null;
};

export type StorefrontContent = {
  template?: {
    id: StorefrontTemplateId;
    source: "merchant_selected" | "ai_selected";
  };
  palette?: StorefrontColorPalette;
  display_font?: string;
  data_plugs?: {
    home_products_source?: "merchant_products" | "theme_products";
  };
  media?: {
    hero_image_url?: string | null;
    about_image_url?: string | null;
    category_images?: (string | null)[];
  };
  hero: { headline: string; subheadline: string; cta_label: string };
  about: { title: string; body: string };
  value_props: { title: string; body: string }[];
  navigation?: { label: string; href: string }[];
  home_stats?: { value: string; label: string }[];
  home_testimonials_title?: string;
  home_testimonials_intro?: string;
  home_testimonials?: { quote: string; author: string }[];
  pages?: StorefrontPages;
  products?: StoreProduct[];
  seo: { title: string; description: string };
  edit_metadata?: StorefrontEditMetadata;
};

export type BuilderSessionStatus =
  | "collecting_requirements"
  | "template_recommendation"
  | "content_generated"
  | "products_pending"
  | "review_ready"
  | "published";

export type BuilderBusinessProfile = {
  business_name?: string | null;
  description?: string | null;
  industry?: Industry | null;
  brand_color?: string | null;
  tone?: string[];
};

export type BuilderMessageRole = "user" | "assistant";

export type BuilderMediaTarget = "media.hero_image_url" | "media.about_image_url";

export type BuilderSuggestedAction =
  | { type: "prompt"; label: string; message: string }
  | { type: "color"; label: string; color: string }
  | { type: "upload"; label: string; target: BuilderMediaTarget }
  | { type: "image"; label: string; target: BuilderMediaTarget; url: string }
  | { type: "link"; label: string; href: string };

export type BuilderMessage = {
  id: string;
  role: BuilderMessageRole;
  content: string;
  payload?: Record<string, unknown> | null;
  created_at?: string | null;
};

export type BuilderSession = {
  id: string;
  status: BuilderSessionStatus;
  business_profile: BuilderBusinessProfile;
  selected_template_id: StorefrontTemplateChoice | null;
  storefront_snapshot: StorefrontContent | null;
  store: Store | null;
  messages: BuilderMessage[];
  recommendations: StorefrontTemplateRecommendation[];
  updated_at?: string | null;
};

export type BuilderSessionResponse = {
  session: BuilderSession | null;
  generation_id?: string;
  storefront?: StorefrontContent;
  changed_paths?: string[];
};

export type PublicStorefront = {
  store: Store;
  storefront: StorefrontContent;
  generation_id: string | null;
  categories?: StoreCategory[];
};

export type StoreOrderStatus = "pending" | "processing" | "fulfilled" | "cancelled" | "refunded";

export type StoreOrderItem = {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
  currency: string;
};

export type StoreOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  status: StoreOrderStatus;
  payment_status: string;
  currency: string;
  subtotal: number;
  total_amount: number;
  items: StoreOrderItem[];
  notes: string | null;
  placed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type StoreOrdersResponse = {
  data: StoreOrder[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type MerchantDashboardMetrics = {
  total_orders: number;
  pending_orders: number;
  fulfilled_orders: number;
  total_sales: number;
  average_order_value: number;
  total_visits: number;
  visits_today: number;
  conversion_rate: number;
  products_count: number;
};

export type MerchantDashboardOverview = {
  metrics: MerchantDashboardMetrics;
  sales_by_day: { date: string; orders: number; sales: number }[];
  recent_orders: StoreOrder[];
};

export type CreateStoreOrderInput = {
  customer: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  delivery_address: string;
  notes?: string;
  items: { product_id: string; quantity: number }[];
};

export const INDUSTRY_OPTIONS: { value: Industry; label: string }[] = [
  { value: "food_and_beverage", label: "Food & Beverage" },
  { value: "fashion_and_apparel", label: "Fashion & Apparel" },
  { value: "beauty_and_skincare", label: "Beauty & Skincare" },
  { value: "electronics", label: "Electronics" },
  { value: "home_and_living", label: "Home & Living" },
  { value: "services", label: "Services" },
  { value: "other", label: "Other" },
];

export type StorefrontTemplatePreview =
  | "balanced"
  | "editorial"
  | "grid"
  | "lookbook"
  | "minimal"
  | "beauty"
  | "cosmetics"
  | "spark";

export type StorefrontTemplateOption = {
  id?: StorefrontTemplateId;
  value: StorefrontTemplateChoice;
  label: string;
  description: string;
  bestFor: string;
  best_for?: string[];
  industries?: Industry[];
  tone_tags?: string[];
  visual_tags?: string[];
  product_types?: string[];
  preview: StorefrontTemplatePreview;
  default_palette?: StorefrontColorPalette;
  required_content_slots?: string[];
  optional_content_slots?: string[];
  origin?: StorefrontTemplateOrigin;
  base_template_id?: StorefrontTemplateId;
  generation_status?: StorefrontTemplateGenerationStatus;
  is_active?: boolean;
  sort_order?: number;
};

export type StorefrontTemplateRecommendation = {
  template_id: StorefrontTemplateId;
  score: number;
  reason: string;
};

export type RecommendStorefrontTemplatesInput = {
  prompt?: string;
  industry?: Industry;
  tone?: string[];
  limit?: number;
};

export const STOREFRONT_TEMPLATE_OPTIONS: StorefrontTemplateOption[] = [
  {
    value: "ai_pick",
    label: "Let AI choose",
    description: "We pick the best template for the merchant's industry and brand tone.",
    bestFor: "Fast setup",
    preview: "spark",
  },
  {
    value: "fashion_lookbook",
    label: "Fashion",
    description:
      "A clothing-brand homepage with campaign imagery, curated edits, and product drops.",
    bestFor: "Clothing brands",
    best_for: ["clothing brands", "streetwear labels", "seasonal collections"],
    industries: ["fashion_and_apparel"],
    tone_tags: ["bold", "editorial", "modern"],
    visual_tags: ["lookbook", "campaign-led", "image-forward"],
    product_types: ["physical"],
    preview: "lookbook",
    required_content_slots: ["hero", "about", "value_props", "products", "faq"],
    optional_content_slots: ["featuredDrops", "lookbookStory"],
    origin: "platform",
    generation_status: "active",
  },
  {
    value: "beauty",
    label: "Beauty",
    description:
      "A polished beauty storefront for hair, skincare, bundles, and best-seller storytelling.",
    bestFor: "Beauty, hair, skincare",
    best_for: ["beauty brands", "hair products", "skincare bundles"],
    industries: ["beauty_and_skincare"],
    tone_tags: ["premium", "soft", "polished"],
    visual_tags: ["editorial", "warm", "product-focused"],
    product_types: ["physical"],
    preview: "beauty",
    required_content_slots: ["hero", "about", "value_props", "products", "faq"],
    optional_content_slots: ["bestSellers", "routineFeature"],
    origin: "platform",
    generation_status: "active",
  },
  {
    value: "cosmetics",
    label: "Cosmetics",
    description:
      "A clean cosmetics storefront for skincare, serums, product storytelling, and ingredient-led trust.",
    bestFor: "Cosmetics, skincare",
    best_for: ["skincare brands", "cosmetics catalogs", "routine-based products"],
    industries: ["beauty_and_skincare"],
    tone_tags: ["natural", "premium", "clean", "soft"],
    visual_tags: ["minimal", "ingredient-led", "product-focused"],
    product_types: ["physical"],
    preview: "cosmetics",
    required_content_slots: ["hero", "about", "value_props", "products", "faq"],
    optional_content_slots: ["routineFeature", "ingredientFeature"],
    origin: "platform",
    generation_status: "active",
  },
  {
    value: "minimalistic",
    label: "Minimalistic",
    description:
      "A clean supplement-inspired storefront with soft neutrals, rounded product cards, and wellness storytelling.",
    bestFor: "Wellness brands",
    best_for: ["wellness brands", "home goods", "simple product catalogs"],
    industries: ["home_and_living", "food_and_beverage", "electronics", "services", "other"],
    tone_tags: ["minimal", "calm", "clean", "warm"],
    visual_tags: ["soft", "neutral", "catalog-friendly"],
    product_types: ["physical", "service"],
    preview: "minimal",
    required_content_slots: ["hero", "about", "value_props", "products", "faq"],
    optional_content_slots: ["categoryHighlights", "wellnessStory"],
    origin: "platform",
    generation_status: "active",
  },
];
