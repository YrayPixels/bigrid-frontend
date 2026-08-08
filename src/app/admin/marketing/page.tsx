"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  FileText,
  Loader2,
  Megaphone,
  Share2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { merchantInvalidators, useMarketingStatus, useStoreMe } from "@/hooks/use-merchant-queries";
import { MarketingDashboard } from "@/components/marketing/marketing-dashboard";
import { Button } from "@/components/ui/button";

const QUICK_LINKS = [
  {
    href: "/admin/marketing/assistant",
    label: "Assistant",
    icon: Sparkles,
  },
  {
    href: "/admin/marketing/content",
    label: "Posts",
    icon: FileText,
  },
  {
    href: "/admin/marketing/ads",
    label: "Ads",
    icon: Megaphone,
  },
  {
    href: "/admin/marketing/channels",
    label: "Channels",
    icon: Share2,
  },
];

export default function AdminMarketingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const storeQuery = useStoreMe();
  const statusQuery = useMarketingStatus({ enabled: Boolean(storeQuery.data) });

  useEffect(() => {
    if (storeQuery.isFetched && !storeQuery.data) {
      router.replace("/admin/onboarding");
    }
  }, [router, storeQuery.data, storeQuery.isFetched]);

  // OAuth callbacks still land on this route, so keep handling their result.
  useEffect(() => {
    const facebook = searchParams.get("facebook");
    const tiktokCreator = searchParams.get("tiktok_creator");
    const message = searchParams.get("message");

    if (facebook === "connected" || tiktokCreator === "connected") {
      toast.success(facebook ? "Facebook Page connected." : "TikTok creator account connected.");
      void merchantInvalidators.marketing(queryClient);
      router.replace("/admin/marketing");
    } else if (facebook === "error" || tiktokCreator === "error") {
      toast.error(message ? decodeURIComponent(message) : "Connection failed.");
      router.replace("/admin/marketing");
    }
  }, [queryClient, router, searchParams]);

  const warnings = statusQuery.data?.connection_warnings ?? [];

  if (storeQuery.isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-5 px-4 py-4 lg:px-6 lg:py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h1 className="font-display text-2xl font-bold text-ink">Marketing</h1>
          </div>
          <p className="text-sm text-ink-soft">
            Performance, posts, and the tools to grow your store.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {QUICK_LINKS.map((link) => (
            <Button key={link.href} size="sm" variant="outline" className="h-9 rounded-full" asChild>
              <Link href={link.href}>
                <link.icon className="mr-1.5 h-3.5 w-3.5" />
                {link.label}
              </Link>
            </Button>
          ))}
          <Button size="sm" variant="ghost" className="h-9 rounded-full text-primary" asChild>
            <Link href="/admin/marketing/recovery">Abandoned carts</Link>
          </Button>
        </div>
      </div>

      {warnings.length > 0 ? (
        <div className="space-y-2">
          {warnings.map((warning) => (
            <div
              key={warning.connection_id}
              className="flex items-start gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-ink"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="space-y-1">
                <p>
                  <span className="font-medium">{warning.account_name ?? warning.provider}</span>{" "}
                  {warning.message}
                </p>
                <Button variant="link" size="sm" className="h-auto p-0 text-xs" asChild>
                  <Link href="/admin/marketing/channels">Reconnect now</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <MarketingDashboard />
    </div>
  );
}
