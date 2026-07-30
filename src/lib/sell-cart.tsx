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
import type { PosCatalogProduct } from "@/lib/api/types";
import { resolveVariantSelection } from "@/lib/storefront/cart-line";

export type SellCartLine = {
  key: string;
  product_id: string;
  name: string;
  unit_price: number;
  currency: string;
  image_url: string | null;
  quantity: number;
  selected_options: Record<string, string>;
  stock_quantity: number | null;
};

type PersistedCart = {
  lines: SellCartLine[];
  customerName: string;
  customerPhone: string;
  locationId: string | null;
};

type SellCartContextValue = {
  lines: SellCartLine[];
  customerName: string;
  customerPhone: string;
  locationId: string | null;
  setCustomerName: (value: string) => void;
  setCustomerPhone: (value: string) => void;
  setLocationId: (value: string | null) => void;
  addProduct: (product: PosCatalogProduct, selectedOptions?: Record<string, string>) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
};

const SellCartContext = createContext<SellCartContextValue | null>(null);

const CART_STORAGE_PREFIX = "storehause_pos_cart:";

function storageKey(storeId: string | null | undefined) {
  return `${CART_STORAGE_PREFIX}${storeId || "default"}`;
}

function readPersistedCart(storeId: string | null | undefined): PersistedCart | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(storeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedCart;
    if (!parsed || !Array.isArray(parsed.lines)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writePersistedCart(storeId: string | null | undefined, cart: PersistedCart) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(storeId), JSON.stringify(cart));
  } catch {
    // Quota / private mode — ignore.
  }
}

function lineKey(productId: string, selectedOptions: Record<string, string>): string {
  const options = Object.keys(selectedOptions)
    .sort()
    .map((k) => `${k}:${selectedOptions[k]}`)
    .join("|");
  return `${productId}::${options}`;
}

export function SellCartProvider({
  children,
  storeId = null,
}: {
  children: ReactNode;
  storeId?: string | null;
}) {
  const [hydrated, setHydrated] = useState(false);
  const [lines, setLines] = useState<SellCartLine[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [locationId, setLocationId] = useState<string | null>(null);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(storeId ?? null);

  useEffect(() => {
    setActiveStoreId(storeId ?? null);
    const saved = readPersistedCart(storeId);
    if (saved) {
      setLines(saved.lines);
      setCustomerName(saved.customerName || "");
      setCustomerPhone(saved.customerPhone || "");
      setLocationId(saved.locationId);
    }
    setHydrated(true);
  }, [storeId]);

  useEffect(() => {
    if (!hydrated) return;
    writePersistedCart(activeStoreId, {
      lines,
      customerName,
      customerPhone,
      locationId,
    });
  }, [hydrated, activeStoreId, lines, customerName, customerPhone, locationId]);

  const addProduct = useCallback(
    (product: PosCatalogProduct, selectedOptions: Record<string, string> = {}) => {
      const key = lineKey(product.id, selectedOptions);
      const selection = resolveVariantSelection(
        {
          price: product.price,
          sale_price: product.sale_price,
          image_url: product.image_url,
          variants: Array.isArray(product.variants) ? product.variants : [],
        },
        selectedOptions,
      );
      const unitPrice = selection.optionPriceApplied
        ? selection.basePrice
        : product.effective_price;
      setLines((prev) => {
        const existing = prev.find((line) => line.key === key);
        if (existing) {
          return prev.map((line) =>
            line.key === key ? { ...line, quantity: line.quantity + 1 } : line,
          );
        }
        return [
          ...prev,
          {
            key,
            product_id: product.id,
            name: product.name,
            unit_price: unitPrice,
            currency: product.currency,
            image_url: selection.imageUrl ?? product.image_url,
            quantity: 1,
            selected_options: selectedOptions,
            stock_quantity: product.stock_quantity,
          },
        ];
      });
    },
    [],
  );

  const setQuantity = useCallback((key: string, quantity: number) => {
    setLines((prev) => {
      if (quantity <= 0) return prev.filter((line) => line.key !== key);
      return prev.map((line) => (line.key === key ? { ...line, quantity } : line));
    });
  }, []);

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((line) => line.key !== key));
  }, []);

  const clearCart = useCallback(() => {
    setLines([]);
    setCustomerName("");
    setCustomerPhone("");
  }, []);

  const itemCount = useMemo(
    () => lines.reduce((sum, line) => sum + line.quantity, 0),
    [lines],
  );
  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + line.unit_price * line.quantity, 0),
    [lines],
  );

  const value = useMemo(
    () => ({
      lines,
      customerName,
      customerPhone,
      locationId,
      setCustomerName,
      setCustomerPhone,
      setLocationId,
      addProduct,
      setQuantity,
      removeLine,
      clearCart,
      itemCount,
      subtotal,
    }),
    [
      lines,
      customerName,
      customerPhone,
      locationId,
      addProduct,
      setQuantity,
      removeLine,
      clearCart,
      itemCount,
      subtotal,
    ],
  );

  return <SellCartContext.Provider value={value}>{children}</SellCartContext.Provider>;
}

export function useSellCart() {
  const ctx = useContext(SellCartContext);
  if (!ctx) throw new Error("useSellCart must be used within SellCartProvider");
  return ctx;
}
