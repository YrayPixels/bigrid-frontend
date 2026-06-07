"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api/client";

export default function AdminSettingsPage() {
  const storeQuery = useQuery({
    queryKey: ["store", "me"],
    queryFn: () => api.getMyStore(),
  });

  if (storeQuery.isLoading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const store = storeQuery.data;

  return (
    <div className="w-full px-6 py-10">
      <header>
        <span className="text-xs font-medium uppercase tracking-wide text-ink-soft">
          Configuration
        </span>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Store settings</h1>
        <p className="mt-2 w-full text-sm text-ink-soft">
          Branding, domain, and AI regeneration controls will be editable here.
        </p>
      </header>

      {store ? (
        <div className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-ink-soft">
              Business name
            </div>
            <div className="mt-1 font-medium">{store.business_name}</div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-ink-soft">Slug</div>
            <div className="mt-1 font-medium">storehaus.app/{store.slug}</div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-ink-soft">
              Brand color
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span
                className="h-6 w-6 rounded-full border border-border"
                style={{ backgroundColor: store.brand_color }}
              />
              <span className="font-mono text-sm">{store.brand_color}</span>
            </div>
          </div>
          <p className="text-sm text-ink-soft">
            Full settings editing is coming soon. Use the overview page to regenerate your
            storefront with AI.
          </p>
        </div>
      ) : null}
    </div>
  );
}
