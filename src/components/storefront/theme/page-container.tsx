"use client";

import { cn } from "@/lib/utils";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";

export function PageContainer({
  children,
  className,
  narrow = false,
}: {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
}) {
  const { theme } = useStorefrontTheme();
  return (
    <div
      className={cn(
        theme.pagePadding,
        theme.pageText,
        narrow ? "max-w-3xl mx-auto" : theme.pageMaxWidth,
        className,
      )}
    >
      {children}
    </div>
  );
}
