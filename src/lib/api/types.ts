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

export type StorefrontTemplateId = "classic" | "editorial" | "bold_grid" | "fashion_lookbook";
export type StorefrontTemplateChoice = StorefrontTemplateId | "ai_pick";

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

export const INDUSTRY_OPTIONS: { value: Industry; label: string }[] = [
  { value: "food_and_beverage", label: "Food & Beverage" },
  { value: "fashion_and_apparel", label: "Fashion & Apparel" },
  { value: "beauty_and_skincare", label: "Beauty & Skincare" },
  { value: "electronics", label: "Electronics" },
  { value: "home_and_living", label: "Home & Living" },
  { value: "services", label: "Services" },
  { value: "other", label: "Other" },
];

export const STOREFRONT_TEMPLATE_OPTIONS: {
  value: StorefrontTemplateChoice;
  label: string;
  description: string;
  bestFor: string;
  preview: "balanced" | "editorial" | "grid" | "lookbook" | "spark";
}[] = [
  {
    value: "ai_pick",
    label: "Let AI choose",
    description: "We pick the best template for the merchant's industry and brand tone.",
    bestFor: "Fast setup",
    preview: "spark",
  },
  {
    value: "classic",
    label: "Classic Commerce",
    description: "A balanced storefront with a clear hero, featured products, and trust blocks.",
    bestFor: "Most shops",
    preview: "balanced",
  },
  {
    value: "editorial",
    label: "Editorial Brand",
    description: "A more premium, story-led layout for lifestyle and beauty businesses.",
    bestFor: "Fashion, beauty, home",
    preview: "editorial",
  },
  {
    value: "fashion_lookbook",
    label: "Fashion Lookbook",
    description:
      "A clothing-brand homepage with campaign imagery, curated edits, and product drops.",
    bestFor: "Clothing brands",
    preview: "lookbook",
  },
  {
    value: "bold_grid",
    label: "Bold Product Grid",
    description: "A product-forward template with stronger catalog emphasis.",
    bestFor: "Electronics, food, high-volume catalog",
    preview: "grid",
  },
];
