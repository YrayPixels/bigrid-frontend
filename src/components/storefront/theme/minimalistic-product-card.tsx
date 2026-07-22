"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import type { StoreDiscount, StoreProduct } from "@/lib/api/types";
import { EditableImage } from "@/components/storefront/theme/editable-image";
import { formatMoney } from "@/lib/storefront/format";
import { useCart } from "@/lib/storefront/cart-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { requireVariantSelection } from "@/lib/storefront/cart-line";
import { productUnitPrice } from "@/lib/storefront/pricing";
import { isProductInStock } from "@/lib/storefront/product-availability";
import { minimalisticTemplateImages } from "@/lib/storefront/minimalistic-defaults";
import { cn } from "@/lib/utils";

function plainProductCopy(value?: string | null) {
  if (!value) return "";
  return value
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

type MinimalisticProductCardProps = {
  product: StoreProduct;
  index?: number;
  imagePath?: string;
  editable?: boolean;
  discounts?: StoreDiscount[] | null;
  onNavigateToProduct?: (slug: string) => void;
  className?: string;
};

export function MinimalisticProductCard({
  product,
  index = 0,
  imagePath,
  editable = false,
  discounts,
  onNavigateToProduct,
  className,
}: MinimalisticProductCardProps) {
  const { addItem } = useCart();
  const { theme } = useStorefrontTheme();
  const imageUrl =
    product.image_url ??
    minimalisticTemplateImages.products[index % minimalisticTemplateImages.products.length];
  const priced = productUnitPrice(product, discounts ?? []);
  const inStock = isProductInStock(product);
  const description = plainProductCopy(product.description);
  const categoryLabel = plainProductCopy(product.category);

  function addToCart() {
    if (editable) return;
    if (!inStock) {
      toast.error("This product is out of stock.");
      return;
    }
    if (product.variants?.some((group) => group.options?.length)) {
      onNavigateToProduct?.(product.slug);
      toast.message("Choose options on the product page");
      return;
    }
    const error = requireVariantSelection(product, {});
    if (error) {
      toast.error(error);
      return;
    }
    addItem(product, 1);
    toast.success("Added to cart");
  }

  const media = (
    <div
      className="relative aspect-square overflow-hidden rounded-2xl"
      style={{ backgroundColor: `${theme.palette.surface}` }}
    >
      <div className="absolute inset-3 overflow-hidden rounded-xl bg-white/70 sm:inset-4">
        <EditableImage
          path={imagePath}
          src={imageUrl}
          alt={product.name}
          className="h-full w-full"
          imgClassName="object-contain object-center p-2 transition duration-500 group-hover:scale-[1.04] sm:p-3"
        />
      </div>
    </div>
  );

  return (
    <article className={cn("group flex h-full flex-col text-left", className)}>
      {editable ? (
        <div className="block">{media}</div>
      ) : (
        <Link href={`/products/${product.slug}`} className="block">
          {media}
        </Link>
      )}

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        {categoryLabel ? (
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: theme.palette.muted }}
          >
            {categoryLabel}
          </p>
        ) : null}

        {editable ? (
          <h3
            className={cn(
              "line-clamp-2 text-[0.95rem] font-semibold leading-snug tracking-[-0.02em]",
              categoryLabel ? "mt-1.5" : "",
            )}
            style={{ color: theme.palette.text }}
          >
            {product.name}
          </h3>
        ) : (
          <Link href={`/products/${product.slug}`} className="block">
            <h3
              className={cn(
                "line-clamp-2 text-[0.95rem] font-semibold leading-snug tracking-[-0.02em] transition group-hover:opacity-80",
                categoryLabel ? "mt-1.5" : "",
              )}
              style={{ color: theme.palette.text }}
            >
              {product.name}
            </h3>
          </Link>
        )}

        {description ? (
          <p
            className="mt-1.5 line-clamp-2 text-[12px] leading-5"
            style={{ color: theme.palette.muted }}
          >
            {description}
          </p>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div className="min-w-0">
            <p className="text-base font-semibold tracking-[-0.02em]" style={{ color: theme.palette.text }}>
              {formatMoney(priced.unitPrice, product.currency)}
            </p>
            {priced.compareAtPrice != null ? (
              <p className="mt-0.5 text-[11px] font-medium line-through" style={{ color: theme.palette.muted }}>
                {formatMoney(priced.compareAtPrice, product.currency)}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={addToCart}
            disabled={editable || !inStock}
            aria-label={inStock ? `Add ${product.name} to cart` : `${product.name} sold out`}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[11px] font-semibold transition hover:opacity-90 disabled:cursor-default disabled:opacity-55"
            style={{
              backgroundColor: theme.palette.primary,
              color: theme.palette.background,
            }}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            {inStock ? "Add" : "Sold out"}
          </button>
        </div>
      </div>
    </article>
  );
}
