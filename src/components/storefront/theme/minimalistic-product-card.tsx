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
      className="relative aspect-square overflow-hidden rounded-xl sm:rounded-2xl"
      style={{ backgroundColor: `${theme.palette.surface}` }}
    >
      <div className="absolute inset-2 overflow-hidden rounded-lg bg-white/70 sm:inset-4 sm:rounded-xl">
        <EditableImage
          path={imagePath}
          src={imageUrl}
          alt={product.name}
          className="h-full w-full"
          imgClassName="object-contain object-center p-1.5 transition duration-500 group-hover:scale-[1.04] sm:p-3"
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

      <div className="mt-3 flex min-h-0 flex-1 flex-col sm:mt-4">
        {categoryLabel ? (
          <p
            className="text-[9px] font-semibold uppercase tracking-[0.14em] sm:text-[10px]"
            style={{ color: theme.palette.muted }}
          >
            {categoryLabel}
          </p>
        ) : null}

        {editable ? (
          <h3
            className={cn(
              "line-clamp-2 text-[0.8125rem] font-semibold leading-snug tracking-[-0.02em] sm:text-[0.95rem]",
              categoryLabel ? "mt-1 sm:mt-1.5" : "",
            )}
            style={{ color: theme.palette.text }}
          >
            {product.name}
          </h3>
        ) : (
          <Link href={`/products/${product.slug}`} className="block">
            <h3
              className={cn(
                "line-clamp-2 text-[0.8125rem] font-semibold leading-snug tracking-[-0.02em] transition group-hover:opacity-80 sm:text-[0.95rem]",
                categoryLabel ? "mt-1 sm:mt-1.5" : "",
              )}
              style={{ color: theme.palette.text }}
            >
              {product.name}
            </h3>
          </Link>
        )}

        {description ? (
          <p
            className="mt-1 hidden line-clamp-2 text-[12px] leading-5 sm:mt-1.5 sm:block"
            style={{ color: theme.palette.muted }}
          >
            {description}
          </p>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-2 pt-3 sm:gap-3 sm:pt-4">
          <div className="min-w-0">
            <p
              className="text-sm font-semibold tracking-[-0.02em] sm:text-base"
              style={{ color: theme.palette.text }}
            >
              {formatMoney(priced.unitPrice, product.currency)}
            </p>
            {priced.compareAtPrice != null ? (
              <p
                className="mt-0.5 text-[10px] font-medium line-through sm:text-[11px]"
                style={{ color: theme.palette.muted }}
              >
                {formatMoney(priced.compareAtPrice, product.currency)}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={addToCart}
            disabled={editable || !inStock}
            aria-label={inStock ? `Add ${product.name} to cart` : `${product.name} sold out`}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:opacity-90 disabled:cursor-default disabled:opacity-55 sm:h-10 sm:w-auto sm:gap-1.5 sm:px-3.5 sm:text-[11px] sm:font-semibold"
            style={{
              backgroundColor: theme.palette.primary,
              color: theme.palette.background,
            }}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{inStock ? "Add" : "Sold out"}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
