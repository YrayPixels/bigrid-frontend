import type { StoreProduct } from "@/lib/api/types";
import type { PlatformCatalogStore } from "@/lib/api/platform-catalog";
import {
  cartLineUnitPrice,
  defaultSelectedOptions,
  type SelectedOptions,
} from "@/lib/storefront/cart-line";
import {
  isProductInStock,
  maxPurchaseQuantity,
  productAvailabilityError,
} from "@/lib/storefront/product-availability";

export function summarizePlatformProduct(
  store: PlatformCatalogStore,
  product: StoreProduct,
  selectedOptions?: SelectedOptions,
) {
  const variants = product.variants ?? [];
  const price = cartLineUnitPrice(product, selectedOptions);

  return {
    store_slug: store.slug,
    store_name: store.business_name,
    store_url: store.storefront_url,
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    price,
    currency: product.currency,
    compare_at_price: product.compare_at_price ?? null,
    discount_label: product.discount_label ?? null,
    category: product.category ?? null,
    in_stock: isProductInStock(product),
    image_url: product.image_url,
    product_url: `${store.storefront_url.replace(/\/$/, "")}/products/${product.slug}`,
    checkout_url: `${store.storefront_url.replace(/\/$/, "")}/checkout`,
    variants:
      variants.length > 0
        ? variants.map((group) => ({
            name: group.name,
            options: group.options.map((option) =>
              typeof option === "string" ? option : option.value,
            ),
          }))
        : null,
    selected_options: selectedOptions ?? null,
  };
}

export function parseSelectedOptions(
  product: StoreProduct,
  raw: unknown,
): { options?: SelectedOptions; error?: string } {
  const groups = product.variants ?? [];
  if (!groups.length) return { options: undefined };

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    const defaults = defaultSelectedOptions(groups);
    if (Object.keys(defaults).length > 0) return { options: defaults };
    return {
      error: `Product "${product.name}" requires variant options. Pass selected_options as an object, e.g. {"Size":"M"}.`,
    };
  }

  const options = Object.fromEntries(
    Object.entries(raw as Record<string, unknown>).filter(
      ([key, value]) => typeof key === "string" && typeof value === "string" && value.trim() !== "",
    ),
  ) as SelectedOptions;

  if (Object.keys(options).length === 0) {
    const defaults = defaultSelectedOptions(groups);
    if (Object.keys(defaults).length > 0) return { options: defaults };
    return {
      error: `Product "${product.name}" requires variant options. Pass selected_options as an object.`,
    };
  }

  return { options };
}

export function validateAddToCart(
  product: StoreProduct,
  quantity: number,
): { ok: true } | { ok: false; error: string; product_id?: string } {
  const availabilityError = productAvailabilityError(product);
  if (availabilityError) {
    return { ok: false, error: availabilityError, product_id: product.id };
  }

  const maxQty = maxPurchaseQuantity(product);
  if (maxQty != null && quantity > maxQty) {
    return {
      ok: false,
      error: `Only ${maxQty} unit(s) available for "${product.name}".`,
      product_id: product.id,
    };
  }

  return { ok: true };
}
