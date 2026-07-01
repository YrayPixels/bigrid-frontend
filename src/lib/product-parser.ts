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

  const result: ParsedProduct[] = [];

  for (const row of normalized) {
    const name =
      parseSingleValue(row.product_name || row.name || row.title || row.item);
    const price = parseNumberValue(row.price || row.unit_price || row.cost || row.amount);

    if (!name || !price || price <= 0) continue;

    const product: ParsedProduct = { name, price };

    const desc = parseSingleValue(row.description || row.desc || row.details);
    if (desc) product.description = desc;

    const cat = parseSingleValue(row.category || row.type || row.group);
    if (cat) product.category = cat;

    const stock = parseNumberValue(row.stock_quantity || row.stock || row.quantity || row.qty || row.inventory);
    if (stock !== undefined) product.stock_quantity = stock;

    const img = parseSingleValue(row.image_url || row.image || row.photo || row.picture);
    if (img) product.image_url = img;

    const cur = parseSingleValue(row.currency);
    if (cur) product.currency = cur;

    const code = parseSingleValue(row.sku || row.code || row.product_code);
    if (code) product.sku = code;

    result.push(product);
  }

  return result;
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
