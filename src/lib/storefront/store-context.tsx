"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PublicStorefront } from "@/lib/api/types";

const StorefrontContext = createContext<PublicStorefront | null>(null);

export function StorefrontProvider({
  value,
  children,
}: {
  value: PublicStorefront;
  children: ReactNode;
}) {
  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront() {
  const context = useContext(StorefrontContext);
  if (!context) throw new Error("useStorefront must be used within StorefrontProvider");
  return context;
}
