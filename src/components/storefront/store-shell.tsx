"use client";

import { usePathname } from "next/navigation";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { BeautyShell } from "./shell/beauty-shell";
import { CosmeticsShell } from "./shell/cosmetics-shell";
import { DefaultShell } from "./shell/default-shell";
import { FashionShell } from "./shell/fashion-shell";
import { FurnitureShell } from "./shell/furniture-shell";
import { HairFashionShell } from "./shell/hair-fashion-shell";
import { MinimalisticShell } from "./shell/minimalistic-shell";

function isStorefrontHomePath(pathname: string): boolean {
  return pathname === "/" || /^\/s\/[^/]+$/.test(pathname);
}

function useShowTemplateShell(): boolean {
  const { shellChrome } = useStorefrontTheme();
  const pathname = usePathname();

  if (shellChrome === "content-only") return false;
  if (shellChrome === "full") return true;

  return !isStorefrontHomePath(pathname);
}

export function StoreShell({ children }: { children: React.ReactNode }) {
  const { theme } = useStorefrontTheme();
  const showChrome = useShowTemplateShell();

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

  if (theme.shell === "furniture") {
    if (!showChrome) return <>{children}</>;
    return <FurnitureShell>{children}</FurnitureShell>;
  }

  if (theme.shell === "hair_fashion") {
    if (!showChrome) return <>{children}</>;
    return <HairFashionShell>{children}</HairFashionShell>;
  }

  return <DefaultShell>{children}</DefaultShell>;
}
