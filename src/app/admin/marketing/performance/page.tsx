"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Performance moved onto the marketing landing page when that became the KPI
 * dashboard. Kept as a redirect so existing links and bookmarks still work.
 */
export default function MarketingPerformanceRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/marketing");
  }, [router]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}
