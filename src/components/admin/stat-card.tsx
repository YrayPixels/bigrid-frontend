"use client";

import { CircleHelp } from "lucide-react";
import type { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function AdminStatCard({
  value,
  compactValue,
  label,
  tooltip,
  backgroundClassName,
  icon,
}: {
  value: string;
  /** Shown instead of `value` on small screens (e.g. ₦1.7M). */
  compactValue?: string;
  label: string;
  tooltip: string;
  backgroundClassName: string;
  icon: ReactNode;
}) {
  return (
    <div
      className={`relative flex flex-col gap-3 rounded-2xl px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-5 ${backgroundClassName}`}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="absolute right-2 top-2 text-ink-soft/50 transition hover:text-ink-soft sm:right-3 sm:top-3"
            aria-label={`About ${label}`}
          >
            <CircleHelp className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-56 bg-[#3f3f46] text-white">
          {tooltip}
          {compactValue ? (
            <span className="mt-1 block text-white/80 sm:hidden">{value}</span>
          ) : null}
        </TooltipContent>
      </Tooltip>
      <div className="flex min-w-0 items-start justify-between gap-2 pr-5 sm:block sm:pr-6">
        <div className="min-w-0">
          <p className="font-display text-base font-bold leading-tight tracking-tight sm:text-2xl">
            {compactValue ? (
              <>
                <span className="whitespace-nowrap sm:hidden">{compactValue}</span>
                <span className="hidden sm:inline">{value}</span>
              </>
            ) : (
              <span className="break-words">{value}</span>
            )}
          </p>
          <p className="mt-1 text-[11px] font-medium leading-snug text-ink-soft sm:text-sm">{label}</p>
        </div>
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white shadow-sm sm:hidden">
          {icon}
        </div>
      </div>
      <div className="hidden h-12 w-12 shrink-0 place-items-center rounded-xl bg-white shadow-sm sm:grid">
        {icon}
      </div>
    </div>
  );
}
