"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { catalogPageButtons } from "@/lib/storefront/use-catalog-pagination";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { cn } from "@/lib/utils";

export function StorefrontCatalogPagination({
  page,
  totalPages,
  onPageChange,
  className,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  const { theme } = useStorefrontTheme();

  if (totalPages <= 1) return null;

  const buttons = catalogPageButtons(page, totalPages);

  return (
    <nav
      className={cn("mt-10 flex items-center justify-center gap-1.5 sm:justify-end", className)}
      aria-label="Product pages"
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="grid h-9 w-9 place-items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          borderColor: theme.palette.border,
          backgroundColor: theme.palette.background,
          color: theme.palette.text,
        }}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {buttons.map((pageNumber) => {
        const active = pageNumber === page;
        return (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onPageChange(pageNumber)}
            className="grid h-9 w-9 place-items-center rounded-full text-xs font-semibold transition"
            style={{
              backgroundColor: active ? theme.palette.primary : theme.palette.background,
              color: active ? theme.palette.background : theme.palette.text,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: active ? theme.palette.primary : theme.palette.border,
            }}
            aria-label={`Page ${pageNumber}`}
            aria-current={active ? "page" : undefined}
          >
            {pageNumber}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="grid h-9 w-9 place-items-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          borderColor: theme.palette.border,
          backgroundColor: theme.palette.background,
          color: theme.palette.text,
        }}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
