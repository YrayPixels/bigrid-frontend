"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { PublicStorefront } from "@/lib/api/types";
import { normalizeStorefrontContent } from "@/lib/storefront/draft";

const StorefrontContext = createContext<PublicStorefront | null>(null);

export function StorefrontProvider({
  value,
  children,
}: {
  value: PublicStorefront;
  children: ReactNode;
}) {
  const normalizedValue = useMemo(
    () => ({
      ...value,
      storefront: normalizeStorefrontContent(value.storefront, value.store),
    }),
    [value],
  );

  return (
    <StorefrontContext.Provider value={normalizedValue}>{children}</StorefrontContext.Provider>
  );
}

export function useStorefront() {
  const context = useContext(StorefrontContext);
  if (!context) throw new Error("useStorefront must be used within StorefrontProvider");
  return context;
}
