"use client";

import { Sparkles } from "lucide-react";
import { AssistantPanel } from "@/components/marketing/assistant-panel";
import { MarketingPageHeader } from "@/components/marketing/marketing-page-header";

export default function MarketingAssistantPage() {
  return (
    <div className="flex w-full flex-col gap-4 px-4 py-4 lg:px-6 lg:py-5">
      <MarketingPageHeader
        icon={Sparkles}
        title="Campaign assistant"
        description="Draft posts, content plans and ad campaigns with AI. Everything lands in Posts for review."
      />
      <AssistantPanel />
    </div>
  );
}
