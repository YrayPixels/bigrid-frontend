"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { notFound } from "next/navigation";
import { StoreShell } from "@/components/storefront/store-shell";
import { storefrontApi } from "@/lib/api/storefront";
import { CartProvider } from "@/lib/storefront/cart-context";
import { StorefrontProvider } from "@/lib/storefront/store-context";

export function StorefrontGate({ slug, children }: { slug: string; children: React.ReactNode }) {
  const query = useQuery({
    queryKey: ["public-storefront", slug],
    queryFn: () => storefrontApi.getBySlug(slug),
  });

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

  return (
    <StorefrontProvider value={query.data}>
      <CartProvider storeId={query.data.store.id}>
        <StoreShell>{children}</StoreShell>
      </CartProvider>
    </StorefrontProvider>
  );
}
