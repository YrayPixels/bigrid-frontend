import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type {
  CreatePosOrderInput,
  PosCatalogProduct,
  StoreLocation,
  StorePaymentSettings,
} from "@/lib/api/types";

const DB_NAME = "storehause-pos-offline";
const DB_VERSION = 1;

export type PendingPosOrderStatus = "pending" | "syncing" | "error";

export type PendingPosOrder = {
  client_order_id: string;
  store_id: string;
  payload: CreatePosOrderInput;
  local_receipt: {
    order_number: string;
    currency: string;
    subtotal: number;
    total_amount: number;
    payment_method: "cash" | "bank_transfer";
    amount_tendered: number | null;
    payment_reference: string | null;
    customer_name: string | null;
    customer_phone: string | null;
    items: Array<{
      product_id: string;
      name: string;
      quantity: number;
      unit_price: number;
      image_url: string | null;
    }>;
    placed_at: string;
  };
  status: PendingPosOrderStatus;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  server_order_id: string | null;
};

export type PosOfflineCatalog = {
  store_id: string;
  store: { id: string; name: string; currency: string };
  categories: Array<{ id: string; name: string }>;
  products: PosCatalogProduct[];
  locations: StoreLocation[];
  payment_info: StorePaymentSettings | null;
  synced_at: string;
};

type PosOfflineDB = DBSchema & {
  catalog: {
    key: string;
    value: PosOfflineCatalog;
  };
  pendingOrders: {
    key: string;
    value: PendingPosOrder;
    indexes: { "by-store": string; "by-status": string };
  };
};

let dbPromise: Promise<IDBPDatabase<PosOfflineDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<PosOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("catalog")) {
          db.createObjectStore("catalog", { keyPath: "store_id" });
        }
        if (!db.objectStoreNames.contains("pendingOrders")) {
          const store = db.createObjectStore("pendingOrders", {
            keyPath: "client_order_id",
          });
          store.createIndex("by-store", "store_id");
          store.createIndex("by-status", "status");
        }
      },
    });
  }
  return dbPromise;
}

export async function savePosCatalogCache(catalog: PosOfflineCatalog): Promise<void> {
  const db = await getDb();
  await db.put("catalog", catalog);
}

export async function getPosCatalogCache(
  storeId: string,
): Promise<PosOfflineCatalog | null> {
  const db = await getDb();
  return (await db.get("catalog", storeId)) ?? null;
}

export async function getAnyPosCatalogCache(): Promise<PosOfflineCatalog | null> {
  const db = await getDb();
  const all = await db.getAll("catalog");
  return all[0] ?? null;
}

export function filterCachedProducts(
  products: PosCatalogProduct[],
  filters: { search?: string; category_id?: string | null },
): PosCatalogProduct[] {
  const search = filters.search?.trim().toLowerCase() ?? "";
  const categoryId = filters.category_id || null;

  return products.filter((product) => {
    if (categoryId && product.category_id !== categoryId) return false;
    if (!search) return true;
    const haystack = [
      product.name,
      product.sku ?? "",
      product.barcode ?? "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(search);
  });
}

export function lookupCachedProduct(
  products: PosCatalogProduct[],
  code: string,
): {
  match: "exact" | "ambiguous" | "none";
  product: PosCatalogProduct | null;
  candidates: PosCatalogProduct[];
} {
  const normalized = code.trim().toLowerCase();
  if (!normalized) {
    return { match: "none", product: null, candidates: [] };
  }

  const exact = products.filter((product) => {
    const sku = product.sku?.trim().toLowerCase() ?? "";
    const barcode = product.barcode?.trim().toLowerCase() ?? "";
    return sku === normalized || barcode === normalized;
  });

  if (exact.length === 1) {
    return { match: "exact", product: exact[0]!, candidates: [] };
  }
  if (exact.length > 1) {
    return { match: "ambiguous", product: null, candidates: exact };
  }
  return { match: "none", product: null, candidates: [] };
}

export async function enqueuePendingOrder(order: PendingPosOrder): Promise<void> {
  const db = await getDb();
  await db.put("pendingOrders", order);
}

export async function listPendingOrders(storeId?: string): Promise<PendingPosOrder[]> {
  const db = await getDb();
  const all = storeId
    ? await db.getAllFromIndex("pendingOrders", "by-store", storeId)
    : await db.getAll("pendingOrders");
  return all.sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export async function listUnsyncedPendingOrders(
  storeId?: string,
): Promise<PendingPosOrder[]> {
  const all = await listPendingOrders(storeId);
  return all.filter((row) => !row.server_order_id);
}

export async function getPendingOrder(
  clientOrderId: string,
): Promise<PendingPosOrder | null> {
  const db = await getDb();
  return (await db.get("pendingOrders", clientOrderId)) ?? null;
}

export async function updatePendingOrder(
  clientOrderId: string,
  patch: Partial<PendingPosOrder>,
): Promise<PendingPosOrder | null> {
  const db = await getDb();
  const existing = await db.get("pendingOrders", clientOrderId);
  if (!existing) return null;
  const next: PendingPosOrder = {
    ...existing,
    ...patch,
    updated_at: new Date().toISOString(),
  };
  await db.put("pendingOrders", next);
  return next;
}

export async function removePendingOrder(clientOrderId: string): Promise<void> {
  const db = await getDb();
  await db.delete("pendingOrders", clientOrderId);
}

export function createClientOrderId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `pos-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isBrowserOnline(): boolean {
  if (typeof navigator === "undefined") return true;
  return navigator.onLine;
}
