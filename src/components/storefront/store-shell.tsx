"use client";

import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { DefaultShell } from "./shell/default-shell";
import { FashionShell } from "./shell/fashion-shell";
import { MinimalisticShell } from "./shell/minimalistic-shell";

export function StoreShell({ children }: { children: React.ReactNode }) {
  const { theme } = useStorefrontTheme();

  if (theme.shell === "fashion") {
    return <FashionShell>{children}</FashionShell>;
  }

  if (theme.shell === "minimalistic") {
    return <MinimalisticShell>{children}</MinimalisticShell>;
  }

  return <DefaultShell>{children}</DefaultShell>;
}
