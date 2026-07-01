/**
 * Parse CSV/XLSX files into product data for AI processing.
 */

export type ParsedProduct = {
  name: string;
  price: number;
  description?: string;
  category?: string;
  stock_quantity?: number;
  image_url?: string;
  currency?: string;
  sku?: string;
};

type RawRow = Record<string, string>;

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]+/g, "_").trim();
}

function parseSingleValue(raw: string | undefined): string {
  return (raw ?? "").trim();
}

function parseNumberValue(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/[,$£€₦\s]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? undefined : num;
}

/**
 * Parse a CSV/XLSX file buffer into an array of product objects.
 * Handles common header naming variations (Name/Product Name/product_name, Price/Unit Price, etc.)
 */
export async function parseProductFile(file: File): Promise<ParsedProduct[]> {
  const buffer = await file.arrayBuffer();
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });

  if (!rows.length) return [];

  // Normalize header keys
  const normalized: Record<string, string>[] = rows.map((row) => {
    const mapped: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      mapped[normalizeKey(key)] = String(value ?? "");
    }
    return mapped;
  });

  return normalized
    .map((row) => {
      const name =
        parseSingleValue(row.product_name || row.name || row.title || row.item);
      const price = parseNumberValue(row.price || row.unit_price || row.cost || row.amount);

      if (!name || !price || price <= 0) return null;

      return {
        name,
        price,
        description: parseSingleValue(row.description || row.desc || row.details) || undefined,
        category: parseSingleValue(row.category || row.type || row.group) || undefined,
        stock_quantity: parseNumberValue(
          row.stock_quantity || row.stock || row.quantity || row.qty || row.inventory,
        ),
        image_url: parseSingleValue(row.image_url || row.image || row.photo || row.picture) || undefined,
        currency: parseSingleValue(row.currency) || undefined,
        sku: parseSingleValue(row.sku || row.code || row.product_code) || undefined,
      };
    })
    .filter((p): p is ParsedProduct => p !== null);
}

/**
 * Format parsed products as readable text for the AI to process.
 */
export function formatProductsForAi(products: ParsedProduct[]): string {
  if (!products.length) return "";

  const lines = products.map((p, i) => {
    const parts = [`${i + 1}. ${p.name} — ${p.price} ${p.currency ?? "NGN"}`];
    if (p.description) parts.push(`   ${p.description}`);
    if (p.category) parts.push(`   Category: ${p.category}`);
    if (p.stock_quantity) parts.push(`   Stock: ${p.stock_quantity}`);
    if (p.sku) parts.push(`   SKU: ${p.sku}`);
    return parts.join("\n");
  });

  return `[Parsed from uploaded file — ${products.length} product(s)]\n\n${lines.join("\n")}\n\nAdd these products to my store.`;
}
