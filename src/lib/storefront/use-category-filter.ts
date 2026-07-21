"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { StoreCategory } from "@/lib/api/types";
import { resolveCategoryIdFromQuery } from "@/lib/storefront/category-filters";

/** Category filter seeded from `?category_id=` or `?category=` (id or slug), synced back to the URL. */
export function useCategoryFilter(categories: StoreCategory[]) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const raw = searchParams.get("category_id") ?? searchParams.get("category");

  const fromUrl = useMemo(
    () => resolveCategoryIdFromQuery(raw, categories),
    [categories, raw],
  );

  const [selectedCategoryId, setSelectedCategoryIdState] = useState<string | null>(fromUrl);

  useEffect(() => {
    setSelectedCategoryIdState(fromUrl);
  }, [fromUrl]);

  const setSelectedCategoryId = useCallback(
    (next: string | null) => {
      setSelectedCategoryIdState(next);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("category");
      if (next) {
        params.set("category_id", next);
      } else {
        params.delete("category_id");
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router, searchParams],
  );

  return [selectedCategoryId, setSelectedCategoryId] as const;
}
