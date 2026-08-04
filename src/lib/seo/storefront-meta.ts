/** Storefront / product title helpers for richer SEO. */

export function formatProductMetaTitle(input: {
  productName: string;
  storeName: string;
  cityHint?: string | null;
}): string {
  const base = `${input.productName} — ${input.storeName}`;
  if (input.cityHint) {
    const withCity = `${input.productName} – ${input.storeName} | Delivery in ${input.cityHint}`;
    return withCity.length <= 70 ? withCity : base.slice(0, 60);
  }
  return base.length <= 70 ? base : `${input.productName} | ${input.storeName}`.slice(0, 60);
}

export function formatProductMetaDescription(input: {
  productName: string;
  storeName: string;
  description?: string | null;
  cityHint?: string | null;
}): string {
  const trimmed = input.description?.trim();
  if (trimmed && trimmed.length >= 50) {
    return trimmed.length > 160 ? `${trimmed.slice(0, 157)}...` : trimmed;
  }

  const city = input.cityHint ? ` Free delivery messaging in ${input.cityHint}.` : "";
  const text = `Buy ${input.productName} from ${input.storeName} on Bizgrid.${city} Secure online checkout.`;
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

export function resolveStoreCityHint(input: {
  shippingCities?: Array<string | null | undefined>;
  businessLocation?: string | null;
}): string | null {
  for (const city of input.shippingCities ?? []) {
    if (city?.trim()) return city.trim();
  }
  if (input.businessLocation === "nigeria") return "Nigeria";
  if (input.businessLocation === "kenya") return "Kenya";
  return null;
}

export function countryCodeFromBusinessLocation(location?: string | null): string | null {
  if (location === "kenya") return "kenya";
  if (location === "nigeria") return "nigeria";
  return null;
}
