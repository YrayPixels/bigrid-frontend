export const BUSINESS_LOCATIONS = [
  { value: "nigeria", label: "Nigeria", flag: "🇳🇬" },
  { value: "kenya", label: "Kenya", flag: "🇰🇪" },
] as const;

export const WEEKLY_ORDER_RANGES = [
  { value: "0-50", label: "0 - 50" },
  { value: "51-100", label: "51 - 100" },
  { value: "101-1000", label: "101 - 1000" },
  { value: "1001+", label: "1001+" },
] as const;

export const PAYMENT_CURRENCY_OPTIONS = [
  { value: "NGN", label: "Naira" },
  { value: "KES", label: "KES" },
  { value: "USD", label: "USD" },
  { value: "GBP", label: "GBP" },
  { value: "CAD", label: "CAD" },
  { value: "others", label: "Others" },
] as const;

export const STAFF_COUNT_RANGES = [
  { value: "none", label: "None" },
  { value: "1-3", label: "1 - 3" },
  { value: "4-5", label: "4 - 5" },
  { value: "6-10", label: "6 - 10" },
  { value: "11+", label: "11+" },
] as const;

export const PHYSICAL_STORE_COUNTS = [
  { value: "none", label: "None" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4+", label: "4+" },
] as const;

export type BusinessLocation = (typeof BUSINESS_LOCATIONS)[number]["value"];
export type WeeklyOrderRange = (typeof WEEKLY_ORDER_RANGES)[number]["value"];
export type PaymentCurrency = (typeof PAYMENT_CURRENCY_OPTIONS)[number]["value"];
export type StaffCountRange = (typeof STAFF_COUNT_RANGES)[number]["value"];
export type PhysicalStoreCount = (typeof PHYSICAL_STORE_COUNTS)[number]["value"];

export type BusinessProfileInput = {
  business_location: BusinessLocation | null;
  weekly_orders: WeeklyOrderRange | null;
  payment_currencies: PaymentCurrency[];
  staff_count: StaffCountRange | null;
  physical_store_count: PhysicalStoreCount | null;
};

export function slugifyStore(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function isValidStoreSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2;
}

export function isBusinessProfileComplete(profile: BusinessProfileInput): boolean {
  return (
    !!profile.business_location &&
    !!profile.weekly_orders &&
    profile.payment_currencies.length > 0 &&
    !!profile.staff_count &&
    !!profile.physical_store_count
  );
}
