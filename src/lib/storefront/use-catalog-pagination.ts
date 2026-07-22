"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const DEFAULT_PAGE_SIZE = 12;

export type CatalogPaginationResult<T> = {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  pageStart: number;
  pageEnd: number;
  pageItems: T[];
  setPage: (page: number) => void;
  showingLabel: string;
};

function clampPage(page: number, totalPages: number) {
  return Math.min(Math.max(page, 1), Math.max(totalPages, 1));
}

/** Client-side catalog paging with optional `?page=` URL sync. */
export function useCatalogPagination<T>(
  items: T[],
  pageSize: number = DEFAULT_PAGE_SIZE,
  resetKey?: string | number | null,
): CatalogPaginationResult<T> {
  const searchParams = useSearchParams();
  const router = useRouter();
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const previousResetKey = useRef(resetKey);

  const pageFromUrl = useMemo(() => {
    const raw = Number(searchParams.get("page") ?? "1");
    if (!Number.isFinite(raw) || raw < 1) return 1;
    return Math.floor(raw);
  }, [searchParams]);

  const [page, setPageState] = useState(() => clampPage(pageFromUrl, totalPages));

  useEffect(() => {
    setPageState(clampPage(pageFromUrl, totalPages));
  }, [pageFromUrl, totalPages]);

  useEffect(() => {
    setPageState((current) => clampPage(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (previousResetKey.current === resetKey) return;
    previousResetKey.current = resetKey;
    setPageState(1);
    if (searchParams.get("page")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    }
  }, [resetKey, router, searchParams]);

  const setPage = useCallback(
    (next: number) => {
      const clamped = clampPage(next, totalPages);
      setPageState(clamped);
      const params = new URLSearchParams(searchParams.toString());
      if (clamped <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(clamped));
      }
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
    },
    [router, searchParams, totalPages],
  );

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const pageStart = totalItems ? (page - 1) * pageSize + 1 : 0;
  const pageEnd = Math.min(page * pageSize, totalItems);

  return {
    page,
    pageSize,
    totalPages,
    totalItems,
    pageStart,
    pageEnd,
    pageItems,
    setPage,
    showingLabel: totalItems
      ? `Showing ${pageStart}-${pageEnd} of ${totalItems} results`
      : "Showing 0 results",
  };
}

export function catalogPageButtons(currentPage: number, totalPages: number, windowSize = 5): number[] {
  if (totalPages <= windowSize) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const half = Math.floor(windowSize / 2);
  let start = Math.max(1, currentPage - half);
  const end = Math.min(totalPages, start + windowSize - 1);
  start = Math.max(1, end - windowSize + 1);

  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}
