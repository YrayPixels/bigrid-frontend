"use client";

import Link from "next/link";
import type { StoreProduct } from "@/lib/api/types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { formatMoney } from "@/lib/storefront/format";
import { productUnitPrice } from "@/lib/storefront/pricing";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { relatedProductsFor } from "@/lib/storefront/related-products";
import { cn } from "@/lib/utils";

export function RelatedProductsSection({
  product,
  appearance = "soft",
}: {
  product: StoreProduct;
  appearance?: "fashion" | "soft" | "minimal";
}) {
  const { storefront, categories, discounts } = useStorefront();
  const { theme, mode } = useStorefrontTheme();

  if (mode === "edit") return null;

  const related = relatedProductsFor(
    product,
    storefront.products ?? [],
    categories ?? [],
    8,
  );

  if (!related.length) return null;

  const isFashion = appearance === "fashion";
  const isMinimal = appearance === "minimal";

  return (
    <section
      className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16"
      style={{ color: theme.palette.text }}
    >
      <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-[0.18em]"
            style={{ color: theme.palette.muted }}
          >
            You may also like
          </p>
          <h2
            className={
              isFashion
                ? "mt-2 text-2xl font-bold tracking-tight"
                : isMinimal
                  ? "mt-2 text-2xl font-semibold tracking-[-0.03em]"
                  : "mt-2 font-display text-3xl font-semibold tracking-tight"
            }
          >
            Related products
          </h2>
        </div>
        <Link
          href="/products"
          className="shrink-0 text-xs font-semibold underline underline-offset-4"
          style={{ color: theme.palette.primary }}
        >
          View all
        </Link>
      </div>

      <Carousel
        opts={{
          align: "start",
          dragFree: true,
        }}
        className="relative"
      >
        <CarouselContent className="-ml-3 sm:-ml-4">
          {related.map((item) => {
            const priced = productUnitPrice(item, discounts ?? []);
            return (
              <CarouselItem
                key={item.id}
                className="basis-[42%] pl-3 sm:basis-[30%] sm:pl-4 md:basis-[23%] lg:basis-[20%]"
              >
                <Link href={`/products/${item.slug}`} className="group block">
                  <div
                    className={cn(
                      "overflow-hidden",
                      isMinimal
                        ? "aspect-square rounded-xl"
                        : isFashion
                          ? "aspect-square"
                          : "aspect-square rounded-2xl",
                    )}
                    style={{ backgroundColor: theme.palette.surface }}
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="grid h-full place-items-center text-2xl font-bold text-white"
                        style={{
                          background: `linear-gradient(135deg, ${theme.palette.primary}, ${theme.palette.primary}88)`,
                        }}
                      >
                        {item.name.slice(0, 1)}
                      </div>
                    )}
                  </div>
                  <p
                    className="mt-2.5 line-clamp-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                    style={{ color: theme.palette.muted }}
                  >
                    {item.category ?? "Shop"}
                  </p>
                  <h3 className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-snug tracking-[-0.01em]">
                    {item.name}
                  </h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[13px] font-semibold">
                    <span>{formatMoney(priced.unitPrice, item.currency)}</span>
                    {priced.compareAtPrice != null ? (
                      <span
                        className="text-[11px] font-medium line-through"
                        style={{ color: theme.palette.muted }}
                      >
                        {formatMoney(priced.compareAtPrice, item.currency)}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        <CarouselPrevious
          className="left-0 top-[38%] hidden h-9 w-9 border-0 bg-white/90 shadow-md backdrop-blur-sm sm:inline-flex"
          style={{ color: theme.palette.text }}
        />
        <CarouselNext
          className="right-0 top-[38%] hidden h-9 w-9 border-0 bg-white/90 shadow-md backdrop-blur-sm sm:inline-flex"
          style={{ color: theme.palette.text }}
        />
      </Carousel>
    </section>
  );
}
