export type ParsedPlace = {
  formattedAddress: string;
  streetAddress: string;
  city: string;
  state: string;
  area: string;
  placeId: string | null;
};

type AddressComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

function componentByType(
  components: AddressComponent[],
  type: string,
): AddressComponent | undefined {
  return components.find((component) => component.types.includes(type));
}

function firstComponent(
  components: AddressComponent[],
  types: string[],
): AddressComponent | undefined {
  for (const type of types) {
    const match = componentByType(components, type);
    if (match) return match;
  }
  return undefined;
}

/** Parse Google Places address_components into shipping-friendly fields. */
export function parseGooglePlace(place: {
  formatted_address?: string;
  name?: string;
  place_id?: string;
  address_components?: AddressComponent[];
}): ParsedPlace {
  const components = place.address_components ?? [];
  const city =
    firstComponent(components, ["locality", "postal_town", "administrative_area_level_2"])
      ?.long_name ?? "";
  const state =
    firstComponent(components, ["administrative_area_level_1"])?.long_name ?? "";
  const area =
    firstComponent(components, [
      "neighborhood",
      "sublocality_level_1",
      "sublocality",
      "sublocality_level_2",
    ])?.long_name ?? "";

  const streetNumber = componentByType(components, "street_number")?.long_name ?? "";
  const route = componentByType(components, "route")?.long_name ?? "";
  const streetFromParts = [streetNumber, route].filter(Boolean).join(" ").trim();
  const formattedAddress = (place.formatted_address ?? "").trim();
  const streetAddress =
    streetFromParts ||
    (place.name && !formattedAddress.startsWith(place.name)
      ? place.name
      : formattedAddress) ||
    formattedAddress;

  return {
    formattedAddress: formattedAddress || streetAddress,
    streetAddress: streetAddress || formattedAddress,
    city,
    state,
    area,
    placeId: place.place_id ?? null,
  };
}

export function googleMapsApiKey(): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return key || null;
}

export function isGooglePlacesEnabled(): boolean {
  return Boolean(googleMapsApiKey());
}
