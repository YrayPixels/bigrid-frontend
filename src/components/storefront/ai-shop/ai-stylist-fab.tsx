"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { AiStylistPanel } from "@/components/storefront/ai-shop/ai-stylist";
import { useStorefrontTheme } from "@/lib/storefront/theme-context";
import { useStorefront } from "@/lib/storefront/store-context";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

function shouldHideFab(pathname: string): boolean {
  return /\/checkout(\/|$)/.test(pathname);
}

function resolveMode(industry?: string | null): "fashion" | "electronics" | "beauty" | "general" {
  const haystack = (industry ?? "").toLowerCase();
  if (haystack.includes("fashion") || haystack.includes("apparel") || haystack.includes("clothing")) {
    return "fashion";
  }
  if (haystack.includes("electronic") || haystack.includes("gadget")) {
    return "electronics";
  }
  if (haystack.includes("beauty") || haystack.includes("skincare") || haystack.includes("cosmetic")) {
    return "beauty";
  }
  return "general";
}

function fabPrompts(mode: ReturnType<typeof resolveMode>, storeName: string): string[] {
  if (mode === "fashion") {
    return [
      "Need an outfit?",
      "I can put a full look together for you.",
      `Your personal stylist at ${storeName}.`,
      "Tell me the occasion — I’ll style it.",
    ];
  }

  if (mode === "electronics") {
    return [
      "Looking for something specific?",
      "I can help you find the right pick.",
      `Your personal shopping assistant at ${storeName}.`,
      "Laptop, headphones, camera — just ask.",
    ];
  }

  if (mode === "beauty") {
    return [
      "Looking for a product?",
      "I can help you choose what fits.",
      `Your beauty advisor at ${storeName}.`,
      "Tell me what you need — I’ll find it.",
    ];
  }

  return [
    "What are you shopping for?",
    "I can help you find anything in this store.",
    `Your personal shopping assistant at ${storeName}.`,
    "Tell me what you need — I’ll find it.",
  ];
}

export function AiStylistFab() {
  const { theme } = useStorefrontTheme();
  const { store } = useStorefront();
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [promptVisible, setPromptVisible] = useState(false);
  const [promptsPaused, setPromptsPaused] = useState(false);

  const storeName = store.business_name || "this store";
  const mode = resolveMode(store.industry);
  const prompts = useMemo(() => fabPrompts(mode, storeName), [mode, storeName]);

  useEffect(() => {
    if (open || promptsPaused || shouldHideFab(pathname)) {
      setPromptVisible(false);
      return;
    }

    let cancelled = false;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let cycleTimer: ReturnType<typeof setTimeout> | undefined;

    const showNext = () => {
      if (cancelled) return;
      setPromptVisible(true);
      hideTimer = setTimeout(() => {
        if (cancelled) return;
        setPromptVisible(false);
        cycleTimer = setTimeout(() => {
          if (cancelled) return;
          setPromptIndex((current) => (current + 1) % prompts.length);
          showNext();
        }, 650);
      }, 4200);
    };

    const startTimer = setTimeout(showNext, 1200);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      if (hideTimer) clearTimeout(hideTimer);
      if (cycleTimer) clearTimeout(cycleTimer);
    };
  }, [open, promptsPaused, pathname, prompts.length]);

  useEffect(() => {
    if (open || !promptsPaused) return;
    const resume = setTimeout(() => setPromptsPaused(false), 18000);
    return () => clearTimeout(resume);
  }, [open, promptsPaused]);

  if (shouldHideFab(pathname)) {
    return null;
  }

  const activePrompt = prompts[promptIndex] ?? prompts[0];

  function openShopper() {
    setOpen(true);
    setPromptVisible(false);
    setPromptsPaused(true);
  }

  return (
    <>
      <div
        className={cn(
          "fixed z-50 flex flex-col items-end gap-2",
          isMobile ? "bottom-5 right-4" : "bottom-6 right-6",
        )}
      >
        <button
          type="button"
          onClick={openShopper}
          className={cn(
            "max-w-[280px] origin-bottom-right text-left transition-all duration-500 ease-out sm:max-w-[320px]",
            promptVisible && !open
              ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
              : "pointer-events-none translate-y-2 scale-95 opacity-0",
          )}
          aria-hidden={!promptVisible || open}
          tabIndex={promptVisible && !open ? 0 : -1}
        >
          <div
            className="relative rounded-[1.35rem] rounded-br-md border px-4 py-3.5 shadow-xl sm:px-5 sm:py-4"
            style={{
              backgroundColor: theme.palette.surface,
              borderColor: theme.palette.border,
              color: theme.palette.foreground,
            }}
          >
            <p className="text-[15px] font-semibold leading-snug tracking-tight sm:text-[16px]">
              {activePrompt}
            </p>
            <span
              className="absolute -bottom-2 right-5 h-3.5 w-3.5 rotate-45 border-b border-r"
              style={{
                backgroundColor: theme.palette.surface,
                borderColor: theme.palette.border,
              }}
              aria-hidden
            />
          </div>
        </button>

        <button
          type="button"
          onClick={openShopper}
          className={cn(
            "shopper-fab relative flex items-center gap-2.5 shadow-xl transition hover:scale-[1.03] active:scale-[0.98]",
            isMobile ? "h-16 w-16 justify-center rounded-full" : "rounded-full px-5 py-4",
            !open && !promptsPaused ? "shopper-fab--alive" : "",
          )}
          style={{
            backgroundColor: theme.palette.primary,
            color: theme.palette.background,
          }}
          aria-label="Open personal shopper"
        >
          <span className="shopper-fab__ring pointer-events-none absolute inset-0 rounded-full" aria-hidden />
          <Sparkles className="relative h-6 w-6" />
          {!isMobile ? (
            <span className="relative text-[13px] font-bold uppercase tracking-[0.14em]">Shop</span>
          ) : null}
        </button>
      </div>

      <style jsx global>{`
        @keyframes shopper-fab-pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.07);
          }
        }
        @keyframes shopper-fab-ring {
          0% {
            box-shadow: 0 0 0 0 color-mix(in srgb, var(--store-brand, currentColor) 55%, transparent);
            opacity: 0.85;
          }
          70% {
            box-shadow: 0 0 0 22px transparent;
            opacity: 0;
          }
          100% {
            box-shadow: 0 0 0 0 transparent;
            opacity: 0;
          }
        }
        .shopper-fab--alive {
          animation: shopper-fab-pulse 2.8s ease-in-out infinite;
        }
        .shopper-fab--alive .shopper-fab__ring {
          animation: shopper-fab-ring 2.8s ease-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .shopper-fab--alive,
          .shopper-fab--alive .shopper-fab__ring {
            animation: none !important;
          }
        }
      `}</style>

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
      ) : open ? (
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
      ) : null}

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
