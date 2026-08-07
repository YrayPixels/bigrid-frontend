"use client";

import { Share2 } from "lucide-react";
import { ChannelsPanel } from "@/components/marketing/channels-panel";
import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";

export default function MarketingChannelsPage() {
  return (
    <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6 lg:py-5">
      <MarketingPageHeader
        icon={Share2}
        title="Channels"
        description="Connect the accounts you publish to and let AI reply to customer messages."
      />
      <ChannelsPanel />
    </div>
  );
}
