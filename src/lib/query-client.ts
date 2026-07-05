import { QueryClient } from "@tanstack/react-query";

export const QUERY_DEFAULTS = {
  gcTime: 10 * 60 * 1000,
  refetchOnWindowFocus: false,
  retry: 1,
  staleTime: 60 * 1000,
} as const;

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: QUERY_DEFAULTS,
    },
  });
}
