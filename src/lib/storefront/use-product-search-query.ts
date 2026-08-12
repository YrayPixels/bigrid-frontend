"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { normalizeProductSearchQuery } from "@/lib/storefront/product-search";

/** Product search seeded from `?q=`, synced back to the URL. */
export function useProductSearchQuery() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = useMemo(
    () => normalizeProductSearchQuery(searchParams.get("q")),
    [searchParams],
  );

  const setQuery = useCallback(
    (next: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      const normalized = normalizeProductSearchQuery(next);
      if (normalized) {
        params.set("q", normalized);
      } else {
        params.delete("q");
      }
      params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  return [query, setQuery] as const;
}
