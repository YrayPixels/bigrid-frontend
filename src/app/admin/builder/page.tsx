"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

function BuilderRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (!params.has("mode")) {
      params.set("mode", "create");
    }
    const qs = params.toString();
    router.replace(qs ? `/admin/website?${qs}` : "/admin/website?mode=create");
  }, [router, searchParams]);

  return (
    <div className="grid min-h-[50vh] place-items-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

/** Legacy /admin/builder route — redirects into the unified Website hub. */
export default function AdminBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[50vh] place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      }
    >
      <BuilderRedirectInner />
    </Suspense>
  );
}
