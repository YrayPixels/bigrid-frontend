"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BizgridLogo } from "@/components/bizgrid-logo";
import type { LandingMood } from "@/components/marketing/landing-preview-prompt";
import { cn } from "@/lib/utils";

type LandingNavProps = {
  mood?: LandingMood | null;
};

export function LandingNav({ mood = null }: LandingNavProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-3 px-4 py-3 transition-[background-color,border-color,backdrop-filter,box-shadow,background] duration-500 sm:px-6 sm:py-4",
        scrolled || mood
          ? "border-b border-border/30 shadow-soft backdrop-blur-xl"
          : "border-b border-transparent bg-transparent backdrop-blur-0",
      )}
      style={
        scrolled || mood
          ? {
              background: mood
                ? `linear-gradient(180deg, color-mix(in oklab, ${mood.base} 82%, transparent) 0%, color-mix(in oklab, ${mood.wash} 55%, transparent) 100%)`
                : "color-mix(in oklab, var(--canvas) 72%, transparent)",
            }
          : undefined
      }
    >
      <div className="flex min-w-0 items-center gap-6 sm:gap-8">
        <Link href="/" className="flex min-w-0 items-center">
          <BizgridLogo size={32} showWordmark wordmarkClassName="text-xl font-bold tracking-tight sm:text-2xl" />
        </Link>
        <div className="hidden gap-6 text-sm font-medium text-ink-soft md:flex">
          <a href="#platform" className="transition-colors hover:text-ink">
            Platform
          </a>
          <Link href="/industries" className="transition-colors hover:text-ink">
            Industries
          </Link>
          <Link href="/academy" className="transition-colors hover:text-ink">
            Academy
          </Link>
          <a href="#pricing" className="transition-colors hover:text-ink">
            Pricing
          </a>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <Link
          href="/login"
          className="px-2 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink sm:px-4"
        >
          Log in
        </Link>
        <a
          href="#try-preview"
          className="rounded-full bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground shadow-soft transition hover:opacity-90 sm:px-5"
        >
          <span className="sm:hidden">Generate</span>
          <span className="hidden sm:inline">Generate store</span>
        </a>
      </div>
    </nav>
  );
}
