"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, X } from "lucide-react";
import { toast } from "sonner";
import type { StoreCategory, StoreProduct } from "@/lib/api/types";
import { useCart } from "@/lib/storefront/cart-context";
import { useStorefront } from "@/lib/storefront/store-context";
import {
  categoryLabel,
  productMatchesCategoryFilter,
  resolveStorefrontFilterCategories,
  sortCatalogProducts,
} from "@/lib/storefront/category-filters";
import { useCategoryFilter } from "@/lib/storefront/use-category-filter";
import { requireVariantSelection } from "@/lib/storefront/cart-line";
import { productUnitPrice } from "@/lib/storefront/pricing";
import { isProductInStock } from "@/lib/storefront/product-availability";
import { PageContainer } from "@/components/storefront/theme/page-container";
import { PageTitle } from "@/components/storefront/theme/page-title";
import { ProductCardThemed } from "@/components/storefront/theme/product-card-themed";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { EditableImage } from "@/components/storefront/theme/editable-image";
import { formatMoney } from "@/lib/storefront/format";
import { beautyTemplateImages } from "@/lib/storefront/beauty-defaults";
import { cosmeticsTemplateImages } from "@/lib/storefront/cosmetics-defaults";
import { fashionTemplateImages } from "@/lib/storefront/fashion-defaults";
import { minimalisticTemplateImages } from "@/lib/storefront/minimalistic-defaults";
import { cn } from "@/lib/utils";

const fashionColorOptions = [
  { label: "Brown", value: "brown", className: "bg-[#9a6a55]" },
  { label: "White", value: "white", className: "bg-white" },
  { label: "Green", value: "green", className: "bg-[#3f6f5a]" },
  { label: "Blue", value: "blue", className: "bg-[#7aa9ba]" },
  { label: "Black", value: "black", className: "bg-[#1d1d1d]" },
];

const fashionSizeOptions = ["S", "M", "L", "XL", "XXL", "XXXL"];

function productSearchText(product: StoreProduct) {
  return [
    product.name,
    product.description,
    product.category,
    ...(product.variants ?? []).flatMap((variant) => [variant.name, ...variant.options]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function FashionCheckbox({
  checked,
  label,
  onClick,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
}) {
  const { theme } = useStorefrontTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 text-left text-[13px] transition hover:opacity-80"
      style={{ color: theme.palette.muted }}
    >
      <span
        className={cn(
          "grid h-4 w-4 place-items-center border border-black/10 bg-white text-[10px] text-white",
          checked && "",
        )}
        style={
          checked
            ? { borderColor: theme.palette.primary, backgroundColor: theme.palette.primary }
            : {}
        }
      >
        {checked ? "✓" : ""}
      </span>
      {label}
    </button>
  );
}

function FashionProductsCard({
  product,
  index,
  imagePath,
  editable,
}: {
  product: StoreProduct;
  index: number;
  imagePath?: string;
  editable: boolean;
}) {
  const { theme } = useStorefrontTheme();
  const { discounts } = useStorefront();
  const priced = productUnitPrice(product, discounts ?? []);
  const discountPct =
    priced.compareAtPrice != null && priced.compareAtPrice > priced.unitPrice
      ? Math.round((1 - priced.unitPrice / priced.compareAtPrice) * 100)
      : null;
  const category = product.category ?? "Fashion";
  const imageUrl =
    product.image_url ??
    fashionTemplateImages.products[index % fashionTemplateImages.products.length];
  const card = (
    <article className="group block text-left">
      <div
        className="relative aspect-[4/5] overflow-hidden"
        style={{ backgroundColor: theme.palette.surface }}
      >
        <EditableImage
          path={imagePath}
          src={imageUrl}
          alt={product.name}
          className="h-full w-full"
          imgClassName="object-center transition duration-500 group-hover:scale-105"
        />
        {discountPct != null && discountPct > 0 ? (
          <span
            className="absolute left-3 top-3 px-2.5 py-1.5 text-[11px] font-extrabold shadow-sm"
            style={{ backgroundColor: theme.palette.background, color: theme.palette.accent }}
          >
            {discountPct}% OFF
          </span>
        ) : null}
      </div>
      <div className="mt-3">
        <p className="text-[11px]" style={{ color: theme.palette.muted }}>
          {category}
        </p>
        <h3 className="mt-2 line-clamp-1 text-[13px] font-extrabold leading-tight">
          {product.name}
        </h3>
        <div className="mt-2 flex items-center gap-2 text-[13px] font-bold">
          <span>{formatMoney(priced.unitPrice, product.currency)}</span>
          {priced.compareAtPrice != null ? (
            <span className="text-[12px] font-medium text-[#b0aaa6] line-through">
              {formatMoney(priced.compareAtPrice, product.currency)}
            </span>
          ) : null}
        </div>
      </div>
    </article>
  );

  if (editable) return card;

  return <Link href={`/products/${product.slug}`}>{card}</Link>;
}

function FashionProductsPage({
  products,
  categories,
}: {
  products: StoreProduct[];
  categories: StoreCategory[];
}) {
  const { theme, mode } = useStorefrontTheme();
  const [selectedCategoryId, setSelectedCategoryId] = useCategoryFilter(categories);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [priceLimit, setPriceLimit] = useState(0);
  const [sortBy, setSortBy] = useState<"newest" | "price-low" | "price-high">("newest");

  const productPrices = useMemo(() => products.map((product) => product.price), [products]);
  const maxPrice = useMemo(() => Math.max(...productPrices, 0), [productPrices]);
  const minPrice = useMemo(
    () => (productPrices.length ? Math.min(...productPrices) : 0),
    [productPrices],
  );

  useEffect(() => {
    setPriceLimit((currentLimit) => {
      if (currentLimit === 0 || currentLimit > maxPrice) return maxPrice;
      return currentLimit;
    });
  }, [maxPrice]);

  const filteredProducts = useMemo(() => {
    const next = products.filter((product) => {
      const text = productSearchText(product);
      const matchesCategory = productMatchesCategoryFilter(
        product,
        selectedCategoryId,
        categories,
      );
      const matchesColor = !selectedColor || text.includes(selectedColor);
      const matchesSize = !selectedSize || text.includes(selectedSize.toLowerCase());
      return matchesCategory && matchesColor && matchesSize && product.price <= priceLimit;
    });

    return sortCatalogProducts(next, sortBy, products);
  }, [categories, priceLimit, products, selectedCategoryId, selectedColor, selectedSize, sortBy]);

  const selectedCategoryName = selectedCategoryId
    ? categories.find((category) => category.id === selectedCategoryId)?.name
    : null;

  type ActiveFilter = { key: string; label: string; clear: () => void };
  const activeFilters: ActiveFilter[] = [
    selectedCategoryName
      ? {
          key: "category",
          label: selectedCategoryName,
          clear: () => setSelectedCategoryId(null),
        }
      : null,
    selectedColor
      ? {
          key: "color",
          label:
            fashionColorOptions.find((color) => color.value === selectedColor)?.label ??
            selectedColor,
          clear: () => setSelectedColor(null),
        }
      : null,
    selectedSize
      ? { key: "size", label: selectedSize, clear: () => setSelectedSize(null) }
      : null,
    maxPrice > 0 && priceLimit < maxPrice
      ? {
          key: "price",
          label: `Price: ${formatMoney(minPrice, products[0]?.currency ?? "NGN")} - ${formatMoney(priceLimit, products[0]?.currency ?? "NGN")}`,
          clear: () => setPriceLimit(maxPrice),
        }
      : null,
  ].filter((filter): filter is ActiveFilter => Boolean(filter));

  function clearFilters() {
    setSelectedCategoryId(null);
    setSelectedColor(null);
    setSelectedSize(null);
    setPriceLimit(maxPrice);
  }

  return (
    <div style={{ backgroundColor: theme.palette.background, color: theme.palette.text }}>
      <section
        className="px-4 py-16 text-center sm:px-6 lg:py-20"
        style={{ backgroundColor: theme.palette.surface }}
      >
        <h1
          className="text-4xl font-bold tracking-[-0.04em] sm:text-5xl"
          style={{ fontFamily: "var(--font-editorial)" }}
        >
          All Products
        </h1>
        <div className="mt-5 flex items-center justify-center gap-3 text-[11px] font-semibold">
          <Link href="/">Home</Link>
          <span>/</span>
          <span>Shop</span>
          {selectedCategoryName ? (
            <>
              <span>/</span>
              <span>{selectedCategoryName}</span>
            </>
          ) : null}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[270px_1fr] lg:py-16">
        <aside className="lg:border-r lg:pr-8" style={{ borderColor: theme.palette.border }}>
          <details
            className="rounded-2xl border p-5 lg:sticky lg:top-24 lg:rounded-none lg:border-0 lg:p-0"
            style={{ borderColor: theme.palette.border }}
          >
            <summary className="cursor-pointer list-none text-sm font-extrabold lg:hidden">
              Filters
            </summary>
            <div className="mt-6 space-y-10 lg:mt-0">
              <h2 className="hidden text-sm font-extrabold lg:block">Filter Options</h2>

              <div>
                <h3 className="mb-5 text-base font-extrabold">Category</h3>
                {categories.length ? (
                  <div className="grid gap-3">
                    {categories.map((category) => (
                      <FashionCheckbox
                        key={category.id}
                        label={categoryLabel(category)}
                        checked={selectedCategoryId === category.id}
                        onClick={() =>
                          setSelectedCategoryId(
                            selectedCategoryId === category.id ? null : category.id,
                          )
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-[13px]" style={{ color: theme.palette.muted }}>
                    No categories yet.
                  </p>
                )}
              </div>

              <div>
                <h3 className="mb-4 text-base font-extrabold">Price</h3>
                <div className="text-[13px]" style={{ color: theme.palette.muted }}>
                  {formatMoney(minPrice, products[0]?.currency ?? "NGN")} -{" "}
                  {formatMoney(priceLimit || maxPrice, products[0]?.currency ?? "NGN")}
                </div>
                <input
                  type="range"
                  min={minPrice}
                  max={maxPrice}
                  value={priceLimit || maxPrice}
                  onChange={(event) => setPriceLimit(Number(event.target.value))}
                  className="mt-4 h-1 w-full accent-[#55220b]"
                />
              </div>

              <div>
                <h3 className="mb-5 text-base font-extrabold">Color</h3>
                <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                  {fashionColorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() =>
                        setSelectedColor(selectedColor === color.value ? null : color.value)
                      }
                      className="flex items-center gap-2 text-[13px]"
                    >
                      <span
                        className={cn(
                          "grid h-6 w-6 place-items-center rounded-full border border-[#68b697] bg-white",
                          selectedColor === color.value && "ring-2 ring-[#b16b68] ring-offset-2",
                        )}
                      >
                        <span
                          className={cn(
                            "h-4 w-4 rounded-full border border-black/10",
                            color.className,
                          )}
                        />
                      </span>
                      {color.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="flex items-center gap-2 text-[13px]"
                    onClick={() => setSelectedColor(null)}
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[#123d33] text-base leading-none text-white">
                      +
                    </span>
                    More
                  </button>
                </div>
              </div>

              <div>
                <h3 className="mb-5 text-base font-extrabold">Size</h3>
                <div className="flex flex-wrap gap-3">
                  {fashionSizeOptions.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(selectedSize === size ? null : size)}
                      className="flex items-center gap-2 text-[12px]"
                    >
                      <span
                        className={cn(
                          "grid h-4 w-4 place-items-center border border-black/10 bg-white text-[10px] text-white",
                          selectedSize === size && "border-[#55220b] bg-[#55220b]",
                        )}
                      >
                        {selectedSize === size ? "✓" : ""}
                      </span>
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </details>
        </aside>

        <div>
          <div
            className="flex flex-col gap-5 border-t pt-5 sm:flex-row sm:items-start sm:justify-between"
            style={{ borderColor: theme.palette.border }}
          >
            <div>
              <p className="text-sm font-extrabold">
                {filteredProducts.length
                  ? `Showing 1-${filteredProducts.length} of ${products.length} results`
                  : `Showing 0 of ${products.length} results`}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="text-[13px]">Active Filter</span>
                {activeFilters.length ? (
                  activeFilters.map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={filter.clear}
                      className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-[12px] font-semibold"
                      style={{
                        backgroundColor: theme.palette.primary,
                        color: theme.palette.background,
                      }}
                      aria-label={`Clear ${filter.label} filter`}
                    >
                      {filter.label}
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ))
                ) : (
                  <span className="text-[12px] text-[#8b837f]">None</span>
                )}
                {activeFilters.length ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-[12px] font-semibold underline underline-offset-2"
                    style={{ color: theme.palette.primary }}
                  >
                    Clean All
                  </button>
                ) : null}
              </div>
            </div>

            <label className="flex w-full items-center gap-4 text-sm font-extrabold sm:w-auto">
              Sort By:
              <span className="relative">
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                  className="h-11 appearance-none border pl-5 pr-10 text-[13px] font-semibold outline-none"
                  style={{
                    backgroundColor: theme.palette.surface,
                    borderColor: theme.palette.border,
                    color: theme.palette.text,
                  }}
                >
                  <option value="newest">Newest</option>
                  <option value="price-low">Price low</option>
                  <option value="price-high">Price high</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              </span>
            </label>
          </div>

          <div className="mt-8 grid gap-x-7 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const originalIndex = products.findIndex((item) => item.id === product.id);
              return (
                <FashionProductsCard
                  key={product.id}
                  product={product}
                  index={originalIndex}
                  imagePath={originalIndex >= 0 ? `products.${originalIndex}.image_url` : undefined}
                  editable={mode === "edit"}
                />
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function BeautyProductsPage({
  products,
  categories,
}: {
  products: StoreProduct[];
  categories: StoreCategory[];
}) {
  const { theme, mode } = useStorefrontTheme();
  const { discounts } = useStorefront();
  const isCosmetics = theme.id === "cosmetics";
  const [selectedCategoryId, setSelectedCategoryId] = useCategoryFilter(categories);

  const templateImages = isCosmetics ? cosmeticsTemplateImages : beautyTemplateImages;
  const filteredProducts = products.filter((product) =>
    productMatchesCategoryFilter(product, selectedCategoryId, categories),
  );

  return (
    <div style={{ backgroundColor: theme.palette.background, color: theme.palette.text }}>
      <section className="px-4 py-16 text-center sm:px-6 lg:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em]" style={{ color: theme.palette.muted }}>
          {isCosmetics ? "Cosmetics catalog" : "Beauty catalog"}
        </p>
        <h1 className="mx-auto mt-3 max-w-3xl font-display text-5xl font-semibold leading-none tracking-[-0.055em] sm:text-6xl">
          {isCosmetics ? "Shop the skincare edit" : "Shop the beauty edit"}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-6" style={{ color: theme.palette.muted }}>
          {isCosmetics
            ? "Cleansers, serums, moisturisers, and routine kits curated for simple daily glow."
            : "Hair, skincare, and glow essentials curated for routines, bundles, and best sellers."}
        </p>
      </section>

      <section className="px-4 pb-14 sm:px-6 lg:pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedCategoryId(null)}
              className="rounded-full border px-4 py-2 text-xs font-semibold transition"
              style={{
                borderColor: !selectedCategoryId ? theme.palette.primary : theme.palette.border,
                backgroundColor: !selectedCategoryId ? theme.palette.primary : theme.palette.surface,
                color: !selectedCategoryId ? theme.palette.background : theme.palette.text,
              }}
            >
              All products
            </button>
            {categories.map((category) => {
              const active = selectedCategoryId === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(active ? null : category.id)}
                  className="rounded-full border px-4 py-2 text-xs font-semibold transition"
                  style={{
                    borderColor: active ? theme.palette.primary : theme.palette.border,
                    backgroundColor: active ? theme.palette.primary : theme.palette.surface,
                    color: active ? theme.palette.background : theme.palette.text,
                  }}
                >
                  {categoryLabel(category)}
                </button>
              );
            })}
          </div>

          <div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {filteredProducts.map((product) => {
              const originalIndex = products.findIndex((entry) => entry.id === product.id);
              const image =
                product.image_url ??
                templateImages.products[Math.max(originalIndex, 0) % templateImages.products.length];
              const priced = productUnitPrice(product, discounts ?? []);
              const card = (
                <article className="group">
                  <div
                    className="aspect-[4/5] overflow-hidden rounded-[2rem] border p-3"
                    style={{ borderColor: theme.palette.border, backgroundColor: theme.palette.surface }}
                  >
                    <EditableImage
                      path={
                        originalIndex >= 0 ? `products.${originalIndex}.image_url` : undefined
                      }
                      src={image}
                      alt={product.name}
                      className="h-full w-full overflow-hidden rounded-[1.5rem]"
                      imgClassName="object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="mt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.palette.muted }}>
                      {product.category ?? (isCosmetics ? "Skincare" : "Beauty")}
                    </p>
                    <h2 className="mt-1 line-clamp-1 font-display text-lg font-semibold">{product.name}</h2>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-6" style={{ color: theme.palette.muted }}>
                    {product.description}
                  </p>
                  <div className="mt-4 flex items-center gap-2 font-semibold">
                    <span>{formatMoney(priced.unitPrice, product.currency)}</span>
                    {priced.compareAtPrice != null ? (
                      <span className="text-sm font-medium line-through" style={{ color: theme.palette.muted }}>
                        {formatMoney(priced.compareAtPrice, product.currency)}
                      </span>
                    ) : null}
                  </div>
                </article>
              );
              return mode === "edit" ? (
                <div key={product.id}>{card}</div>
              ) : (
                <Link key={product.id} href={`/products/${product.slug}`}>
                  {card}
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}

function MinimalisticProductsPage({
  products,
  categories,
}: {
  products: StoreProduct[];
  categories: StoreCategory[];
}) {
  const { theme, mode } = useStorefrontTheme();
  const { addItem } = useCart();
  const { discounts } = useStorefront();
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useCategoryFilter(categories);
  const [priceLimit, setPriceLimit] = useState(0);
  const [sortBy, setSortBy] = useState<"newest" | "price-low" | "price-high">("newest");
  const productPrices = useMemo(() => products.map((product) => product.price), [products]);
  const maxPrice = useMemo(() => Math.max(...productPrices, 0), [productPrices]);
  const minPrice = useMemo(
    () => (productPrices.length ? Math.min(...productPrices) : 0),
    [productPrices],
  );

  useEffect(() => {
    setPriceLimit((currentLimit) => {
      if (currentLimit === 0 || currentLimit > maxPrice) return maxPrice;
      return currentLimit;
    });
  }, [maxPrice]);

  const filteredProducts = useMemo(() => {
    const next = products.filter((product) => {
      const matchesCategory = productMatchesCategoryFilter(
        product,
        selectedCategoryId,
        categories,
      );
      const matchesPrice = !priceLimit || product.price <= priceLimit;
      return matchesCategory && matchesPrice;
    });

    return sortCatalogProducts(next, sortBy, products);
  }, [categories, priceLimit, products, selectedCategoryId, sortBy]);

  const selectedCategoryName = selectedCategoryId
    ? categories.find((category) => category.id === selectedCategoryId)?.name
    : null;

  type ActiveFilter = { key: string; label: string; clear: () => void };
  const activeFilters: ActiveFilter[] = [
    selectedCategoryName
      ? {
          key: "category",
          label: selectedCategoryName,
          clear: () => setSelectedCategoryId(null),
        }
      : null,
    maxPrice > 0 && priceLimit < maxPrice
      ? {
          key: "price",
          label: `Price: ${formatMoney(minPrice, products[0]?.currency ?? "NGN")} - ${formatMoney(
            priceLimit,
            products[0]?.currency ?? "NGN",
          )}`,
          clear: () => setPriceLimit(maxPrice),
        }
      : null,
  ].filter((filter): filter is ActiveFilter => Boolean(filter));

  function addToCart(product: StoreProduct) {
    if (!isProductInStock(product)) {
      toast.error("This product is out of stock.");
      return;
    }
    if (product.variants?.some((group) => group.options?.length)) {
      router.push(`/products/${product.slug}`);
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

  function clearFilters() {
    setSelectedCategoryId(null);
    setPriceLimit(maxPrice);
  }

  return (
    <div style={{ backgroundColor: theme.palette.surface, color: theme.palette.text }}>
      <section
        className="relative overflow-hidden px-4 py-14 text-center sm:px-6 lg:py-20"
        style={{ backgroundColor: theme.palette.background }}
      >
        <span className="pointer-events-none absolute left-[9%] top-[55%] h-10 w-5 rotate-45 rounded-full bg-[#d99359]/70" />
        <span className="pointer-events-none absolute right-[12%] top-[45%] h-10 w-10 rounded-full bg-[#dedbc1]/80" />
        <span className="pointer-events-none absolute left-[23%] bottom-8 h-8 w-8 rounded-full bg-[#e4e1c8]/80" />
        <div className="mx-auto max-w-3xl">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-semibold shadow-sm">
            <span
              className="h-2 w-5 rounded-full"
              style={{ backgroundColor: theme.palette.primary }}
            />
            Products List
            <span
              className="h-2 w-5 rounded-full"
              style={{ backgroundColor: theme.palette.primary }}
            />
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Explore Our Essentials
          </h1>
          <p
            className="mx-auto mt-4 max-w-lg text-sm leading-6"
            style={{ color: theme.palette.muted }}
          >
            Discover daily supplements designed to support beauty, digestion, focus, sleep, and
            energy.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:py-14">
        <aside className="lg:border-r lg:pr-8" style={{ borderColor: theme.palette.border }}>
          <details
            className="rounded-[1.75rem] border p-5 shadow-[0_20px_60px_rgba(7,62,63,0.06)] lg:sticky lg:top-24 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
            style={{ borderColor: theme.palette.border, backgroundColor: theme.palette.background }}
          >
            <summary className="cursor-pointer list-none text-sm font-bold lg:hidden">
              Filters
            </summary>
            <div className="mt-6 space-y-7 lg:mt-0">
            <div>
              <h2 className="text-sm font-bold">Filter Options</h2>
              <p className="mt-1 text-xs leading-5" style={{ color: theme.palette.muted }}>
                Refine essentials by wellness goal and price.
              </p>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold">Category</h3>
              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId(null)}
                  className={cn(
                    "flex items-center justify-between rounded-full px-4 py-2.5 text-left text-xs font-semibold transition",
                    !selectedCategoryId ? "" : "hover:opacity-80",
                  )}
                  style={{
                    backgroundColor: !selectedCategoryId
                      ? theme.palette.primary
                      : `${theme.palette.surface}cc`,
                    color: !selectedCategoryId ? theme.palette.background : theme.palette.muted,
                  }}
                >
                  All products
                  {!selectedCategoryId ? (
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: theme.palette.background }}
                    />
                  ) : null}
                </button>
                {categories.map((category) => {
                  const active = selectedCategoryId === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={cn(
                        "flex items-center justify-between rounded-full px-4 py-2.5 text-left text-xs font-semibold transition",
                        active ? "" : "hover:opacity-80",
                      )}
                      style={{
                        backgroundColor: active
                          ? theme.palette.primary
                          : `${theme.palette.surface}cc`,
                        color: active ? theme.palette.background : theme.palette.muted,
                      }}
                    >
                      {categoryLabel(category)}
                      {active ? (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: theme.palette.background }}
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-bold">Price</h3>
              <div className="text-xs font-semibold" style={{ color: theme.palette.muted }}>
                {formatMoney(minPrice, products[0]?.currency ?? "NGN")} -{" "}
                {formatMoney(priceLimit || maxPrice, products[0]?.currency ?? "NGN")}
              </div>
              <input
                type="range"
                min={minPrice}
                max={maxPrice}
                value={priceLimit || maxPrice}
                onChange={(event) => setPriceLimit(Number(event.target.value))}
                className="mt-4 h-1 w-full"
                style={{ accentColor: theme.palette.primary }}
              />
            </div>

            <div
              className="rounded-[1.5rem] p-4"
              style={{ backgroundColor: `${theme.palette.surface}cc` }}
            >
              <h3 className="text-sm font-bold">Wellness promise</h3>
              <div className="mt-4 grid gap-3 text-xs" style={{ color: theme.palette.muted }}>
                {["Clean ingredients", "Trusted quality", "Daily support"].map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <span
                      className="h-2 w-5 rounded-full"
                      style={{ backgroundColor: theme.palette.primary }}
                    />
                    {item}
                  </span>
                ))}
              </div>
            </div>
            </div>
          </details>
        </aside>

        <div>
          <div
            className="flex flex-col gap-5 border-t pt-5 sm:flex-row sm:items-start sm:justify-between"
            style={{ borderColor: theme.palette.border }}
          >
            <div>
              <p className="text-sm font-bold">
                {filteredProducts.length
                  ? `Showing 1-${filteredProducts.length} of ${products.length} results`
                  : `Showing 0 of ${products.length} results`}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold" style={{ color: theme.palette.muted }}>
                  Active Filter
                </span>
                {activeFilters.length ? (
                  activeFilters.map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={filter.clear}
                      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold"
                      style={{
                        backgroundColor: theme.palette.primary,
                        color: theme.palette.background,
                      }}
                      aria-label={`Clear ${filter.label} filter`}
                    >
                      {filter.label}
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ))
                ) : (
                  <span
                    className="rounded-full px-4 py-2 text-xs font-semibold"
                    style={{ backgroundColor: theme.palette.surface, color: theme.palette.muted }}
                  >
                    None
                  </span>
                )}
                {activeFilters.length ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs font-semibold underline underline-offset-2"
                    style={{ color: theme.palette.primary }}
                  >
                    Clear all
                  </button>
                ) : null}
              </div>
            </div>

            <label className="flex w-full items-center gap-4 text-sm font-bold sm:w-auto">
              Sort By:
              <span className="relative">
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                  className="h-11 appearance-none rounded-full border pl-5 pr-10 text-xs font-semibold outline-none"
                  style={{
                    backgroundColor: theme.palette.background,
                    borderColor: theme.palette.border,
                    color: theme.palette.text,
                  }}
                >
                  <option value="newest">Newest</option>
                  <option value="price-low">Price low</option>
                  <option value="price-high">Price high</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              </span>
            </label>
          </div>

          <div className="mt-8 grid gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const originalIndex = products.findIndex((item) => item.id === product.id);
              const imageUrl =
                product.image_url ??
                minimalisticTemplateImages.products[
                  Math.max(originalIndex, 0) % minimalisticTemplateImages.products.length
                ];
              const priced = productUnitPrice(product, discounts ?? []);
              const inStock = isProductInStock(product);
              const productImage = (
                <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-[#f0f0f0] p-7">
                  <EditableImage
                    path={originalIndex >= 0 ? `products.${originalIndex}.image_url` : undefined}
                    src={imageUrl}
                    alt={product.name}
                    className="h-full w-full"
                    imgClassName="object-contain transition duration-500 group-hover:scale-105"
                  />
                </div>
              );
              const card = (
                <article className="group text-left">
                  {mode === "edit" ? (
                    productImage
                  ) : (
                    <Link href={`/products/${product.slug}`}>{productImage}</Link>
                  )}
                  <div className="mt-3">
                    <h3 className="line-clamp-1 text-sm font-bold">{product.name}</h3>
                    <p
                      className="mt-1 line-clamp-1 text-[11px]"
                      style={{ color: theme.palette.muted }}
                    >
                      {product.description}
                    </p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <span>{formatMoney(priced.unitPrice, product.currency)}</span>
                      {priced.compareAtPrice != null ? (
                        <span
                          className="text-[11px] font-medium line-through"
                          style={{ color: theme.palette.muted }}
                        >
                          {formatMoney(priced.compareAtPrice, product.currency)}
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      disabled={mode === "edit" || !inStock}
                      className="rounded-full px-3 py-1.5 text-[10px] font-semibold transition disabled:cursor-default disabled:opacity-70"
                      style={{
                        backgroundColor: theme.palette.primary,
                        color: theme.palette.background,
                      }}
                    >
                      {inStock ? "Add to Cart" : "Sold out"}
                    </button>
                  </div>
                </article>
              );

              return <div key={product.id}>{card}</div>;
            })}
          </div>

          {filteredProducts.length === 0 ? (
            <div
              className="mt-8 rounded-[1.5rem] p-8 text-center"
              style={{ backgroundColor: theme.palette.background }}
            >
              <h2 className="text-lg font-bold">No essentials found</h2>
              <p className="mt-2 text-sm" style={{ color: theme.palette.muted }}>
                Try clearing the filters to view the full catalog.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export function ProductsPageView() {
  const { store, storefront, categories: apiCategories } = useStorefront();
  const { theme, mode } = useStorefrontTheme();
  const products = (storefront.products ?? []).filter(
    (product) => mode === "edit" || (product.status ?? "active") === "active",
  );
  const filterCategories = useMemo(
    () => resolveStorefrontFilterCategories(apiCategories, products),
    [apiCategories, products],
  );
  const [selectedCategoryId, setSelectedCategoryId] = useCategoryFilter(filterCategories);

  const defaultFilteredProducts = useMemo(
    () =>
      products.filter((product) =>
        productMatchesCategoryFilter(product, selectedCategoryId, filterCategories),
      ),
    [filterCategories, products, selectedCategoryId],
  );

  if (theme.id === "fashion_lookbook") {
    return <FashionProductsPage products={products} categories={filterCategories} />;
  }

  if (theme.id === "minimalistic") {
    return <MinimalisticProductsPage products={products} categories={filterCategories} />;
  }

  if (theme.id === "beauty" || theme.id === "cosmetics") {
    return <BeautyProductsPage products={products} categories={filterCategories} />;
  }

  if (theme.id === "furniture-hardware" || theme.id === "hair-and-fashion") {
    return <FashionProductsPage products={products} categories={filterCategories} />;
  }

  return (
    <PageContainer>
      <PageTitle title="Products" subtitle={`Shop the full catalog from ${store.business_name}.`} />
      {filterCategories.length ? (
        <div className="mt-8 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedCategoryId(null)}
            className={cn(
              "rounded-full border px-4 py-2 text-xs font-semibold transition",
              !selectedCategoryId
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-ink-soft hover:text-ink",
            )}
          >
            All products
          </button>
          {filterCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() =>
                setSelectedCategoryId(selectedCategoryId === category.id ? null : category.id)
              }
              className={cn(
                "rounded-full border px-4 py-2 text-xs font-semibold transition",
                selectedCategoryId === category.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-ink-soft hover:text-ink",
              )}
            >
              {categoryLabel(category)}
            </button>
          ))}
        </div>
      ) : null}
      <div className={`mt-10 grid gap-6 ${theme.productGridCols}`}>
        {defaultFilteredProducts.map((product) => {
          const originalIndex = products.findIndex((item) => item.id === product.id);
          return (
            <ProductCardThemed
              key={product.id}
              product={product}
              imagePath={
                originalIndex >= 0 ? `products.${originalIndex}.image_url` : undefined
              }
            />
          );
        })}
      </div>
    </PageContainer>
  );
}
