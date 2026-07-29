import type { PublicStorefront } from "@/lib/api/types";

export type ShippingLocation = NonNullable<
  NonNullable<PublicStorefront["checkout"]>["shipping_locations"]
>[number];

export type ShippingQuote = {
  deliveryFee: number;
  locationId: string | null;
  locationName: string | null;
  freeShippingApplied: boolean;
  matchReason: string | null;
};

function scoreLocation(
  location: ShippingLocation,
  haystack: string,
): number {
  let score = 0;
  const city = (location.city ?? "").trim().toLowerCase();
  const state = (location.state ?? "").trim().toLowerCase();
  const area = (location.area ?? "").trim().toLowerCase();
  const name = (location.name ?? "").trim().toLowerCase();

  if (city && haystack.includes(city)) score += 3;
  if (state && haystack.includes(state)) score += 2;
  if (area && haystack.includes(area)) score += 4;
  if (name && name !== "main" && haystack.includes(name)) score += 1;

  return score;
}

export function quoteDeliveryFee(input: {
  deliveryMethod: "delivery" | "pickup";
  deliveryAddress?: string;
  city?: string;
  state?: string;
  subtotal: number;
  defaultDeliveryFee: number;
  locations?: ShippingLocation[] | null;
}): ShippingQuote {
  if (input.deliveryMethod !== "delivery") {
    return {
      deliveryFee: 0,
      locationId: null,
      locationName: null,
      freeShippingApplied: false,
      matchReason: "pickup",
    };
  }

  const locations = input.locations ?? [];
  const defaultFee = Math.max(0, Number(input.defaultDeliveryFee) || 0);
  const haystack = [input.city, input.state, input.deliveryAddress]
    .map((part) => String(part ?? "").trim().toLowerCase())
    .filter(Boolean)
    .join(" ");

  let matched: ShippingLocation | null = null;
  if (locations.length) {
    if (!haystack) {
      matched = locations.find((row) => row.is_default) ?? locations[0] ?? null;
    } else {
      let bestScore = 0;
      for (const location of locations) {
        const score = scoreLocation(location, haystack);
        if (score > bestScore) {
          bestScore = score;
          matched = location;
        }
      }
      if (bestScore <= 0) {
        matched = locations.find((row) => row.is_default) ?? locations[0] ?? null;
      }
    }
  }

  if (!matched) {
    return {
      deliveryFee: defaultFee,
      locationId: null,
      locationName: null,
      freeShippingApplied: false,
      matchReason: null,
    };
  }

  let fee = matched.delivery_fee != null ? Number(matched.delivery_fee) : defaultFee;
  let freeShipping = false;
  if (matched.free_shipping_enabled) {
    const min = matched.free_shipping_min_subtotal != null
      ? Number(matched.free_shipping_min_subtotal)
      : 0;
    if (input.subtotal >= min) {
      fee = 0;
      freeShipping = true;
    }
  }

  return {
    deliveryFee: Math.max(0, Math.round(fee * 100) / 100),
    locationId: matched.id,
    locationName: matched.name,
    freeShippingApplied: freeShipping,
    matchReason: freeShipping ? "free_shipping" : "location_rate",
  };
}
