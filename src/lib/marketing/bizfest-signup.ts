export const BIZFEST_APPLY_HREF = "/grants/apply";
/** @deprecated Prefer BIZFEST_APPLY_HREF — application form is the primary CTA */
export const BIZFEST_SIGNUP_HREF = BIZFEST_APPLY_HREF;

export const BIZFEST_SOCIAL_LINKS = [
  {
    id: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/biz_grid/",
  },
  {
    id: "tiktok",
    label: "TikTok",
    href: "https://www.tiktok.com/@biz_grid",
  },
  {
    id: "x",
    label: "X",
    href: "https://x.com/biz_grid",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/137043993",
  },
] as const;

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
