"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FileText, Loader2 } from "lucide-react";
import { useStoreMe } from "@/hooks/use-merchant-queries";
import { ContentPanel } from "@/components/marketing/content-panel";

export default function MarketingContentPage() {
  const router = useRouter();
  const storeQuery = useStoreMe();

  useEffect(() => {
    if (storeQuery.isFetched && !storeQuery.data) {
      router.replace("/admin/onboarding");
    }
  }, [router, storeQuery.data, storeQuery.isFetched]);

  if (storeQuery.isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6 lg:py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="font-display text-2xl font-bold text-ink">Posts</h1>
          </div>
          <p className="text-sm text-ink-soft">
            Review drafts, schedule what goes out, and see what you have already published.
          </p>
        </div>
        <Link
          href="/admin/marketing"
          className="inline-flex shrink-0 text-sm font-medium text-primary hover:underline"
        >
          Back to marketing
        </Link>
      </div>

      <ContentPanel />
    </div>
  );
}
