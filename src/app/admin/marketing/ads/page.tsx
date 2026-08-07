"use client";

import { Megaphone, Loader2 } from "lucide-react";
import { useMarketingStatus, useStoreMe } from "@/hooks/use-merchant-queries";
import { AdCampaignsPanel } from "@/components/marketing/ad-campaigns-panel";
import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";

export default function MarketingAdsPage() {
  const storeQuery = useStoreMe();
  const statusQuery = useMarketingStatus({ enabled: Boolean(storeQuery.data) });

  return (
    <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6 lg:py-5">
      <MarketingPageHeader
        icon={Megaphone}
        title="Paid ads"
        description="Run Facebook and Instagram ads from your own Meta ad account. Nothing spends until you start it."
      />
      {statusQuery.isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : statusQuery.data ? (
        <AdCampaignsPanel status={statusQuery.data} />
      ) : null}
    </div>
  );
}
