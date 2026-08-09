"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { StoreShell } from "@/components/storefront/store-shell";
import { storefrontApi } from "@/lib/api/storefront";
import { CartProvider } from "@/lib/storefront/cart-context";
import { CartRefreshEffect } from "@/lib/storefront/cart-refresh-effect";
import { StorefrontProvider } from "@/lib/storefront/store-context";
import { StorefrontThemeProvider } from "@/lib/storefront/theme-context";
import { getStorefrontTheme, resolveStorefrontTemplate } from "@/lib/storefront/template";
import { usePathname } from "next/navigation";
import { DealieWidget } from "@/components/storefront/dealie-widget";
import type { PublicStorefront } from "@/lib/api/types";

export function StorefrontGate({
  slug,
  data,
  children,
}: {
  slug: string;
  data: PublicStorefront;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    if (!data || typeof window === "undefined") return;

    const key = "storehaus_visit_session";
    let sessionId = window.sessionStorage.getItem(key);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      window.sessionStorage.setItem(key, sessionId);
    }

    const sentKey = `storehaus_visit_sent:${slug}:${window.location.pathname}`;
    if (window.sessionStorage.getItem(sentKey) === "1") return;
    window.sessionStorage.setItem(sentKey, "1");

    void storefrontApi.recordVisit(slug, {
      session_id: sessionId,
      path: window.location.pathname,
      referrer: document.referrer || undefined,
    });
  }, [data, slug]);

  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const templateId = resolveStorefrontTemplate(data.store, data.storefront);
  const theme = getStorefrontTheme(
    templateId,
    data.store.brand_color,
    data.storefront.palette,
    data.storefront.display_font,
    data.storefront.theme_overrides,
  );

  const dealieVendorId = data.store.dealie_vendor_id ?? data.store.id;

  let currentProductId: string | undefined = undefined;
  if (pathname && pathname.includes("/products/")) {
    const parts = pathname.split("/products/");
    if (parts[1]) {
      currentProductId = parts[1].split("/")[0].split("?")[0];
    }
  }

  const isProductPage = Boolean(currentProductId && currentProductId.trim().length > 0);
  const isDealieEnabled = data.store.dealie_enabled !== false && isProductPage;

  return (
    <StorefrontProvider value={data}>
      <StorefrontThemeProvider theme={theme} mode="live">
        <CartProvider storeId={data.store.id}>
          <CartRefreshEffect />
          <StoreShell>{children}</StoreShell>
          {isProductPage && (
            <DealieWidget vendorId={dealieVendorId} productId={currentProductId} enabled={isDealieEnabled} />
          )}
        </CartProvider>
      </StorefrontThemeProvider>
    </StorefrontProvider>
  );
}

