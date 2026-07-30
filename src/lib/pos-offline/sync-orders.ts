import { api } from "@/lib/api/client";
import {
  listUnsyncedPendingOrders,
  updatePendingOrder,
  type PendingPosOrder,
  isBrowserOnline,
} from "@/lib/pos-offline/db";

let syncing = false;

export type PosOrderSyncResult = {
  synced: number;
  failed: number;
  errors: Array<{ client_order_id: string; message: string }>;
};

export async function syncPendingPosOrders(
  storeId?: string,
): Promise<PosOrderSyncResult> {
  if (!isBrowserOnline() || syncing) {
    return { synced: 0, failed: 0, errors: [] };
  }

  syncing = true;
  const result: PosOrderSyncResult = { synced: 0, failed: 0, errors: [] };

  try {
    const queue = await listUnsyncedPendingOrders(storeId);
    for (const pending of queue) {
      await updatePendingOrder(pending.client_order_id, {
        status: "syncing",
        last_error: null,
      });

      try {
        const order = await api.createPosOrder({
          ...pending.payload,
          client_order_id: pending.client_order_id,
          placed_at: pending.payload.placed_at ?? pending.local_receipt.placed_at,
        });

        await updatePendingOrder(pending.client_order_id, {
          status: "pending",
          server_order_id: order.id,
          last_error: null,
        });
        result.synced += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Sync failed";
        await updatePendingOrder(pending.client_order_id, {
          status: "error",
          last_error: message,
        });
        result.failed += 1;
        result.errors.push({
          client_order_id: pending.client_order_id,
          message,
        });
      }
    }
  } finally {
    syncing = false;
  }

  return result;
}

export function startPosOrderSyncLoop(options?: {
  storeId?: string;
  onResult?: (result: PosOrderSyncResult) => void;
}): () => void {
  let stopped = false;

  const run = async () => {
    if (stopped) return;
    const result = await syncPendingPosOrders(options?.storeId);
    if (!stopped && (result.synced > 0 || result.failed > 0)) {
      options?.onResult?.(result);
    }
  };

  void run();
  const interval = window.setInterval(() => {
    void run();
  }, 30_000);

  const onOnline = () => {
    void run();
  };
  window.addEventListener("online", onOnline);

  return () => {
    stopped = true;
    window.clearInterval(interval);
    window.removeEventListener("online", onOnline);
  };
}

export type { PendingPosOrder };
