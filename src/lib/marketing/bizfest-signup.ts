export const BIZFEST_APPLY_HREF = "/grants/apply";
/** @deprecated Prefer BIZFEST_APPLY_HREF — application form is the primary CTA */
export const BIZFEST_SIGNUP_HREF = BIZFEST_APPLY_HREF;

export const BIZFEST_CATEGORIES = [
  "Fashion",
  "Beauty & cosmetics",
  "Food & beverage",
  "Electronics",
  "Home & lifestyle",
  "Accessories",
  "Services",
  "Retail",
  "Other",
] as const;

export const BIZFEST_HOW_HEARD = [
  "Instagram",
  "Facebook",
  "TikTok",
  "WhatsApp",
  "Google",
  "Friend / referral",
  "Event / flyer",
  "Other",
] as const;

export const BIZFEST_SELL_CHANNELS = [
  "WhatsApp only",
  "Instagram only",
  "WhatsApp + Instagram",
  "Physical shop",
  "Physical shop + social",
  "Other online marketplace",
  "Other",
] as const;
