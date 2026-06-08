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
  storefront_template_id: StorefrontTemplateChoice;
  subdomain?: string;
  subdomain_host?: string;
  primary_domain?: string;
};

export type CreateStoreInput = {
  business_name: string;
  industry: Industry;
  description: string;
  brand_color: string;
  logo_url: string | null;
  storefront_template_id: StorefrontTemplateChoice;
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
  stock_quantity?: number;
  status?: "active" | "draft";
  variants?: { name: string; options: string[] }[];
  perks?: string[];
};

export type StorePageSource = "merchant" | "ai_generated" | "platform_default";

export type StorefrontPages = {
  about: { title: string; body: string; source: StorePageSource };
  contact: {
    title: string;
    body: string;
    email?: string | null;
    phone?: string | null;
    source: StorePageSource;
  };
  faq: {
    title: string;
    source: StorePageSource;
    items: { question: string; answer: string }[];
  };
  privacy_policy: { title: string; body: string; source: StorePageSource };
};

export type StorefrontContent = {
  template?: {
    id: StorefrontTemplateId;
    source: "merchant_selected" | "ai_selected";
  };
  palette?: StorefrontColorPalette;
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
  pages?: StorefrontPages;
  products?: StoreProduct[];
  seo: { title: string; description: string };
};

export type PublicStorefront = {
  store: Store;
  storefront: StorefrontContent;
  generation_id: string | null;
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
  value: StorefrontTemplateChoice;
  label: string;
  description: string;
  bestFor: string;
  preview: StorefrontTemplatePreview;
  is_active?: boolean;
  sort_order?: number;
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
    preview: "lookbook",
  },
  {
    value: "beauty",
    label: "Beauty",
    description:
      "A polished beauty storefront for hair, skincare, bundles, and best-seller storytelling.",
    bestFor: "Beauty, hair, skincare",
    preview: "beauty",
  },
  {
    value: "cosmetics",
    label: "Cosmetics",
    description:
      "A clean cosmetics storefront for skincare, serums, product storytelling, and ingredient-led trust.",
    bestFor: "Cosmetics, skincare",
    preview: "cosmetics",
  },
  {
    value: "minimalistic",
    label: "Minimalistic",
    description:
      "A clean supplement-inspired storefront with soft neutrals, rounded product cards, and wellness storytelling.",
    bestFor: "Wellness brands",
    preview: "minimal",
  },
];
