"use client";

import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { BeautyShell } from "./shell/beauty-shell";
import { CosmeticsShell } from "./shell/cosmetics-shell";
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

  if (theme.shell === "beauty") {
    return <BeautyShell>{children}</BeautyShell>;
  }

  if (theme.shell === "cosmetics") {
    return <CosmeticsShell>{children}</CosmeticsShell>;
  }

  return <DefaultShell>{children}</DefaultShell>;
}
