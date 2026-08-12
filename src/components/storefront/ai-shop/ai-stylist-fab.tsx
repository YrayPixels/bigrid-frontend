"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { AiStylistPanel } from "@/components/storefront/ai-shop/ai-stylist";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

function shouldHideFab(pathname: string): boolean {
  return /\/checkout(\/|$)/.test(pathname);
}

export function AiStylistFab() {
  const { theme } = useStorefrontTheme();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  if (shouldHideFab(pathname)) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed z-50 flex items-center gap-2 shadow-lg transition hover:scale-[1.02] active:scale-[0.98]",
          isMobile
            ? "bottom-5 right-4 h-14 w-14 justify-center rounded-full"
            : "bottom-6 right-6 rounded-full px-4 py-3.5",
        )}
        style={{
          backgroundColor: theme.palette.primary,
          color: theme.palette.background,
        }}
        aria-label="Open personal shopper"
      >
        <Sparkles className="h-5 w-5" />
        {!isMobile ? (
          <span className="text-xs font-bold uppercase tracking-[0.12em]">Shop</span>
        ) : null}
      </button>

      {isMobile ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="flex h-[min(92dvh,720px)] flex-col gap-0 rounded-t-2xl p-0"
            style={{ backgroundColor: theme.palette.background }}
          >
            <AiStylistPanel onClose={() => setOpen(false)} className="h-full" />
          </SheetContent>
        </Sheet>
      ) : (
        open ? (
          <div
            className="fixed bottom-24 right-6 z-50 flex h-[min(640px,calc(100dvh-7rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border shadow-2xl"
            style={{
              borderColor: theme.palette.border,
              backgroundColor: theme.palette.background,
            }}
            role="dialog"
            aria-label="Personal shopper"
          >
            <AiStylistPanel onClose={() => setOpen(false)} className="h-full" />
          </div>
        ) : null
      )}

      {open && !isMobile ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/20"
          aria-label="Close personal shopper"
          onClick={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
