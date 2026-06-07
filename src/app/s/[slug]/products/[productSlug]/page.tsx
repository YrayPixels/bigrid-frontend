"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useCart } from "@/lib/storefront/cart-context";
import { formatMoney } from "@/lib/storefront/format";
import { useStorefront } from "@/lib/storefront/store-context";

export default function ProductDetailPage() {
  const params = useParams<{ productSlug: string }>();
  const { store, storefront } = useStorefront();
  const { addItem } = useCart();
  const product = (storefront.products ?? []).find((entry) => entry.slug === params.productSlug);

  if (!product) {
    return (
      <div className="w-full px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-3xl font-bold">Product not found</h1>
        <Link
          href="/products"
          className="mt-4 inline-block text-sm font-semibold"
          style={{ color: store.brand_color }}
        >
          Back to products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid w-full gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2">
      <div
        className="flex aspect-square items-center justify-center rounded-3xl text-6xl font-bold text-white"
        style={{
          background: `linear-gradient(135deg, ${store.brand_color}, ${store.brand_color}88)`,
        }}
      >
        {product.name.slice(0, 1)}
      </div>
      <div>
        <Link href="/products" className="text-sm text-muted-foreground hover:text-foreground">
          Back to products
        </Link>
        <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">{product.name}</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">{product.description}</p>
        <div className="mt-6 text-2xl font-semibold" style={{ color: store.brand_color }}>
          {formatMoney(product.price, product.currency)}
        </div>
        <button
          type="button"
          className="mt-8 rounded-md px-6 py-3 text-sm font-semibold text-white"
          style={{ backgroundColor: store.brand_color }}
          onClick={() => {
            addItem(product);
            toast.success("Added to cart");
          }}
        >
          Add to cart
        </button>
      </div>
    </div>
  );
}
