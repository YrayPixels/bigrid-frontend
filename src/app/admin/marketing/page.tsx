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
    label: "Campaign assistant",
    description: "Draft posts and ads with AI",
    icon: Sparkles,
  },
  {
    href: "/admin/marketing/content",
    label: "Posts",
    description: "Review, schedule and publish",
    icon: FileText,
  },
  {
    href: "/admin/marketing/ads",
    label: "Paid ads",
    description: "Reach beyond your followers",
    icon: Megaphone,
  },
  {
    href: "/admin/marketing/channels",
    label: "Channels",
    description: "Connect your accounts",
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
            How your marketing is performing, and everything you need to keep it moving.
          </p>
        </div>
        <Link
          href="/admin/marketing/recovery"
          className="inline-flex shrink-0 text-sm font-medium text-primary hover:underline"
        >
          Recover abandoned carts &amp; checkouts
        </Link>
      </div>

      {warnings.length > 0 ? (
        <div className="space-y-2">
          {warnings.map((warning) => (
            <div
              key={warning.connection_id}
              className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-ink"
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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group rounded-xl border border-border bg-canvas-raised p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            <link.icon className="h-4 w-4 text-primary" />
            <div className="mt-2 text-sm font-medium text-ink">{link.label}</div>
            <div className="text-xs text-ink-soft">{link.description}</div>
          </Link>
        ))}
      </div>

      <MarketingDashboard />
    </div>
  );
}
