"use client";

import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { BeautyHome } from "./home/beauty-home";
import { ClassicHome } from "./home/classic-home";
import { CosmeticsHome } from "./home/cosmetics-home";
import { FashionLookbookHome } from "./home/fashion-lookbook-home";
import { MinimalisticHome } from "./home/minimalistic-home";

export function HomePageView() {
  const { store, storefront } = useStorefront();
  const { theme } = useStorefrontTheme();

  if (theme.id === "fashion_lookbook") {
    return <FashionLookbookHome store={store} storefront={storefront} />;
  }

  if (theme.id === "minimalistic") {
    return <MinimalisticHome store={store} storefront={storefront} />;
  }

  if (theme.id === "beauty") {
    return <BeautyHome store={store} storefront={storefront} />;
  }

  if (theme.id === "cosmetics") {
    return <CosmeticsHome store={store} storefront={storefront} />;
  }

  if (theme.id === "editorial") {
    return <ClassicHome store={store} storefront={storefront} variant="editorial" />;
  }

  if (theme.id === "bold_grid") {
    return <ClassicHome store={store} storefront={storefront} variant="bold_grid" />;
  }

  return <ClassicHome store={store} storefront={storefront} variant="classic" />;
}
