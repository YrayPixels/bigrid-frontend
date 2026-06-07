"use client";

import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { DefaultShell } from "./shell/default-shell";
import { FashionShell } from "./shell/fashion-shell";

export function StoreShell({ children }: { children: React.ReactNode }) {
  const { theme } = useStorefrontTheme();

  if (theme.shell === "fashion") {
    return <FashionShell>{children}</FashionShell>;
  }

  return <DefaultShell>{children}</DefaultShell>;
}
