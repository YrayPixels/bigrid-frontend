"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { StoreProduct } from "@/lib/api/types";
import {
  cartLineKey,
  cartLineUnitPrice,
  defaultSelectedOptions,
  type SelectedOptions,
} from "@/lib/storefront/cart-line";
import type { CartOutfit } from "@/lib/storefront/outfit-look";

export type CartLine = {
  product: StoreProduct;
  quantity: number;
  selectedOptions?: SelectedOptions;
  outfit?: CartOutfit;
};

type CartContextValue = {
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  addItem: (product: StoreProduct, quantity?: number, selectedOptions?: SelectedOptions, outfit?: CartOutfit) => void;
  addLookItems: (products: StoreProduct[], outfit: CartOutfit) => void;
  removeItem: (lineKey: string) => void;
  setQuantity: (lineKey: string, quantity: number) => void;
  clear: () => void;
  refreshLines: (liveProducts: StoreProduct[]) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function storageKey(storeId: string) {
  return `storehaus_cart_${storeId}`;
}

function lineIdentity(line: CartLine) {
  return cartLineKey(line.product.id, line.selectedOptions);
}

function resolveOptions(
  product: StoreProduct,
  selectedOptions?: SelectedOptions,
): SelectedOptions | undefined {
  const groups = product.variants ?? [];
  if (!groups.length) return undefined;
  if (selectedOptions && Object.keys(selectedOptions).length > 0) {
    return selectedOptions;
  }
  const defaults = defaultSelectedOptions(groups);
  return Object.keys(defaults).length > 0 ? defaults : undefined;
}

function normalizeLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const lines: CartLine[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const line = entry as CartLine;
    if (!line.product?.id || typeof line.quantity !== "number") continue;
    const selectedOptions =
      line.selectedOptions && typeof line.selectedOptions === "object"
        ? Object.fromEntries(
            Object.entries(line.selectedOptions).filter(
              ([name, value]) => typeof name === "string" && typeof value === "string",
            ),
          )
        : undefined;
    const outfit =
      line.outfit && typeof line.outfit === "object" && typeof line.outfit.id === "string"
        ? {
            id: line.outfit.id,
            name: typeof line.outfit.name === "string" ? line.outfit.name : "Your look",
            result_url:
              typeof line.outfit.result_url === "string" ? line.outfit.result_url : null,
          }
        : undefined;
    lines.push({
      product: line.product,
      quantity: line.quantity,
      ...(selectedOptions && Object.keys(selectedOptions).length > 0
        ? { selectedOptions }
        : {}),
      ...(outfit ? { outfit } : {}),
    });
  }
  return lines;
}

export function CartProvider({ storeId, children }: { storeId: string; children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(storageKey(storeId));
    if (!raw) {
      setLines([]);
      return;
    }
    try {
      setLines(normalizeLines(JSON.parse(raw)));
    } catch {
      setLines([]);
    }
  }, [storeId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey(storeId), JSON.stringify(lines));
  }, [lines, storeId]);

  const addItem = useCallback(
    (product: StoreProduct, quantity = 1, selectedOptions?: SelectedOptions, outfit?: CartOutfit) => {
      const options = resolveOptions(product, selectedOptions);
      const key = cartLineKey(product.id, options);
      setLines((current) => {
        const existing = current.find((line) => lineIdentity(line) === key);
        if (existing) {
          return current.map((line) =>
            lineIdentity(line) === key
              ? { ...line, quantity: line.quantity + quantity, ...(outfit ? { outfit } : {}) }
              : line,
          );
        }
        return [...current, { product, quantity, selectedOptions: options, ...(outfit ? { outfit } : {}) }];
      });
    },
    [],
  );

  const addLookItems = useCallback((products: StoreProduct[], outfit: CartOutfit) => {
    setLines((current) => {
      let next = [...current];
      for (const product of products) {
        const options = resolveOptions(product);
        const key = cartLineKey(product.id, options);
        const existing = next.find((line) => lineIdentity(line) === key);
        if (existing) {
          next = next.map((line) =>
            lineIdentity(line) === key
              ? { ...line, quantity: line.quantity + 1, outfit }
              : line,
          );
        } else {
          next = [...next, { product, quantity: 1, selectedOptions: options, outfit }];
        }
      }
      return next;
    });
  }, []);

  const removeItem = useCallback((lineKey: string) => {
    setLines((current) => current.filter((line) => lineIdentity(line) !== lineKey));
  }, []);

  const setQuantity = useCallback((lineKey: string, quantity: number) => {
    if (quantity <= 0) {
      setLines((current) => current.filter((line) => lineIdentity(line) !== lineKey));
      return;
    }
    setLines((current) =>
      current.map((line) => (lineIdentity(line) === lineKey ? { ...line, quantity } : line)),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const refreshLines = useCallback((liveProducts: StoreProduct[]) => {
    setLines((current) => {
      const productMap = new Map(liveProducts.map((p) => [p.id, p]));
      return current
        .map((line) => {
          const liveProduct = productMap.get(line.product.id);
          if (!liveProduct) return null;
          return { ...line, product: liveProduct };
        })
        .filter((line): line is CartLine => line !== null);
    });
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
    const subtotal = lines.reduce((sum, line) => {
      return sum + cartLineUnitPrice(line.product, line.selectedOptions) * line.quantity;
    }, 0);
    return { lines, itemCount, subtotal, addItem, addLookItems, removeItem, setQuantity, clear, refreshLines };
  }, [addItem, addLookItems, clear, lines, removeItem, setQuantity, refreshLines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}

export { cartLineKey };
