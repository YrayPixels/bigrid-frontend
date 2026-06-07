"use client";

import Link from "next/link";
import { toast } from "sonner";
import type { StoreProduct } from "@/lib/api/types";
import { useCart } from "@/lib/storefront/cart-context";
import { formatMoney } from "@/lib/storefront/format";
import { useStorefront } from "@/lib/storefront/store-context";
import { PageContainer } from "@/components/storefront/theme/page-container";
import { PrimaryButton } from "@/components/storefront/theme/primary-button";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

export function ProductDetailPageView({ product }: { product: StoreProduct | null }) {
  const { store } = useStorefront();
  const { theme, mode } = useStorefrontTheme();
  const { addItem } = useCart();

  if (!product) {
    return (
      <PageContainer className="text-center">
        <h1 className="text-3xl font-bold" style={{ fontFamily: theme.displayFont }}>
          Product not found
        </h1>
        {mode !== "edit" ? (
          <Link
            href="/products"
            className="mt-4 inline-block text-sm font-semibold"
            style={{ color: theme.brandColor }}
          >
            Back to products
          </Link>
        ) : null}
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="grid gap-10 lg:grid-cols-2">
        <div
          className="flex aspect-square items-center justify-center rounded-3xl text-6xl font-bold text-white"
          style={{
            background: `linear-gradient(135deg, ${theme.brandColor}, ${theme.brandColor}88)`,
          }}
        >
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full rounded-3xl object-cover"
            />
          ) : (
            product.name.slice(0, 1)
          )}
        </div>
        <div>
          {mode !== "edit" ? (
            <Link href="/products" className="text-sm text-muted-foreground hover:text-foreground">
              Back to products
            </Link>
          ) : null}
          <h1
            className="mt-4 text-4xl font-bold tracking-tight"
            style={{ fontFamily: theme.displayFont }}
          >
            {product.name}
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">{product.description}</p>
          <div className="mt-6 text-2xl font-semibold" style={{ color: theme.brandColor }}>
            {formatMoney(product.price, product.currency)}
          </div>
          {product.variants?.length ? (
            <div className="mt-6 space-y-4">
              {product.variants.map((variant) => (
                <div key={variant.name}>
                  <div className="text-sm font-semibold">{variant.name}</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {variant.options.map((option) => (
                      <span
                        key={option}
                        className="rounded-full border px-3 py-1 text-sm text-muted-foreground"
                      >
                        {option}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {product.perks?.length ? (
            <div className="mt-6 rounded-2xl border bg-card p-4">
              <h2 className="text-sm font-semibold">Why customers like it</h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {product.perks.map((perk) => (
                  <li key={perk}>{perk}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <PrimaryButton
            className="mt-8"
            onClick={() => {
              addItem(product);
              toast.success("Added to cart");
            }}
          >
            Add to cart
          </PrimaryButton>
        </div>
      </div>
    </PageContainer>
  );
}
