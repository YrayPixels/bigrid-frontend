"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Star, X } from "lucide-react";
import { toast } from "sonner";
import type { StoreProduct } from "@/lib/api/types";
import { useCart } from "@/lib/storefront/cart-context";
import { useStorefront } from "@/lib/storefront/store-context";
import { PageContainer } from "@/components/storefront/theme/page-container";
import { PageTitle } from "@/components/storefront/theme/page-title";
import { ProductCardThemed } from "@/components/storefront/theme/product-card-themed";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { EditableImage } from "@/components/storefront/theme/editable-image";
import { formatMoney } from "@/lib/storefront/format";
import { fashionCategories, fashionTemplateImages } from "@/lib/storefront/fashion-defaults";
import {
  minimalisticCategories,
  minimalisticTemplateImages,
} from "@/lib/storefront/minimalistic-defaults";
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
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 text-left text-[13px] text-[#6e6e6e] transition hover:text-[#111111]"
    >
      <span
        className={cn(
          "grid h-4 w-4 place-items-center border border-black/10 bg-white text-[10px] text-white",
          checked && "border-[#55220b] bg-[#55220b]",
        )}
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
  const discount = [15, 10, 15, 30, 25, 25, 25, 20][index % 8];
  const compareAt = Math.round(product.price / (1 - discount / 100));
  const category = product.category ?? "Fashion";
  const imageUrl = product.image_url ?? fashionTemplateImages.products[index % fashionTemplateImages.products.length];
  const card = (
    <article className="group block text-left">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#eef0ef]">
        <EditableImage
          path={imagePath}
          src={imageUrl}
          alt={product.name}
          className="h-full w-full"
          imgClassName="object-center transition duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3 bg-white/95 px-2.5 py-1.5 text-[11px] font-extrabold text-[#2a9b6a] shadow-sm">
          {discount}% OFF
        </span>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-[#6e6e6e]">{category}</p>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#111111]">
            <Star className="h-3.5 w-3.5 fill-[#f3bd3d] text-[#f3bd3d]" />
            4.9
          </span>
        </div>
        <h3 className="mt-2 line-clamp-1 text-[13px] font-extrabold leading-tight text-[#111111]">
          {product.name}
        </h3>
        <div className="mt-2 flex items-center gap-2 text-[13px] font-bold text-[#111111]">
          <span>{formatMoney(product.price, product.currency)}</span>
          <span className="text-[12px] font-medium text-[#b0aaa6] line-through">
            {formatMoney(compareAt, product.currency)}
          </span>
        </div>
      </div>
    </article>
  );

  if (editable) return card;

  return <Link href={`/products/${product.slug}`}>{card}</Link>;
}

function FashionProductsPage({ products }: { products: StoreProduct[] }) {
  const { mode } = useStorefrontTheme();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [priceLimit, setPriceLimit] = useState(0);
  const [sortBy, setSortBy] = useState<"newest" | "price-low" | "price-high">("newest");

  const categories = useMemo(() => {
    const productCategories = products
      .map((product) => product.category)
      .filter((category): category is string => Boolean(category));
    return Array.from(new Set([...productCategories, ...fashionCategories.map((category) => category.title)]));
  }, [products]);

  const productPrices = useMemo(() => products.map((product) => product.price), [products]);
  const maxPrice = useMemo(() => Math.max(...productPrices, 0), [productPrices]);
  const minPrice = useMemo(() => (productPrices.length ? Math.min(...productPrices) : 0), [productPrices]);

  useEffect(() => {
    setPriceLimit((currentLimit) => {
      if (currentLimit === 0 || currentLimit > maxPrice) return maxPrice;
      return currentLimit;
    });
  }, [maxPrice]);

  const filteredProducts = useMemo(() => {
    const next = products.filter((product) => {
      const text = productSearchText(product);
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      const matchesColor = !selectedColor || text.includes(selectedColor);
      const matchesSize = !selectedSize || text.includes(selectedSize.toLowerCase());
      return matchesCategory && matchesColor && matchesSize && product.price <= priceLimit;
    });

    return [...next].sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      return 0;
    });
  }, [priceLimit, products, selectedCategory, selectedColor, selectedSize, sortBy]);

  const activeFilters = [
    selectedCategory,
    selectedColor ? fashionColorOptions.find((color) => color.value === selectedColor)?.label : null,
    selectedSize,
    maxPrice > 0 && priceLimit < maxPrice ? `Price: ${formatMoney(minPrice, products[0]?.currency ?? "NGN")} - ${formatMoney(priceLimit, products[0]?.currency ?? "NGN")}` : null,
  ].filter((filter): filter is string => Boolean(filter));

  function clearFilters() {
    setSelectedCategory(null);
    setSelectedColor(null);
    setSelectedSize(null);
    setPriceLimit(maxPrice);
  }

  return (
    <div className="bg-white text-[#111111]">
      <section className="bg-[#f4f4f3] px-4 py-16 text-center sm:px-6 lg:py-20">
        <h1
          className="text-4xl font-bold tracking-[-0.04em] sm:text-5xl"
          style={{ fontFamily: "var(--font-editorial)" }}
        >
          All Product
        </h1>
        <div className="mt-5 flex items-center justify-center gap-3 text-[11px] font-semibold text-[#111111]">
          <Link href="/">Home</Link>
          <span>/</span>
          <Link href="/about">About</Link>
          <span>/</span>
          <span>Shop</span>
          <span>/</span>
          <span>Details</span>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[270px_1fr] lg:py-16">
        <aside className="border-black/10 lg:border-r lg:pr-8">
          <div className="sticky top-24 space-y-10">
            <h2 className="text-sm font-extrabold">Filter Options</h2>

            <div>
              <h3 className="mb-5 text-base font-extrabold">Category</h3>
              <div className="grid gap-3">
                {categories.map((category) => (
                  <FashionCheckbox
                    key={category}
                    label={category}
                    checked={selectedCategory === category}
                    onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="mb-4 text-base font-extrabold">Price</h3>
              <div className="text-[13px] text-[#6e6e6e]">
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
                    onClick={() => setSelectedColor(selectedColor === color.value ? null : color.value)}
                    className="flex items-center gap-2 text-[13px] text-[#111111]"
                  >
                    <span
                      className={cn(
                        "grid h-6 w-6 place-items-center rounded-full border border-[#68b697] bg-white",
                        selectedColor === color.value && "ring-2 ring-[#b16b68] ring-offset-2",
                      )}
                    >
                      <span className={cn("h-4 w-4 rounded-full border border-black/10", color.className)} />
                    </span>
                    {color.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="flex items-center gap-2 text-[13px] text-[#111111]"
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
                    className="flex items-center gap-2 text-[12px] text-[#111111]"
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
        </aside>

        <div>
          <div className="flex flex-col gap-5 border-t border-black/10 pt-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-extrabold">
                {filteredProducts.length
                  ? `Showing 1-${filteredProducts.length} of ${products.length} results`
                  : `Showing 0 of ${products.length} results`}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <span className="text-[13px] text-[#111111]">Active Filter</span>
                {activeFilters.length ? (
                  activeFilters.map((filter) => (
                    <span
                      key={filter}
                      className="inline-flex items-center gap-2 rounded-full bg-[#55220b] px-5 py-3 text-[12px] font-semibold text-white"
                    >
                      {filter}
                      <X className="h-3.5 w-3.5" />
                    </span>
                  ))
                ) : (
                  <span className="text-[12px] text-[#8b837f]">None</span>
                )}
                {activeFilters.length ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-[12px] font-semibold text-[#4d4038] underline underline-offset-2"
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
                  className="h-11 appearance-none border border-black/10 bg-white pl-5 pr-10 text-[13px] font-semibold outline-none"
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

function MinimalisticProductsPage({ products }: { products: StoreProduct[] }) {
  const { mode } = useStorefrontTheme();
  const { addItem } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [priceLimit, setPriceLimit] = useState(0);
  const [sortBy, setSortBy] = useState<"newest" | "price-low" | "price-high">("newest");
  const categories = useMemo(() => {
    const productCategories = products
      .map((product) => product.category)
      .filter((category): category is string => Boolean(category));
    return Array.from(new Set([...minimalisticCategories, ...productCategories]));
  }, [products]);
  const productPrices = useMemo(() => products.map((product) => product.price), [products]);
  const maxPrice = useMemo(() => Math.max(...productPrices, 0), [productPrices]);
  const minPrice = useMemo(() => (productPrices.length ? Math.min(...productPrices) : 0), [productPrices]);

  useEffect(() => {
    setPriceLimit((currentLimit) => {
      if (currentLimit === 0 || currentLimit > maxPrice) return maxPrice;
      return currentLimit;
    });
  }, [maxPrice]);

  const filteredProducts = useMemo(() => {
    const next = products.filter((product) => {
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      const matchesPrice = !priceLimit || product.price <= priceLimit;
      return matchesCategory && matchesPrice;
    });

    return [...next].sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      return 0;
    });
  }, [priceLimit, products, selectedCategory, sortBy]);

  const activeFilters = [
    selectedCategory,
    maxPrice > 0 && priceLimit < maxPrice
      ? `Price: ${formatMoney(minPrice, products[0]?.currency ?? "NGN")} - ${formatMoney(
          priceLimit,
          products[0]?.currency ?? "NGN",
        )}`
      : null,
  ].filter((filter): filter is string => Boolean(filter));

  function addToCart(product: StoreProduct) {
    addItem(product, 1);
    toast.success("Added to cart");
  }

  function clearFilters() {
    setSelectedCategory(null);
    setPriceLimit(maxPrice);
  }

  return (
    <div className="bg-white text-[#073e3f]">
      <section className="relative overflow-hidden bg-[#fbfbdc] px-4 py-14 text-center sm:px-6 lg:py-20">
        <span className="pointer-events-none absolute left-[9%] top-[55%] h-10 w-5 rotate-45 rounded-full bg-[#d99359]/70" />
        <span className="pointer-events-none absolute right-[12%] top-[45%] h-10 w-10 rounded-full bg-[#dedbc1]/80" />
        <span className="pointer-events-none absolute left-[23%] bottom-8 h-8 w-8 rounded-full bg-[#e4e1c8]/80" />
        <div className="mx-auto max-w-3xl">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-[11px] font-semibold shadow-sm">
            <span className="h-2 w-5 rounded-full bg-[#073e3f]" />
            Products List
            <span className="h-2 w-5 rounded-full bg-[#073e3f]" />
          </div>
          <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Explore Our Essentials
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-[#073e3f]/65">
            Discover daily supplements designed to support beauty, digestion, focus, sleep, and
            energy.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:py-14">
        <aside className="lg:border-r lg:border-[#073e3f]/10 lg:pr-8">
          <div className="sticky top-24 space-y-7 rounded-[1.75rem] bg-[#fbfbdc] p-5 shadow-[0_20px_60px_rgba(7,62,63,0.06)] lg:rounded-none lg:bg-transparent lg:p-0 lg:shadow-none">
            <div>
              <h2 className="text-sm font-bold">Filter Options</h2>
              <p className="mt-1 text-xs leading-5 text-[#073e3f]/55">
                Refine essentials by wellness goal and price.
              </p>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold">Category</h3>
              <div className="grid gap-2">
                {categories.map((category) => {
                  const active =
                    (category === "All Products" && !selectedCategory) ||
                    selectedCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() =>
                        setSelectedCategory(category === "All Products" ? null : category)
                      }
                      className={cn(
                        "flex items-center justify-between rounded-full px-4 py-2.5 text-left text-xs font-semibold transition",
                        active
                          ? "bg-[#073e3f] text-[#fbfbdc]"
                          : "bg-white/80 text-[#073e3f]/70 hover:text-[#073e3f]",
                      )}
                    >
                      {category}
                      {active ? <span className="h-2 w-2 rounded-full bg-[#fbfbdc]" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-bold">Price</h3>
              <div className="text-xs font-semibold text-[#073e3f]/65">
                {formatMoney(minPrice, products[0]?.currency ?? "NGN")} -{" "}
                {formatMoney(priceLimit || maxPrice, products[0]?.currency ?? "NGN")}
              </div>
              <input
                type="range"
                min={minPrice}
                max={maxPrice}
                value={priceLimit || maxPrice}
                onChange={(event) => setPriceLimit(Number(event.target.value))}
                className="mt-4 h-1 w-full accent-[#073e3f]"
              />
            </div>

            <div className="rounded-[1.5rem] bg-white/80 p-4">
              <h3 className="text-sm font-bold">Wellness promise</h3>
              <div className="mt-4 grid gap-3 text-xs text-[#073e3f]/65">
                {["Clean ingredients", "Trusted quality", "Daily support"].map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <span className="h-2 w-5 rounded-full bg-[#073e3f]" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <div>
          <div className="flex flex-col gap-5 border-t border-[#073e3f]/10 pt-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold">
                {filteredProducts.length
                  ? `Showing 1-${filteredProducts.length} of ${products.length} results`
                  : `Showing 0 of ${products.length} results`}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <span className="text-xs font-semibold text-[#073e3f]/60">Active Filter</span>
                {activeFilters.length ? (
                  activeFilters.map((filter) => (
                    <span
                      key={filter}
                      className="inline-flex items-center gap-2 rounded-full bg-[#073e3f] px-4 py-2 text-xs font-semibold text-[#fbfbdc]"
                    >
                      {filter}
                      <X className="h-3.5 w-3.5" />
                    </span>
                  ))
                ) : (
                  <span className="rounded-full bg-[#f7f7f3] px-4 py-2 text-xs font-semibold text-[#073e3f]/55">
                    None
                  </span>
                )}
                {activeFilters.length ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="text-xs font-semibold text-[#073e3f] underline underline-offset-2"
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
                  className="h-11 appearance-none rounded-full border border-[#073e3f]/10 bg-[#fbfbdc] pl-5 pr-10 text-xs font-semibold text-[#073e3f] outline-none"
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
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="line-clamp-1 text-sm font-bold">{product.name}</h3>
                      <p className="mt-1 line-clamp-1 text-[11px] text-[#073e3f]/60">
                        {product.description}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
                      <Star className="h-3 w-3 fill-[#efc64b] text-[#efc64b]" />
                      {originalIndex % 3 === 0 ? "4.9" : "4.8"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-bold">
                      {formatMoney(product.price, product.currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => addToCart(product)}
                      disabled={mode === "edit"}
                      className="rounded-full bg-[#073e3f] px-3 py-1.5 text-[10px] font-semibold text-[#fbfbdc] transition hover:bg-[#0a5253] disabled:cursor-default disabled:opacity-70"
                    >
                      Add to Cart
                    </button>
                  </div>
                </article>
              );

              return <div key={product.id}>{card}</div>;
            })}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="mt-8 rounded-[1.5rem] bg-[#fbfbdc] p-8 text-center">
              <h2 className="text-lg font-bold">No essentials found</h2>
              <p className="mt-2 text-sm text-[#073e3f]/60">
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
  const { store, storefront } = useStorefront();
  const { theme, mode } = useStorefrontTheme();
  const products = (storefront.products ?? []).filter(
    (product) => mode === "edit" || (product.status ?? "active") === "active",
  );

  if (theme.id === "fashion_lookbook") {
    return <FashionProductsPage products={products} />;
  }

  if (theme.id === "minimalistic") {
    return <MinimalisticProductsPage products={products} />;
  }

  return (
    <PageContainer>
      <PageTitle title="Products" subtitle={`Shop the full catalog from ${store.business_name}.`} />
      <div className={`mt-10 grid gap-6 ${theme.productGridCols}`}>
        {products.map((product, index) => (
          <ProductCardThemed
            key={product.id}
            product={product}
            imagePath={`products.${index}.image_url`}
          />
        ))}
      </div>
    </PageContainer>
  );
}
