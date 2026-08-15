"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  trackPlatformEvent,
  type PlatformEventSource,
} from "@/lib/analytics/platform-events";
import { cn } from "@/lib/utils";

export const KEEP_STORE_SIGNUP_HREF = "/signup?from=preview";

type KeepStoreCtaProps = {
  source: PlatformEventSource;
  shopName?: string | null;
  variant: "sticky" | "inline" | "compact" | "header";
  className?: string;
};

function trackKeepStore(source: PlatformEventSource) {
  trackPlatformEvent("claim_store_clicked", { source });
}

export function KeepStoreCta({ source, shopName, variant, className }: KeepStoreCtaProps) {
  const name = shopName?.trim() || null;

  if (variant === "sticky") {
    return (
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 border-t border-border bg-canvas/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_oklch(0.2_0.03_200/0.1)] backdrop-blur-md lg:hidden",
          className,
        )}
      >
        <div className="mx-auto flex max-w-lg flex-col gap-2">
          <p className="text-center text-xs text-ink-soft">
            {name ? (
              <>
                Don&apos;t lose{" "}
                <span className="font-semibold text-ink">{name}</span> — save this preview
              </>
            ) : (
              "Don't lose this preview — save it with a free account"
            )}
          </p>
          <Link
            href={KEEP_STORE_SIGNUP_HREF}
            onClick={() => trackKeepStore(source)}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90"
          >
            Keep this store
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div className={cn("border-t border-border bg-primary/5 px-4 py-3 sm:px-5", className)}>
        <p className="text-xs text-ink-soft">
          {name ? (
            <>
              Don&apos;t lose{" "}
              <span className="font-semibold text-ink">{name}</span> — save it with a free account.
            </>
          ) : (
            "Don't lose this preview — save it with a free account."
          )}
        </p>
        <Link
          href={KEEP_STORE_SIGNUP_HREF}
          onClick={() => trackKeepStore(source)}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Keep this store
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <Link
        href={KEEP_STORE_SIGNUP_HREF}
        onClick={() => trackKeepStore(source)}
        className={cn(
          "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90",
          className,
        )}
      >
        Keep this store
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    );
  }

  return (
    <Link
      href={KEEP_STORE_SIGNUP_HREF}
      onClick={() => trackKeepStore(source)}
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90 sm:px-5",
        className,
      )}
    >
      <span className="sm:hidden">Keep store</span>
      <span className="hidden sm:inline">Keep this store</span>
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

export function WaitingStoreReminder({
  shopName,
  onOpen,
  onStartNew,
}: {
  shopName: string;
  onOpen: () => void;
  onStartNew: () => void;
}) {
  return (
    <div className="mt-6 w-full max-w-2xl rounded-2xl border border-primary/35 bg-card/90 p-4 text-left shadow-elevated backdrop-blur-sm sm:mt-8 sm:p-5">
      <p className="font-mono text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">
        Welcome back
      </p>
      <p className="font-display mt-1 text-lg font-semibold tracking-tight sm:text-xl">
        {shopName} is still waiting
      </p>
      <p className="mt-1 text-sm text-ink-soft">
        We saved your preview on this device. Keep it so you don&apos;t lose it.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <KeepStoreCta
          variant="header"
          source="landing"
          shopName={shopName}
          className="h-11 justify-center sm:flex-1"
        />
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-11 items-center justify-center rounded-full border border-border bg-canvas-raised px-4 text-sm font-semibold text-ink transition hover:border-primary/40 sm:flex-1"
        >
          Open preview
        </button>
      </div>
      <button
        type="button"
        onClick={onStartNew}
        className="mt-3 text-xs font-medium text-ink-soft transition hover:text-ink"
      >
        Start a new store instead
      </button>
    </div>
  );
}
