import { api } from "@/lib/api/client";
import type { PosCatalogProduct, StoreLocation, StorePaymentSettings } from "@/lib/api/types";
import {
  getAnyPosCatalogCache,
  getPosCatalogCache,
  savePosCatalogCache,
  type PosOfflineCatalog,
} from "@/lib/pos-offline/db";

export async function warmPosOfflineCache(args?: {
  storeId?: string | null;
}): Promise<PosOfflineCatalog> {
  const products: PosCatalogProduct[] = [];
  let store = { id: "", name: "Store", currency: "NGN" };
  let categories: Array<{ id: string; name: string }> = [];
  let syncedAt = new Date().toISOString();

  let page = 1;
  let lastPage = 1;
  do {
    const pageData = await api.syncPosCatalog(page, 200);
    store = pageData.store;
    categories = pageData.categories;
    products.push(...pageData.products);
    lastPage = pageData.meta.last_page;
    syncedAt = pageData.meta.synced_at;
    page += 1;
  } while (page <= lastPage);

  let locations: StoreLocation[] = [];
  try {
    locations = await api.getLocations();
  } catch {
    locations = [];
  }

  let paymentInfo: StorePaymentSettings | null = null;
  try {
    paymentInfo = await api.getPosPaymentInfo();
  } catch {
    paymentInfo = null;
  }

  const catalog: PosOfflineCatalog = {
    store_id: store.id || args?.storeId || "unknown",
    store,
    categories,
    products,
    locations,
    payment_info: paymentInfo,
    synced_at: syncedAt,
  };

  await savePosCatalogCache(catalog);
  return catalog;
}

export async function readPosOfflineCache(
  storeId?: string | null,
): Promise<PosOfflineCatalog | null> {
  if (storeId) {
    const scoped = await getPosCatalogCache(storeId);
    if (scoped) return scoped;
  }
  return getAnyPosCatalogCache();
}
