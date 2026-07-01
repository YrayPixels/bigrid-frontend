"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { notFound } from "next/navigation";
import { StoreShell } from "@/components/storefront/store-shell";
import { storefrontApi } from "@/lib/api/storefront";
import { CartProvider } from "@/lib/storefront/cart-context";
import { StorefrontProvider } from "@/lib/storefront/store-context";
import { StorefrontThemeProvider } from "@/lib/storefront/theme-context";
import { getStorefrontTheme, resolveStorefrontTemplate } from "@/lib/storefront/template";

export function StorefrontGate({ slug, children }: { slug: string; children: React.ReactNode }) {
  const query = useQuery({
    queryKey: ["public-storefront", slug],
    queryFn: () => storefrontApi.getBySlug(slug),
  });

  useEffect(() => {
    if (!query.data || typeof window === "undefined") return;

    const key = "storehaus_visit_session";
    let sessionId = window.sessionStorage.getItem(key);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      window.sessionStorage.setItem(key, sessionId);
    }

    void storefrontApi.recordVisit(slug, {
      session_id: sessionId,
      path: window.location.pathname,
      referrer: document.referrer || undefined,
    });
  }, [query.data, slug]);

  if (query.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    notFound();
  }

  const templateId = resolveStorefrontTemplate(query.data.store, query.data.storefront);
  const theme = getStorefrontTheme(
    templateId,
    query.data.store.brand_color,
    query.data.storefront.palette,
    query.data.storefront.display_font,
  );

  return (
    <StorefrontProvider value={query.data}>
      <StorefrontThemeProvider theme={theme} mode="live">
        <CartProvider storeId={query.data.store.id}>
          <StoreShell>{children}</StoreShell>
        </CartProvider>
      </StorefrontThemeProvider>
    </StorefrontProvider>
  );
}
