"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { formatMoney } from "@/lib/storefront/format";
import {
  filterProductsBySearch,
  normalizeProductSearchQuery,
} from "@/lib/storefront/product-search";
import { useStorefront } from "@/lib/storefront/store-context";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { cn } from "@/lib/utils";

type TriggerVariant = "icon" | "pill" | "text" | "ghost";

export function StorefrontSearch({
  className,
  iconClassName,
  variant = "icon",
  label = "Search",
}: {
  className?: string;
  iconClassName?: string;
  variant?: TriggerVariant;
  label?: string;
}) {
  const { storefront, store } = useStorefront();
  const { theme, mode } = useStorefrontTheme();
  const router = useRouter();
  const dialogTitleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const catalog = useMemo(
    () =>
      (storefront.products ?? []).filter(
        (product) => product.status !== "archived" && product.status !== "draft",
      ),
    [storefront.products],
  );

  const results = useMemo(
    () => filterProductsBySearch(catalog, draft, 8),
    [catalog, draft],
  );

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (mode === "edit") return null;

  function openSearch() {
    setDraft("");
    setOpen(true);
  }

  function closeSearch() {
    setOpen(false);
    setDraft("");
  }

  function goToCatalog(query = draft) {
    const normalized = normalizeProductSearchQuery(query);
    closeSearch();
    router.push(normalized ? `/products?q=${encodeURIComponent(normalized)}` : "/products");
  }

  const radius =
    theme.buttonRadius === "rounded-none"
      ? "0px"
      : theme.buttonRadius === "rounded-full"
        ? "9999px"
        : "0.75rem";

  return (
    <>
      <button
        type="button"
        onClick={openSearch}
        aria-label={label}
        className={cn(
          variant === "pill" && "grid h-9 w-9 place-items-center rounded-full shadow-sm",
          variant === "icon" && "grid place-items-center",
          variant === "text" &&
            "inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em]",
          variant === "ghost" && "inline-flex items-center justify-center",
          className,
        )}
        style={
          variant === "pill"
            ? { backgroundColor: `${theme.palette.surface}bf`, color: theme.palette.text }
            : undefined
        }
      >
        <Search className={cn("h-4 w-4", iconClassName)} />
        {variant === "text" ? <span>{label}</span> : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80]">
          <button
            type="button"
            aria-label="Close search"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            onClick={closeSearch}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="absolute inset-x-0 top-0 mx-auto max-h-[min(100dvh,40rem)] w-full max-w-2xl overflow-hidden border-b shadow-2xl sm:top-10 sm:rounded-2xl sm:border"
            style={{
              backgroundColor: theme.palette.surface,
              color: theme.palette.text,
              borderColor: theme.palette.border,
              borderRadius: undefined,
            }}
          >
            <div
              className="flex items-center gap-3 border-b px-4 py-3 sm:px-5"
              style={{ borderColor: theme.palette.border }}
            >
              <Search className="h-4 w-4 shrink-0 opacity-60" />
              <label htmlFor={dialogTitleId} className="sr-only">
                Search products
              </label>
              <input
                id={dialogTitleId}
                ref={inputRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    goToCatalog();
                  }
                }}
                placeholder={`Search ${store.business_name}…`}
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:opacity-50 sm:text-sm"
                autoComplete="off"
                enterKeyHint="search"
              />
              <button
                type="button"
                onClick={closeSearch}
                className="grid h-8 w-8 place-items-center opacity-70 transition hover:opacity-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[min(70dvh,28rem)] overflow-y-auto px-2 py-2 sm:px-3">
              {!normalizeProductSearchQuery(draft) ? (
                <p className="px-3 py-8 text-center text-sm" style={{ color: theme.palette.muted }}>
                  Search by product name, category, or brand.
                </p>
              ) : results.length === 0 ? (
                <div className="px-3 py-8 text-center">
                  <p className="text-sm font-medium">No products match “{draft.trim()}”.</p>
                  <button
                    type="button"
                    onClick={() => goToCatalog("")}
                    className="mt-3 text-sm font-semibold underline-offset-4 hover:underline"
                    style={{ color: theme.palette.primary }}
                  >
                    Browse all products
                  </button>
                </div>
              ) : (
                <ul className="grid gap-1">
                  {results.map((product) => (
                    <li key={product.id}>
                      <Link
                        href={`/products/${product.slug}`}
                        onClick={closeSearch}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:opacity-95"
                        style={{ backgroundColor: `${theme.palette.background}cc` }}
                      >
                        <span
                          className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg"
                          style={{ backgroundColor: theme.palette.surface }}
                        >
                          {product.image_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={product.image_url}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Search className="h-4 w-4 opacity-40" />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{product.name}</span>
                          <span
                            className="mt-0.5 block truncate text-xs"
                            style={{ color: theme.palette.muted }}
                          >
                            {[product.category, formatMoney(product.effective_price ?? product.price, product.currency)]
                              .filter(Boolean)
                              .join(" · ")}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {normalizeProductSearchQuery(draft) ? (
              <div
                className="border-t px-4 py-3 sm:px-5"
                style={{ borderColor: theme.palette.border }}
              >
                <button
                  type="button"
                  onClick={() => goToCatalog()}
                  className="w-full px-4 py-2.5 text-sm font-semibold transition hover:opacity-90"
                  style={{
                    backgroundColor: theme.palette.primary,
                    color: theme.palette.background,
                    borderRadius: radius,
                  }}
                >
                  View all results for “{draft.trim()}”
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
