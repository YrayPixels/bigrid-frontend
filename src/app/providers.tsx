"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useState, type ReactNode } from "react";
import { PlatformVisitTracker } from "@/components/platform-visit-tracker";
import { AuthProvider } from "@/lib/auth-context";
import { createQueryClient } from "@/lib/query-client";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Suspense fallback={null}>
          <PlatformVisitTracker />
        </Suspense>
        <Suspense fallback={null}>{children}</Suspense>
      </AuthProvider>
    </QueryClientProvider>
  );
}
