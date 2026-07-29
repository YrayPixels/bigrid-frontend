import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { googleMapsApiKey } from "@/lib/places/parse-place";

let loadPromise: Promise<typeof google.maps> | null = null;
let optionsConfigured = false;

/** Load Maps JS + Places library once. Rejects if API key is missing. */
export async function loadGoogleMaps(): Promise<typeof google.maps> {
  if (typeof window === "undefined") {
    throw new Error("Google Maps can only load in the browser.");
  }

  if (window.google?.maps?.places) {
    return window.google.maps;
  }

  if (loadPromise) return loadPromise;

  const apiKey = googleMapsApiKey();
  if (!apiKey) {
    throw new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set.");
  }

  loadPromise = (async () => {
    if (!optionsConfigured) {
      setOptions({
        key: apiKey,
        v: "weekly",
        libraries: ["places"],
      });
      optionsConfigured = true;
    }
    await importLibrary("places");
    if (!window.google?.maps?.places) {
      throw new Error("Google Maps Places library failed to load.");
    }
    return window.google.maps;
  })().catch((err) => {
    loadPromise = null;
    throw err;
  });

  return loadPromise;
}
