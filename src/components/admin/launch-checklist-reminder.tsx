"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMerchantDashboard, useStoreMe } from "@/hooks/use-merchant-queries";
import { getStorefrontUrl } from "@/lib/store-host";
import {
  dismissLaunchChecklist,
  getLaunchChecklistProgress,
  isLaunchChecklistSnoozed,
  shouldShowLaunchChecklist,
} from "@/lib/launch-checklist";
import { cn } from "@/lib/utils";

type LaunchChecklistDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDismiss: () => void;
};

export function LaunchChecklistDialog({ open, onOpenChange, onDismiss }: LaunchChecklistDialogProps) {
  const router = useRouter();
  const storeQuery = useStoreMe();
  const dashboardQuery = useMerchantDashboard({ enabled: !!storeQuery.data });
  const store = storeQuery.data;

  const progress = useMemo(
    () =>
      getLaunchChecklistProgress({
        store,
        metrics: dashboardQuery.data?.metrics,
      }),
    [store, dashboardQuery.data?.metrics],
  );

  const previewHref = store
    ? store.is_published
      ? getStorefrontUrl(store.slug)
      : "/admin/website"
    : "/admin/website";

  function handleStepClick(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  function handleDone() {
    onDismiss();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="space-y-3 border-b border-border px-6 py-5 text-left">
          <DialogTitle className="font-display text-xl font-bold leading-snug">
            Complete the next steps to launch your website
          </DialogTitle>
          <DialogDescription className="text-sm text-ink-soft">
            Finish these setup tasks when you are ready. You can skip for now and we will remind you
            again later.
          </DialogDescription>
          <Link
            href={previewHref}
            target={store?.is_published ? "_blank" : undefined}
            className="inline-flex w-fit items-center gap-1 text-sm font-medium text-primary hover:underline"
            onClick={() => onOpenChange(false)}
          >
            {store?.is_published ? "Preview live website" : "Preview your website"}
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </DialogHeader>

        <div className="max-h-[min(60vh,520px)] space-y-3 overflow-y-auto px-6 py-5">
          {progress.steps.map((step) => {
            const Icon = step.icon;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => handleStepClick(step.href)}
                className={cn(
                  "flex w-full items-start gap-4 rounded-2xl border px-4 py-4 text-left transition hover:border-primary/40",
                  step.completed
                    ? "border-primary/20 bg-primary/5"
                    : "border-border bg-background hover:bg-secondary/40",
                )}
              >
                <div
                  className={cn(
                    "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                    step.completed ? "bg-primary/10 text-primary" : "bg-secondary text-ink-soft",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink">{step.title}</p>
                    {step.completed ? (
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                        <Check className="mr-1 h-3 w-3" />
                        Completed
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-ink-soft">{step.description}</p>
                </div>
                <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-ink-soft" />
              </button>
            );
          })}
        </div>

        <DialogFooter className="border-t border-border px-6 py-4 sm:justify-between">
          <p className="text-sm text-ink-soft">
            {progress.completedCount} of {progress.totalCount} completed
          </p>
          <Button type="button" variant="secondary" className="min-w-28" onClick={handleDone}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function LaunchChecklistReminder() {
  const storeQuery = useStoreMe();
  const dashboardQuery = useMerchantDashboard({ enabled: !!storeQuery.data });
  const store = storeQuery.data;
  const [open, setOpen] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);

  const progress = useMemo(
    () =>
      getLaunchChecklistProgress({
        store,
        metrics: dashboardQuery.data?.metrics,
      }),
    [store, dashboardQuery.data?.metrics],
  );

  const evaluateReminder = useCallback(() => {
    if (!store?.id || progress.isComplete) {
      setOpen(false);
      setBannerVisible(false);
      return;
    }

    const context = { store, metrics: dashboardQuery.data?.metrics };
    const shouldOpen = shouldShowLaunchChecklist(store.id, context);
    const snoozed = isLaunchChecklistSnoozed(store.id, context);

    setOpen(shouldOpen);
    setBannerVisible(false);
    if (!shouldOpen && !snoozed) {
      setBannerVisible(true);
    }
  }, [store, dashboardQuery.data?.metrics, progress.isComplete]);

  useEffect(() => {
    evaluateReminder();
  }, [evaluateReminder]);

  const handleDismiss = useCallback(() => {
    if (!store?.id) return;
    dismissLaunchChecklist(store.id);
    setBannerVisible(false);
    setOpen(false);
  }, [store?.id]);

  if (!store || progress.isComplete) return null;

  const remaining = progress.incompleteSteps.length;

  return (
    <>
      {bannerVisible && remaining > 0 ? (
        <div className="border-b border-border bg-primary/5 px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink">
              <span className="font-medium">{remaining} setup step{remaining === 1 ? "" : "s"}</span>{" "}
              left before your store is ready to launch.
            </p>
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(true)}>
              View checklist
            </Button>
          </div>
        </div>
      ) : null}

      <LaunchChecklistDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next && store?.id) {
            const context = { store, metrics: dashboardQuery.data?.metrics };
            setBannerVisible(!isLaunchChecklistSnoozed(store.id, context));
          }
        }}
        onDismiss={handleDismiss}
      />
    </>
  );
}
