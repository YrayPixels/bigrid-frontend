export const BIZFEST_APPLY_HREF = "/grants/apply";
export const BIZFEST_PARTNERS_HREF = "/grants/partners";
export const BIZFEST_SPONSORS_HREF = "/grants/sponsors";
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

export const BIZFEST_PARTNER_INQUIRY_TYPES = [
  { value: "partner", label: "Partner with us" },
] as const;

export const BIZFEST_SPONSOR_INTERESTS = [
  { value: "sponsorship", label: "Sponsorship package" },
  { value: "expo_booth", label: "Expo booth" },
  { value: "exhibition_space", label: "Exhibition / brand space" },
] as const;

export type BizfestSponsorInterest = "sponsorship" | "expo_booth" | "exhibition_space";

export const BIZFEST_SPONSOR_TIERS = [
  "Title sponsor",
  "Gold sponsor",
  "Silver sponsor",
  "Community partner",
  "Not sure — want to discuss",
] as const;

export const BIZFEST_EXPO_BOOTH_PACKAGES = [
  "Standard booth",
  "Premium booth",
  "Corner booth",
  "Not sure — send me options",
] as const;

export const BIZFEST_EXHIBITION_SPACE_PACKAGES = [
  "Brand wall / backdrop",
  "Demo zone",
  "Lounge / seating area",
  "Not sure — send me options",
] as const;

export const BIZFEST_FOUNDING_PARTNER_PLACEHOLDERS = [
  "Banking partner",
  "Media partner",
  "Logistics partner",
  "Technology partner",
  "SME ecosystem",
  "Community partner",
] as const;
