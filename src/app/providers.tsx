"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useState, type ReactNode } from "react";
import { AuthProvider } from "@/lib/auth-context";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 60 * 1000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Suspense fallback={null}>{children}</Suspense>
      </AuthProvider>
    </QueryClientProvider>
  );
}
