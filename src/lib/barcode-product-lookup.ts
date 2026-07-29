export type BarcodeLookupResult = {
  name?: string;
  brand?: string;
  description?: string;
  image_url?: string;
};

/**
 * Best-effort public barcode enrichment. Failures are silent — the scan flow
 * still creates an archived product with just the barcode.
 */
export async function lookupBarcodeProduct(
  barcode: string,
): Promise<BarcodeLookupResult | null> {
  const code = barcode.trim();
  if (!code) return null;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`,
      {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      },
    );
    if (!res.ok) return null;

    const json = (await res.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        product_name_en?: string;
        brands?: string;
        generic_name?: string;
        image_front_url?: string;
        image_url?: string;
      };
    };

    if (json.status !== 1 || !json.product) return null;

    const product = json.product;
    const name =
      product.product_name?.trim() ||
      product.product_name_en?.trim() ||
      product.generic_name?.trim() ||
      undefined;
    const brand = product.brands?.split(",")[0]?.trim() || undefined;
    const image_url = product.image_front_url || product.image_url || undefined;

    if (!name && !brand && !image_url) return null;

    return {
      name,
      brand,
      description: product.generic_name?.trim() || undefined,
      image_url,
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}
