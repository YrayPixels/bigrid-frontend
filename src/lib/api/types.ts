import type { StorefrontBlock } from "@/lib/storefront/blocks/types";
import type { CodeFile } from "@/lib/code-fs";
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
  email_verified_at?: string | null;
  has_store: boolean;
  impersonating?: boolean;
  role?: "owner" | "manager" | "cashier" | null;
  can_access_admin?: boolean;
  can_sell?: boolean;
  can_manage_staff?: boolean;
  default_location_id?: string | null;
  redirect?: string;
};

export function postAuthPath(user: User): string {
  if (user.redirect) return user.redirect;
  if (user.role === "cashier" || (user.can_sell && !user.can_access_admin)) {
    return "/sell";
  }
  return user.has_store ? "/admin" : "/admin/onboarding";
}

export function isEmailVerified(user: User | null | undefined): boolean {
  return Boolean(user?.email_verified_at);
}

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

export type StorefrontTemplateType = "json" | "bolt";

export type JsonStorefrontTemplateId =
  | "classic"
  | "editorial"
  | "bold_grid"
  | "fashion_lookbook"
  | "minimalistic"
  | "beauty"
  | "cosmetics";

export type BoltStorefrontTemplateId = "furniture-hardware" | "hair-and-fashion";

export type StorefrontTemplateId = JsonStorefrontTemplateId | BoltStorefrontTemplateId;
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
  checkout_enabled?: boolean;
  payouts_configured?: boolean;
  payout_account_name?: string | null;
  payout_bank_name?: string | null;
  payout_account_number?: string | null;
  subscription_plan?: string | null;
  subscription_status?: string | null;
  notifications?: StoreNotificationSettings;
  shipping?: StoreShippingSettings;
  store_perks?: string[];
};

export type StoreDomainVerification = {
  txt_host: string;
  txt_value: string;
  cname_host: string;
  cname_target: string;
  txt_verified: boolean;
  cname_verified: boolean;
};

export type StoreDomain = {
  id: string;
  hostname: string;
  status: "pending" | "verified" | string;
  is_primary: boolean;
  verified_at?: string | null;
  verification: StoreDomainVerification;
};

export type StoreDomainsResponse = {
  domains: StoreDomain[];
  meta: {
    allowed: boolean;
    max_domains: number;
    used: number;
    subdomain_host: string;
  };
};

export type StoreNotificationSettings = {
  notify_merchant_new_order: boolean;
  notify_customer_order_confirmation: boolean;
  notify_customer_payment_confirmation: boolean;
  notify_merchant_low_stock: boolean;
  notification_email: string | null;
  customer_order_note: string | null;
  sms_sender_name: string | null;
};

export type StoreShippingSettings = {
  allow_local_delivery: boolean;
  allow_pickup: boolean;
  default_delivery_fee: number | null;
  fulfilment_promise: string | null;
  shipping_policy?: string | null;
  return_policy?: string | null;
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
  slug?: string;
  industry?: Industry;
  description?: string;
  contact_email?: string | null;
  contact_phone?: string | null;
  brand_color?: string;
  logo_url?: string | null;
  business_location?: BusinessLocation;
  weekly_orders?: WeeklyOrderRange;
  payment_currencies?: PaymentCurrency[];
  staff_count?: StaffCountRange;
  physical_store_count?: PhysicalStoreCount;
  notify_merchant_new_order?: boolean;
  notify_customer_order_confirmation?: boolean;
  notify_customer_payment_confirmation?: boolean;
  notify_merchant_low_stock?: boolean;
  notification_email?: string | null;
  customer_order_note?: string | null;
  sms_sender_name?: string | null;
  store_perks?: string[];
  allow_local_delivery?: boolean;
  allow_pickup?: boolean;
  default_delivery_fee?: number | null;
  fulfilment_promise?: string | null;
  shipping_policy?: string | null;
  return_policy?: string | null;
};

export type SubscriptionPlanId = "free" | "starter" | "growth" | "scale";

export type SubscriptionLimit = {
  label: string;
  value: string;
};

export type MerchantUsageMetric = {
  label: string;
  used?: number;
  cap?: number | null;
  used_ngn?: number;
  cap_ngn?: number | null;
};

export type MerchantMessagingBalance = {
  remaining: number;
  included_monthly: number;
  included_remaining: number;
  purchased_balance: number;
};

export type MerchantAiUsage = {
  daily_limit: number;
  used_today: number;
  remaining_today: number;
  purchased_remaining: number;
};

export type MerchantSubscriptionUsage = {
  processing: MerchantUsageMetric;
  stores: MerchantUsageMetric;
  customers: MerchantUsageMetric;
  sms: MerchantMessagingBalance;
  whatsapp: MerchantMessagingBalance;
  ai: MerchantAiUsage;
  limits: SubscriptionLimit[];
};

export type MerchantSubscription = {
  plan: SubscriptionPlanId;
  plan_name: string;
  price_label: string | null;
  is_free?: boolean;
  /** Per-order service fee charged on this plan, e.g. 2.5 for 2.5%. */
  transaction_fee_percent?: number;
  status: string;
  renews_at: string | null;
  limits: SubscriptionLimit[];
  usage?: MerchantSubscriptionUsage;
  has_payment_method: boolean;
  billing_configured: boolean;
};

export type BillingPlanOption = {
  id: SubscriptionPlanId;
  name: string;
  price_label: string;
  price_monthly_ngn?: number;
  description: string;
  features: string[];
  limits: SubscriptionLimit[];
  transaction_fee_percent?: number;
  is_free?: boolean;
  available: boolean;
};

export type BillingAddOnPack = {
  id: string;
  type: "sms" | "whatsapp" | "ai_credits";
  units: number | null;
  credits: number | null;
  price_label: string;
  available: boolean;
};

export type BillingAddOns = {
  sms: BillingAddOnPack[];
  whatsapp: BillingAddOnPack[];
  ai_credits: BillingAddOnPack[];
};

export type BillingSubscriptionResponse = {
  subscription: MerchantSubscription;
  plans: BillingPlanOption[];
  add_ons: BillingAddOns;
};

export type BillingCheckoutResponse =
  | {
      mode: "checkout";
      checkout_url: string;
      session_id: string | null;
    }
  | {
      mode: "plan_change";
      subscription: MerchantSubscription;
      message: string;
    };

export type BillingPortalResponse = {
  portal_url: string;
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
  sale_price?: number | null;
  effective_price?: number;
  compare_at_price?: number | null;
  discount_label?: string | null;
  currency: string;
  image_url: string | null;
  /** Gallery URLs; first entry mirrors image_url (cover). */
  images?: string[] | null;
  sku?: string;
  barcode?: string | null;
  brand?: string | null;
  category?: string;
  category_id?: string | null;
  stock_quantity?: number;
  status?: "active" | "draft" | "archived";
  in_stock?: boolean;
  low_stock?: boolean;
  variants?: Array<{
    name: string;
    options: Array<
      | string
      | {
          value: string;
          price?: number | null;
          image_url?: string | null;
        }
    >;
  }>;
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

export type StoreProductReview = {
  id: string;
  author_name: string;
  rating: number;
  body: string;
  created_at: string;
};

export type StoreProductReviewsResponse = {
  average_rating: number;
  review_count: number;
  reviews: StoreProductReview[];
};

export type StoreProductReviewInput = {
  author_name: string;
  author_email?: string;
  rating: number;
  body: string;
};

export type StorefrontEditMetadata = {
  locked_paths?: string[];
  user_edited_paths?: string[];
  ai_generated_paths?: string[];
  last_generation_prompt?: string | null;
  last_generated_at?: string | null;
};

export type StorefrontThemeButtonStyle = "rounded" | "square" | "pill";
export type StorefrontThemeButtonRadius = "none" | "md" | "full";
export type StorefrontThemeDensity = "compact" | "default" | "airy";
export type StorefrontThemeBodyFont = "clean-sans" | "modern-sans" | "elegant-serif";

/** Optional style tokens. Unset keys keep the template’s standard look. */
export type StorefrontThemeOverrides = {
  button_style?: StorefrontThemeButtonStyle;
  button_radius?: StorefrontThemeButtonRadius;
  density?: StorefrontThemeDensity;
  body_font?: StorefrontThemeBodyFont;
};

export type StorefrontContent = {
  template?: {
    id: StorefrontTemplateId;
    source: "merchant_selected" | "ai_selected";
  };
  palette?: StorefrontColorPalette;
  display_font?: string;
  theme_overrides?: StorefrontThemeOverrides;
  custom_code?: string;
  custom_files?: CodeFile[];
  data_plugs?: {
    home_products_source?: "merchant_products" | "theme_products";
  };
  media?: {
    hero_image_url?: string | null;
    hero_video_url?: string | null;
    about_image_url?: string | null;
    category_images?: (string | null)[];
  };
  hero: { headline: string; subheadline: string; cta_label: string; eyebrow?: string | null };
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

export type BuilderPendingAddProduct = {
  name: string;
  price?: number;
  description?: string;
  category?: string;
  stock_quantity?: number;
  image_url?: string;
};

export type BuilderPendingAwaitKind = "price" | "product_name" | "text";

/** Multi-turn clarification: resume the original tool after the merchant answers. */
export type BuilderPendingAction =
  | {
      type: "add_products";
      products: BuilderPendingAddProduct[];
      find_images?: boolean;
      question?: string;
      original_message?: string;
    }
  | {
      type: "resume_tool";
      tool: string;
      arguments: Record<string, unknown>;
      /** Argument key to fill from the merchant's reply (e.g. product_name, price, instruction). */
      await_field?: string;
      await_kind?: BuilderPendingAwaitKind;
      question?: string;
      original_message?: string;
    }
  | {
      type: "clarification";
      question: string;
      original_message?: string;
    };

export type BuilderBusinessProfile = {
  business_name?: string | null;
  description?: string | null;
  industry?: Industry | null;
  brand_color?: string | null;
  tone?: string[];
  /** Resume multi-turn work after a clarifying question (price, which product, etc.). */
  pending_action?: BuilderPendingAction | null;
  /** Most recently discussed/edited product — used for "it" / "again" follow-ups. */
  last_product_focus?: {
    product_id?: string;
    product_name: string;
  } | null;
};

export type BuilderMessageRole = "user" | "assistant";

export type BuilderMediaTarget =
  | "media.hero_image_url"
  | "media.hero_video_url"
  | "media.about_image_url";

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
  discounts?: StoreDiscount[];
  checkout?: {
    payments_enabled: boolean;
    paystack_public_key: string | null;
    allow_local_delivery?: boolean;
    allow_pickup?: boolean;
    default_delivery_fee?: number;
    fulfilment_promise?: string | null;
    shipping_locations?: Array<{
      id: string;
      name: string;
      city?: string | null;
      state?: string | null;
      area?: string | null;
      delivery_fee?: number | null;
      free_shipping_enabled?: boolean;
      free_shipping_min_subtotal?: number | null;
      is_default?: boolean;
    }>;
    /** Platform service fee added to the shopper's total, e.g. 2.5 for 2.5%. */
    service_fee_percent?: number;
    service_fee_label?: string | null;
  };
};

export type StoreDiscountType = "product" | "cart_threshold" | "seasonal";
export type StoreDiscountValueType = "percent" | "fixed";
export type StoreDiscountStatus = "active" | "draft" | "archived";

export type StoreDiscount = {
  id: string;
  name: string;
  type: StoreDiscountType;
  discount_type: StoreDiscountValueType;
  discount_value: number;
  min_subtotal?: number | null;
  product_ids?: string[];
  starts_at?: string | null;
  ends_at?: string | null;
  status: StoreDiscountStatus;
  priority?: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type CreateStoreDiscountInput = {
  name: string;
  type: StoreDiscountType;
  discount_type: StoreDiscountValueType;
  discount_value: number;
  min_subtotal?: number | null;
  product_ids?: string[];
  starts_at?: string | null;
  ends_at?: string | null;
  status?: StoreDiscountStatus;
  priority?: number;
};

export type UpdateStoreDiscountInput = Partial<CreateStoreDiscountInput>;

export type PublishedStorefrontIndexEntry = {
  slug: string;
  business_name: string;
  published_at: string | null;
  logo_url?: string | null;
  banner_url?: string | null;
  brand_color?: string | null;
  industry?: Industry | string | null;
  description?: string | null;
};

export type StoreOrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type StorePaymentStatus =
  | "pending"
  | "awaiting_payment"
  | "paid"
  | "refunded"
  | string;

export type StoreOrderItem = {
  product_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
  currency: string;
  image_url?: string | null;
  selected_options?: Record<string, string>;
};

export type StoreOrder = {
  id: string;
  client_order_id?: string | null;
  order_number: string;
  invoice_number?: string | null;
  store_customer_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  delivery_address: string;
  delivery_method?: "delivery" | "pickup" | string;
  delivery_fee?: number;
  tracking_number?: string | null;
  status: StoreOrderStatus;
  payment_status: StorePaymentStatus;
  payment_method?: "paystack" | "cash" | "bank_transfer" | string | null;
  payment_reference?: string | null;
  amount_tendered?: number | null;
  source?: "online" | "pos" | string;
  location_id?: string | null;
  location_name?: string | null;
  cashier_user_id?: string | null;
  cashier_name?: string | null;
  paystack_reference?: string | null;
  settlement_status?: string | null;
  currency: string;
  subtotal: number;
  discount_amount?: number;
  discount_label?: string | null;
  /** Platform service fee the shopper paid on top of the merchant's amount. */
  platform_fee_amount?: number;
  platform_fee_percent?: number;
  /** What the merchant is owed at settlement: total_amount less platform_fee_amount. */
  merchant_amount?: number;
  total_amount: number;
  items: StoreOrderItem[];
  notes: string | null;
  placed_at: string | null;
  paid_at?: string | null;
  shipped_at?: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type StoreLocation = {
  id: string;
  name: string;
  city?: string | null;
  state?: string | null;
  area?: string | null;
  delivery_fee?: number | null;
  free_shipping_enabled?: boolean;
  free_shipping_min_subtotal?: number | null;
  is_default: boolean;
  created_at?: string | null;
};

export type MerchantStaffMember = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: "manager" | "cashier";
  status: "invited" | "active" | "disabled";
  default_location_id: string | null;
  default_location_name?: string | null;
  created_at?: string | null;
};

export type PosCatalogProduct = {
  id: string;
  name: string;
  sku: string | null;
  barcode?: string | null;
  price: number;
  sale_price: number | null;
  effective_price: number;
  currency: string;
  image_url: string | null;
  stock_quantity: number | null;
  variants: Array<{
    name: string;
    options: Array<
      | string
      | {
          value: string;
          price?: number | null;
          image_url?: string | null;
        }
    >;
  }> | Record<string, unknown>[] | unknown;
  category_id: string | null;
};

export type PosLookupResponse = {
  match: "exact" | "ambiguous" | "candidates" | "none";
  product: PosCatalogProduct | null;
  candidates: PosCatalogProduct[];
  query?: string;
};

export type PosCatalogResponse = {
  store: { id: string; name: string; currency: string; logo_url?: string | null };
  categories: Array<{ id: string; name: string }>;
  products: PosCatalogProduct[];
};

export type PosCatalogSyncResponse = PosCatalogResponse & {
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    synced_at: string;
  };
};

export type CreatePosOrderInput = {
  items: Array<{
    product_id: string;
    quantity: number;
    selected_options?: Record<string, string>;
  }>;
  payment_method: "cash" | "bank_transfer";
  payment_reference?: string | null;
  amount_tendered?: number | null;
  location_id?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  notes?: string | null;
  client_order_id?: string | null;
  placed_at?: string | null;
};

export type CreateStaffInput = {
  name: string;
  email: string;
  password: string;
  role: "manager" | "cashier";
  location_id?: string | null;
};

export type UpdateStaffInput = {
  name?: string;
  role?: "manager" | "cashier";
  status?: "active" | "disabled";
  location_id?: string | null;
};

export type StoreCustomer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  orders_count: number;
  total_spent: number;
  first_order_at: string | null;
  last_order_at: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  orders?: {
    id: string;
    order_number: string;
    invoice_number?: string | null;
    status: string;
    payment_status: string;
    total_amount: number;
    currency: string;
    placed_at: string | null;
  }[];
};

export type StoreCustomersResponse = {
  data: StoreCustomer[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
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
  processing_orders?: number;
  shipped_orders?: number;
  delivered_orders?: number;
  fulfilled_orders: number;
  cancelled_orders?: number;
  total_sales: number;
  average_order_value: number;
  total_visits: number;
  visits_today: number;
  visits_last_30_days?: number;
  conversion_rate: number;
  products_count: number;
};

export type MerchantDashboardTopProduct = {
  product_id: string;
  name: string;
  image_url?: string | null;
  unit_price: number;
  currency: string;
  quantity_sold: number;
  total_earning: number;
};

export type MerchantDashboardTrafficSource = {
  source: string;
  count: number;
  percentage: number;
};

export type MerchantDashboardStatusCount = {
  status: string;
  label: string;
  count: number;
};

export type MerchantDashboardOverview = {
  location_id?: string;
  locations?: StoreLocation[];
  metrics: MerchantDashboardMetrics;
  sales_by_day: { date: string; orders: number; sales: number }[];
  top_products?: MerchantDashboardTopProduct[];
  traffic_sources?: MerchantDashboardTrafficSource[];
  orders_by_status?: MerchantDashboardStatusCount[];
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
  delivery_city?: string;
  delivery_state?: string;
  delivery_method?: "delivery" | "pickup";
  notes?: string;
  callback_url?: string;
  session_token?: string;
  items: {
    product_id: string;
    quantity: number;
    selected_options?: Record<string, string>;
  }[];
};

export type PaystackCheckoutPayment = {
  provider: "paystack";
  public_key: string;
  reference: string;
  access_code?: string | null;
  authorization_url?: string | null;
  amount: number;
  currency: string;
};

export type PlaceOrderResponse = {
  order: StoreOrder;
  payment?: PaystackCheckoutPayment;
};

export type StorePaymentSettings = {
  checkout_enabled: boolean;
  payouts_configured: boolean;
  payout_account_name: string | null;
  payout_bank_name: string | null;
  payout_account_number: string | null;
};

export type UpdateStorePaymentSettingsInput = {
  payout_account_name?: string;
  payout_bank_name?: string;
  payout_account_number?: string;
};

export type SocialPostStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed";

export type SocialPostInsights = {
  permalink_url?: string | null;
  reach?: number | null;
  clicks?: number | null;
  reactions?: number | null;
  comments?: number | null;
  shares?: number | null;
  saved?: number | null;
};

export type SocialPost = {
  id: string;
  provider: string;
  post_type?: "text" | "image" | "video" | string;
  status: SocialPostStatus;
  message: string;
  link_url: string | null;
  image_url?: string | null;
  video_url?: string | null;
  external_post_id: string | null;
  external_url?: string | null;
  publish_id?: string | null;
  scheduled_for?: string | null;
  approved_at?: string | null;
  insights?: SocialPostInsights | null;
  insights_synced_at?: string | null;
  sentiment?: PostSentiment | null;
  attempts?: number;
  editable?: boolean;
  error_message: string | null;
  published_at: string | null;
  created_at: string | null;
};

export type FacebookPageConnection = {
  id: string;
  provider: string;
  page_id: string;
  name: string;
  status?: string;
  token_expires_at?: string | null;
  expiring_soon?: boolean;
  instagram_connected?: boolean;
};

export type SocialConnectionWarning = {
  connection_id: string;
  provider: string;
  account_name: string | null;
  status: "expiring" | "invalid" | string;
  expires_at: string | null;
  message: string;
};

export type AdCampaignObjective =
  | "OUTCOME_TRAFFIC"
  | "OUTCOME_AWARENESS"
  | "OUTCOME_ENGAGEMENT";

export type AdCampaignStatus =
  | "draft"
  | "publishing"
  | "paused"
  | "active"
  | "failed"
  | "archived";

export type AdCampaignCreative = {
  message: string;
  headline?: string;
  description?: string;
  link_url: string;
  image_url?: string;
  call_to_action?: string;
};

export type AdCampaignTargeting = {
  countries?: string[];
  cities?: unknown[];
  age_min?: number;
  age_max?: number;
  genders?: number[];
  interests?: unknown[];
};

export type AdCampaignMetrics = {
  impressions?: number;
  reach?: number;
  clicks?: number;
  spend?: number;
  ctr?: number;
  cpc?: number;
};

export type AdCampaign = {
  id: string;
  name: string;
  objective: AdCampaignObjective | string;
  status: AdCampaignStatus;
  daily_budget_minor: number;
  currency: string;
  start_at: string | null;
  end_at: string | null;
  targeting: AdCampaignTargeting | null;
  creative: AdCampaignCreative | null;
  metrics: AdCampaignMetrics | null;
  metrics_synced_at: string | null;
  external_campaign_id: string | null;
  launched: boolean;
  error_message: string | null;
  created_at: string | null;
};

export type AdAccount = {
  id: string;
  account_id: string;
  name: string;
  currency: string;
  active: boolean;
};

export type MarketingTotals = {
  posts: number;
  reach: number;
  engagement: number;
  clicks: number;
};

export type PostSentiment = {
  label: "positive" | "neutral" | "negative" | null;
  score: number | null;
  summary: string;
  sample_size: number;
};

export type AudienceAgeBucket = {
  bucket: string;
  male: number;
  female: number;
  total: number;
};

export type AudienceCountry = {
  code: string;
  name: string;
  count: number;
  share: number;
};

export type MarketingAudience = {
  available: boolean;
  suppressed_reason: string | null;
  total_audience: number;
  top_age_bucket: string | null;
  age_gender: AudienceAgeBucket[];
  countries: AudienceCountry[];
  top_country: AudienceCountry | null;
  captured_at: string | null;
  channels: string[];
};

export type PostingWindow = {
  label: string;
  posts: number;
  engagement: number;
  reach: number;
  avg_engagement: number;
  avg_reach: number;
  peak_hour: number;
  intensity: number;
  intent: "high" | "medium" | "low";
};

export type BestTimeToPost = {
  confident: boolean;
  sample_size: number;
  min_sample: number;
  reason: string | null;
  windows: PostingWindow[];
  best_window: PostingWindow | null;
  best_hour: number | null;
};

export type MarketingPerformance = {
  window_days: number;
  totals: MarketingTotals;
  previous_totals: MarketingTotals;
  deltas: {
    posts: number | null;
    reach: number | null;
    engagement: number | null;
    clicks: number | null;
  };
  has_comparison: boolean;
  by_channel: Array<{
    provider: string;
    posts: number;
    reach: number;
    engagement: number;
  }>;
  top_posts: SocialPost[];
  ads: {
    spend: number;
    impressions: number;
    clicks: number;
    active_campaigns: number;
    currency: string | null;
  };
  last_synced_at: string | null;
  awaiting_first_sync: boolean;
};

export type CreateSocialPostInput = {
  provider: "facebook" | "instagram" | "tiktok_creator";
  message: string;
  link_url?: string;
  image_url?: string;
  video_url?: string;
  social_connection_id?: number;
};

export type UpdateSocialPostInput = {
  message?: string;
  link_url?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  social_connection_id?: number | null;
};

export type SaveAdCampaignInput = {
  name: string;
  objective?: AdCampaignObjective;
  daily_budget_minor: number;
  start_at?: string | null;
  end_at?: string | null;
  targeting?: AdCampaignTargeting;
  creative: AdCampaignCreative;
};

export type MarketingStatus = {
  facebook: {
    configured: boolean;
    connected: boolean;
    pages: FacebookPageConnection[];
  };
  instagram: {
    configured: boolean;
    connected: boolean;
    username: string | null;
    account_id: string | null;
    linked_page: string | null;
    capabilities: {
      image_required: boolean;
      max_caption_length: number;
      video_supported: boolean;
    };
  };
  whatsapp: {
    configured: boolean;
    connected: boolean;
    display_phone_number: string | null;
    phone_number_id: string | null;
    auto_reply_enabled: boolean;
    webhook_url: string;
  };
  tiktok: {
    configured: boolean;
    connected: boolean;
    account_name: string | null;
    business_account_id: string | null;
    auto_reply_enabled: boolean;
    capabilities: {
      inbound_only: boolean;
      reply_window_hours: number;
      supports_outbound_marketing: boolean;
      supports_comment_to_dm: boolean;
      region_restricted: boolean;
      restricted_regions: string[];
    };
    webhook_url: string;
  };
  tiktok_content: {
    configured: boolean;
    connected: boolean;
    creator_username: string | null;
    open_id: string | null;
    capabilities: {
      supports_video_posting: boolean;
      supports_photo_posting: boolean;
      requires_app_audit_for_public: boolean;
      max_caption_length: number;
      source_methods: string[];
    };
  };
  ads: {
    configured: boolean;
    connected: boolean;
    account_name: string | null;
    account_id: string | null;
    currency: string | null;
    capabilities: {
      objectives: Array<{ value: string; label: string }>;
      min_daily_budget_minor: number;
      max_daily_budget_minor: number;
    };
  };
  connection_warnings: SocialConnectionWarning[];
  recent_posts: SocialPost[];
  scheduled_posts: SocialPost[];
  recent_conversations: CustomerConversationSummary[];
};

export type PublishTikTokVideoInput = {
  video_url: string;
  caption: string;
};

export type CustomerConversationSummary = {
  id: string;
  channel: "whatsapp" | "tiktok" | string;
  external_user_id: string;
  external_user_name: string | null;
  status: string;
  last_message_at: string | null;
  latest_message?: string;
  latest_direction?: "inbound" | "outbound";
};

export type ConnectWhatsAppInput = {
  phone_number_id: string;
  display_phone_number: string;
  access_token: string;
  waba_id?: string;
};

export type ConnectTikTokInput = {
  business_account_id: string;
  account_name?: string;
  access_token: string;
};

export type UpdateMessagingSettingsInput = {
  whatsapp_auto_reply_enabled?: boolean;
  tiktok_auto_reply_enabled?: boolean;
};

export type MarketingChatResponse = {
  assistant_message: string;
  tool_calls: Array<{ name: string; arguments: Record<string, unknown> }>;
  tool_results: Array<Record<string, unknown>>;
  post: SocialPost | null;
  campaign: AdCampaign | null;
  status: MarketingStatus;
};

export type AbandonedRecoverySourceType = "checkout" | "cart";

export type AbandonedRecoveryOutreach = {
  id: string;
  channel: "email" | "whatsapp";
  status: string;
  sent_at: string | null;
  created_at: string | null;
};

export type AbandonedRecoveryItem = {
  id: string;
  source_type: AbandonedRecoverySourceType;
  source_id: string;
  kind: AbandonedRecoverySourceType;
  order_number: string | null;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  items: StoreOrderItem[];
  total_amount: number;
  currency: string;
  abandoned_at: string | null;
  recovery_url: string;
  last_outreach: AbandonedRecoveryOutreach | null;
};

export type AbandonedRecoveryResponse = {
  summary: {
    total: number;
    checkout_count: number;
    cart_count: number;
    recoverable_value: number;
  };
  items: AbandonedRecoveryItem[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
};

export type AbandonedRecoveryDraft = {
  subject: string | null;
  message: string;
  recovery_url: string;
};

export type AbandonedRecoverySendResponse = {
  ok: boolean;
  mode: "sent" | "link_ready";
  whatsapp_url?: string | null;
  outreach?: AbandonedRecoveryOutreach;
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
  | "furniture"
  | "hair_fashion"
  | "spark";

export type StorefrontTemplateOption = {
  id?: StorefrontTemplateId;
  value: StorefrontTemplateChoice;
  type?: StorefrontTemplateType;
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
    value: "minimalistic",
    type: "json",
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
  {
    value: "fashion_lookbook",
    type: "json",
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
    type: "json",
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
    type: "json",
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
    value: "furniture-hardware",
    type: "json",
    label: "Furniture & Hardware",
    description:
      "A premium furniture storefront with room collections, category grids, and editorial product storytelling.",
    bestFor: "Furniture, home decor",
    best_for: ["furniture stores", "home decor", "hardware retailers"],
    industries: ["home_and_living"],
    tone_tags: ["premium", "editorial", "warm"],
    visual_tags: ["room-led", "catalog-rich", "image-forward"],
    product_types: ["physical"],
    preview: "furniture",
    required_content_slots: ["hero", "about", "products"],
    optional_content_slots: ["categoryHighlights", "roomCollections"],
    origin: "platform",
    generation_status: "active",
    default_palette: {
      primary: "#2C2416",
      accent: "#C4A574",
      background: "#FAF7F2",
      surface: "#FFFFFF",
      text: "#2C2416",
      muted: "#7A6E5E",
      border: "#E8E0D4",
    },
  },
  {
    value: "hair-and-fashion",
    type: "json",
    label: "Hair & Fashion",
    description:
      "A beauty-forward storefront for hair extensions, textures, and fashion accessories with editorial styling.",
    bestFor: "Hair, extensions, fashion",
    best_for: ["hair brands", "extension shops", "fashion accessories"],
    industries: ["beauty_and_skincare", "fashion_and_apparel"],
    tone_tags: ["editorial", "premium", "bold"],
    visual_tags: ["lookbook", "texture-led", "campaign-style"],
    product_types: ["physical"],
    preview: "hair_fashion",
    required_content_slots: ["hero", "about", "products"],
    optional_content_slots: ["textureFeature", "styleGallery"],
    origin: "platform",
    generation_status: "active",
    default_palette: {
      primary: "#1A1410",
      accent: "#D4A574",
      background: "#FDF8F3",
      surface: "#FFFFFF",
      text: "#1A1410",
      muted: "#7A6B5E",
      border: "#EDE4D8",
    },
  },
];
